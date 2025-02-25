package server

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/gofiber/websocket/v2"
	"github.com/pion/webrtc/v4"
	"go.uber.org/zap"
	"golang.org/x/net/context"
)

func (s *Server) HandleEditorWS(c *websocket.Conn) {
	defer c.Close()

	ctx := context.WithValue(context.Background(), "requestID", c.Params("requestId"))
	logger := s.getLogger(ctx)

	roomID := c.Params("roomId")
	token := c.Query("token")

	validRoom, err := s.validateRoom(roomID, token)
	if err != nil {
		logger.Error("Room validation failed", zap.Error(err))
		return
	}

	if !validRoom.IsActive {
		logger.Error("Room is not active")
		return
	}

	client := &EditorClient{
		conn: c,
	}

	s.roomsMutex.Lock()
	localRoom, exists := s.rooms[roomID]
	if !exists {
		localRoom = newRoom()
		s.rooms[roomID] = localRoom
	}
	s.roomsMutex.Unlock()

	localRoom.clientsMutex.Lock()
	localRoom.editorClients[c] = client
	localRoom.clientsMutex.Unlock()

	logger.Info("Editor client connected", zap.String("roomID", roomID))

	// Send current code state to new client
	if localRoom.currentCode != "" {
		syncMessage := EditorMessage{
			Type:     "sync",
			Code:     localRoom.currentCode,
			Language: localRoom.language,
		}
		if err := c.WriteJSON(syncMessage); err != nil {
			logger.Error("Failed to send sync message", zap.Error(err))
		}
	}

	// Handle incoming messages
	for {
		var msg EditorMessage
		err := c.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				logger.Error("WebSocket error", zap.Error(err))
			}
			break
		}

		s.handleEditorMessage(ctx, c, roomID, msg)
	}

	// Cleanup when client disconnects
	localRoom.clientsMutex.Lock()
	delete(localRoom.editorClients, c)
	localRoom.clientsMutex.Unlock()

	s.roomsMutex.Lock()
	if len(localRoom.editorClients) == 0 && len(localRoom.webrtcClients) == 0 {
		delete(s.rooms, roomID)
		logger.Info("Room closed", zap.String("roomID", roomID))
	}
	s.roomsMutex.Unlock()

	logger.Info("Editor client disconnected", zap.String("roomID", roomID))
}

