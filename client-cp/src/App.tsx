import React, { useEffect, useRef, useState } from 'react';
import VideoStream from './components/VideoStream';
import './App.css';

const App: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const ws = useRef<WebSocket | null>(null);

  const stunServerURL = 'stun:stun.l.google.com:19302';
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);

  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsURL = `${wsProtocol}://192.168.1.10:3000/ws`;
    ws.current = new WebSocket(wsURL);

    ws.current.onmessage = async (event: MessageEvent) => {
      const message = JSON.parse(event.data);
      console.log('Received message:', message);

      if (message.type === 'offer' || message.type === 'answer') {
        await handleSDP(message);
      } else if (message.candidate) {
        await handleICECandidate(message);
      }
    };

    ws.current.onopen = async () => {
      console.log('WebSocket connection opened');
      setConnectionStatus('WebSocket Connected');
      await setupPeerConnection();
    };

    ws.current.onclose = () => {
      console.log('WebSocket connection closed');
      setConnectionStatus('WebSocket Disconnected');
      if (peerConnection.current) {
        peerConnection.current.close();
      }
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
      if (peerConnection.current) {
        peerConnection.current.close();
      }
    };
  }, []);

  const setupPeerConnection = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);

      peerConnection.current = new RTCPeerConnection({
        iceServers: [{ urls: stunServerURL }]
      });

      stream.getTracks().forEach((track) => {
        console.log('Adding local track to peer connection:', track.kind);
        peerConnection.current?.addTrack(track, stream);
      });

      peerConnection.current.ontrack = (event: RTCTrackEvent) => {
        console.log('Received remote track:', event.track.kind);
        setRemoteStream((prevStream) => {
          if (!prevStream) {
            prevStream = new MediaStream();
          }
          prevStream.addTrack(event.track);
          return prevStream;
        });
      };

      peerConnection.current.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
        if (event.candidate) {
          console.log('Sending ICE candidate:', event.candidate);
          ws.current?.send(
            JSON.stringify({
              candidate: event.candidate.candidate,
              sdpMid: event.candidate.sdpMid,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
              usernameFragment: event.candidate.usernameFragment
            })
          );
        }
      };

      peerConnection.current.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', peerConnection.current?.iceConnectionState);
        setConnectionStatus(`ICE: ${peerConnection.current?.iceConnectionState}`);

        if (
          peerConnection.current?.iceConnectionState === 'disconnected' ||
          peerConnection.current?.iceConnectionState === 'failed' ||
          peerConnection.current?.iceConnectionState === 'closed'
        ) {
          clearRemoteVideo();
        }
      };

      peerConnection.current.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.current?.connectionState);
        setConnectionStatus(`Connection: ${peerConnection.current?.connectionState}`);
      };

      peerConnection.current.onsignalingstatechange = () => {
        console.log('Signaling state:', peerConnection.current?.signalingState);
      };

      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      console.log('Sending SDP offer:', offer);
      ws.current?.send(JSON.stringify({ type: 'offer', sdp: offer.sdp }));
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error setting up peer connection:', error.message);
        setConnectionStatus(`Error: ${error.message}`);
      } else {
        console.error('Unknown error setting up peer connection');
        setConnectionStatus('Unknown error setting up peer connection');
      }
    }
  };

  const handleSDP = async (sdp: RTCSessionDescriptionInit) => {
    console.log('Handling SDP:', sdp);
    try {
      await peerConnection.current?.setRemoteDescription(new RTCSessionDescription(sdp));
      console.log('Set remote description successfully');

      if (sdp.type === 'offer') {
        const answer = await peerConnection.current?.createAnswer();
        if (answer) {
          await peerConnection.current?.setLocalDescription(answer);
          console.log('Sending SDP answer:', answer);
          ws.current?.send(JSON.stringify({ type: 'answer', sdp: answer.sdp }));
        } else {
          console.error('Failed to create SDP answer');
          setConnectionStatus('Failed to create SDP answer');
        }
      }

      while (iceCandidatesQueue.current.length > 0) {
        const candidate = iceCandidatesQueue.current.shift();
        await peerConnection.current?.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('Added queued ICE candidate');
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error handling SDP:', error.message);
        setConnectionStatus(`SDP Error: ${error.message}`);
      } else {
        console.error('Unknown error handling SDP');
        setConnectionStatus('Unknown SDP error');
      }
    }
  };

  const handleICECandidate = async (candidateMessage: RTCIceCandidateInit) => {
    console.log('Handling ICE candidate:', candidateMessage);
    try {
      if (peerConnection.current?.remoteDescription && peerConnection.current.remoteDescription.type) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidateMessage));
        console.log('Added ICE candidate successfully');
      } else {
        iceCandidatesQueue.current.push(candidateMessage);
        console.log('Queued ICE candidate');
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error adding ICE candidate:', error.message);
        setConnectionStatus(`ICE Error: ${error.message}`);
      } else {
        console.error('Unknown error adding ICE candidate');
        setConnectionStatus('Unknown ICE error');
      }
    }
  };

  const clearRemoteVideo = () => {
    console.log('Clearing remote video');
    setRemoteStream((prevStream) => {
      if (prevStream) {
        prevStream.getTracks().forEach((track) => track.stop());
      }
      return null;
    });
  };

  return (
    <div>
      <VideoStream stream={localStream} muted={true} title="Local video stream" />
      <VideoStream stream={remoteStream} title="Remote video stream" />
      <div className="status">Connection Status: {connectionStatus}</div>
    </div>
  );
};

export default App;