func (s *Server) HandleVideoChatWS(c *websocket.Conn) {
	defer c.Close()

	ctx := context.WithValue(context.Background(), "requestID", c.Params("requestId"))
	logger := s.getLogger(ctx)

	roomID := c.Params("roomId")
	token := c.Query("token")

	logger.Debug("WebSocket connection attempt",
		zap.String("roomID", roomID),
		zap.String("tokenPresent", fmt.Sprintf("%t", token != "")))

	validRoom, err := s.validateRoom(roomID, token)
	if err != nil {
		logger.Error("Room validation failed",
			zap.String("roomID", roomID),
			zap.Error(err))
		return
	}

	if !validRoom.IsActive {
		logger.Error("Room is not active",
			zap.String("roomID", roomID))
		c.WriteMessage(websocket.CloseMessage,
			websocket.FormatCloseMessage(websocket.CloseNormalClosure, "Room is not active"))
		return
	}

	// Create WebRTC client
	client := &WebRTCClient{
		conn:       c,
		candidates: make([]webrtc.ICECandidateInit, 0),
	}

	pc, err := s.createPeerConnection()
	if err != nil {
		logger.Error("Failed to create peer connection", zap.Error(err))
		return
	}
	client.pc = pc

	s.roomsMutex.Lock()
	localRoom, exists := s.rooms[roomID]
	if !exists {
		localRoom = newRoom()
		s.rooms[roomID] = localRoom
	}
	clientID := c.Query("clientId")
	localRoom.peerConns[clientID] = pc
	localRoom.webrtcClients[c] = client
	s.roomsMutex.Unlock()

	// Setup ICE handling
	pc.OnICECandidate(func(ice *webrtc.ICECandidate) {
		if ice == nil {
			return
		}

		candidateJSON := ice.ToJSON()
		msg := map[string]interface{}{
			"type":      "ice_candidate",
			"candidate": candidateJSON,
		}

		client.writeMutex.Lock()
		defer client.writeMutex.Unlock()

		if err := c.WriteJSON(msg); err != nil {
			logger.Error("Failed to send ICE candidate", zap.Error(err))
		}
	})

	// Setup media handling
	pc.OnTrack(func(track *webrtc.TrackRemote, receiver *webrtc.RTPReceiver) {
		s.logger.Info("Received track",
			zap.String("roomID", roomID),
			zap.String("trackID", track.ID()),
			zap.String("kind", track.Kind().String()))

		// Create a local track to forward the received track
		localTrack, err := webrtc.NewTrackLocalStaticRTP(track.Codec().RTPCodecCapability, track.ID(), track.StreamID())
		if err != nil {
			s.logger.Error("Failed to create local track", zap.Error(err))
			return
		}

		// Add the local track to all other peers
		s.roomsMutex.RLock()
		if room, exists := s.rooms[roomID]; exists {
			for _, otherClient := range room.webrtcClients {
				if otherClient.conn != c {
					sender, err := otherClient.pc.AddTrack(localTrack)
					if err != nil {
						s.logger.Error("Failed to add track to peer", zap.Error(err))
						continue
					}

					go func() {
						rtcpBuf := make([]byte, 1500)
						for {
							if _, _, rtcpErr := sender.Read(rtcpBuf); rtcpErr != nil {
								return
							}
						}
					}()
				}
			}
		}
		s.roomsMutex.RUnlock()

		// Read incoming track data and forward it
		go func() {
			rtpBuf := make([]byte, 1500)
			for {
				n, _, err := track.Read(rtpBuf)
				if err != nil {
					s.logger.Error("Failed to read from track", zap.Error(err))
					return
				}

				if _, err = localTrack.Write(rtpBuf[:n]); err != nil {
					s.logger.Error("Failed to write to local track", zap.Error(err))
					return
				}
			}
		}()
	})

	// State change handling
	pc.OnConnectionStateChange(func(state webrtc.PeerConnectionState) {
		s.logger.Info("Peer connection state changed",
			zap.String("roomID", roomID),
			zap.String("state", state.String()))
	})

	for {
		_, msg, err := c.ReadMessage()
		if err != nil {
			if websocket.IsCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				logger.Info("WebSocket closed normally")
			} else {
				logger.Error("WebSocket error", zap.Error(err))
			}
			break
		}

		var signal map[string]interface{}
		if err := json.Unmarshal(msg, &signal); err != nil {
			logger.Error("Failed to parse signal", zap.Error(err))
			continue
		}

		// Handle SDP first
		if sdp, ok := signal["sdp"].(map[string]interface{}); ok {
			if err := s.handleSDP(ctx, client, sdp); err != nil {
				logger.Error("Failed to handle SDP", zap.Error(err))
				continue
			}

			// Process stored candidates after SDP is set
			for _, candidate := range client.candidates {
				if err := client.pc.AddICECandidate(candidate); err != nil {
					logger.Error("Failed to add stored ICE candidate", zap.Error(err))
				}
			}
			client.candidates = nil // Clear stored candidates
		} else if candidate, ok := signal["candidate"].(map[string]interface{}); ok {
			if err := s.handleICECandidate(ctx, client, candidate); err != nil {
				logger.Error("Failed to handle ICE candidate", zap.Error(err))
			}
		}

		// Broadcast to other clients in room
		s.broadcastToRoom(roomID, c, msg)
	}

	// Cleanup
	s.roomsMutex.Lock()
	if localRoom, exists := s.rooms[roomID]; exists {
		delete(localRoom.webrtcClients, c)
		delete(localRoom.peerConns, clientID)
		if len(localRoom.editorClients) == 0 && len(localRoom.webrtcClients) == 0 {
			delete(s.rooms, roomID)
		}
	}
	s.roomsMutex.Unlock()
}

func (s *Server) HandleChatWS(c *websocket.Conn) {
	defer c.Close()

	ctx := context.WithValue(context.Background(), "requestID", c.Params("requestId"))
	logger := s.getLogger(ctx)

	roomID := c.Params("roomId")
	token := c.Query("token")

	validRoom, err := s.validateRoom(roomID, token)
	if err != nil {
		logger.Error("Room validation failed", zap.Error(err))
		return
	}

	if !validRoom.IsActive {
		logger.Error("Room is not active")
		return
	}

	client := &ChatClient{
		conn:     c,
		username: validRoom.CandidateName,
	}

	s.roomsMutex.Lock()
	localRoom, exists := s.rooms[roomID]
	if !exists {
		localRoom = newRoom()
		s.rooms[roomID] = localRoom
	}
	s.roomsMutex.Unlock()

	localRoom.clientsMutex.Lock()
	localRoom.chatClients[c] = client
	localRoom.clientsMutex.Unlock()

	logger.Info("Chat client connected", zap.String("roomID", roomID))

	// Send chat history to new client
	if len(localRoom.chatMessages) > 0 {
		historyEvent := ChatEvent{
			Type: "history",
			Message: ChatMessage{
				Content: "Chat history",
			},
		}
		if err := c.WriteJSON(historyEvent); err != nil {
			logger.Error("Failed to send chat history", zap.Error(err))
		}

		for _, msg := range localRoom.chatMessages {
			if err := c.WriteJSON(ChatEvent{
				Type:    "chat",
				Message: msg,
			}); err != nil {
				logger.Error("Failed to send chat message", zap.Error(err))
			}
		}
	}

	// Handle incoming messages
	for {
		var event ChatEvent
		err := c.ReadJSON(&event)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				logger.Error("WebSocket error", zap.Error(err))
			}
			break
		}

		switch event.Type {
		case "chat":
			if event.UserName == "" || event.UserName == "Anonymous" {
				event.UserName = client.username
				if event.UserName == "" {
					event.UserName = "Anonymous"
				}
			}

			message := ChatMessage{
				ID:        fmt.Sprintf("%d", time.Now().UnixNano()),
				RoomID:    roomID,
				UserName:  event.UserName,
				Content:   event.Content,
				Timestamp: time.Now(),
			}

			localRoom.clientsMutex.Lock()
			localRoom.chatMessages = append(localRoom.chatMessages, message)
			localRoom.clientsMutex.Unlock()

			// Broadcast to all clients in room
			broadcastEvent := ChatEvent{
				Type:    "chat",
				Message: message,
			}

			messageJSON, err := json.Marshal(broadcastEvent)
			if err != nil {
				logger.Error("Failed to marshal chat message", zap.Error(err))
				continue
			}

			localRoom.clientsMutex.RLock()
			for client := range localRoom.chatClients {
				err := client.WriteMessage(websocket.TextMessage, messageJSON)
				if err != nil {
					logger.Error("Failed to broadcast chat message", zap.Error(err))
				}
			}
			localRoom.clientsMutex.RUnlock()
		}
	}

	// Cleanup when client disconnects
	localRoom.clientsMutex.Lock()
	delete(localRoom.chatClients, c)
	localRoom.clientsMutex.Unlock()

	s.roomsMutex.Lock()
	if len(localRoom.editorClients) == 0 && len(localRoom.webrtcClients) == 0 && len(localRoom.chatClients) == 0 {
		delete(s.rooms, roomID)
		logger.Info("Room closed", zap.String("roomID", roomID))
	}
	s.roomsMutex.Unlock()

	logger.Info("Chat client disconnected", zap.String("roomID", roomID))
}

func (s *Server) HandleNotesWS(c *websocket.Conn) {
	defer c.Close()

	ctx := context.WithValue(context.Background(), "requestID", c.Params("requestId"))
	logger := s.getLogger(ctx)

	roomID := c.Params("roomId")
	token := c.Query("token")

	validRoom, err := s.validateRoom(roomID, token)
	if err != nil {
		logger.Error("Room validation failed", zap.Error(err))
		return
	}

	if !validRoom.IsActive {
		logger.Error("Room is not active")
		return
	}

	client := &NotesClient{
		conn: c,
	}

	s.roomsMutex.Lock()
	localRoom, exists := s.rooms[roomID]
	if !exists {
		localRoom = newRoom()
		s.rooms[roomID] = localRoom
	}
	s.roomsMutex.Unlock()

	localRoom.clientsMutex.Lock()
	localRoom.notesClients[c] = client
	localRoom.clientsMutex.Unlock()

	logger.Info("Notes client connected", zap.String("roomID", roomID))

	// Send current notes state to new client
	if localRoom.currentNotes != "" {
		syncMessage := NotesMessage{
			Type:    "sync",
			Content: localRoom.currentNotes,
		}
		if err := c.WriteJSON(syncMessage); err != nil {
			logger.Error("Failed to send notes sync message", zap.Error(err))
		}
	}

	// Handle incoming messages
	for {
		var msg NotesMessage
		err := c.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				logger.Error("WebSocket error", zap.Error(err))
			}
			break
		}

		s.handleNotesMessage(ctx, c, roomID, msg)
	}

	// Cleanup when client disconnects
	localRoom.clientsMutex.Lock()
	delete(localRoom.notesClients, c)
	localRoom.clientsMutex.Unlock()

	s.roomsMutex.Lock()
	if len(localRoom.editorClients) == 0 &&
		len(localRoom.webrtcClients) == 0 &&
		len(localRoom.chatClients) == 0 &&
		len(localRoom.notesClients) == 0 {
		delete(s.rooms, roomID)
		logger.Info("Room closed", zap.String("roomID", roomID))
	}
	s.roomsMutex.Unlock()

	logger.Info("Notes client disconnected", zap.String("roomID", roomID))
}
