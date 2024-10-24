import { useState, useRef, useEffect, useCallback } from "react";
import { Rnnoise } from "@shiguredo/rnnoise-wasm";

const STUN_SERVER_URL = "stun:stun.l.google.com:19302";
const FRAME_SIZE = 480;

const useWebRTC = (url: string, roomId: string) => {
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isRNNoiseEnabled, setIsRNNoiseEnabled] = useState(true);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const remoteStreamRef = useRef<MediaStream>(new MediaStream());
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);
  const audioContext = useRef<AudioContext | null>(null);
  const denoiseState = useRef<any>(null);

  const setupPeerConnection = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      let processedStream = stream;

      if (isRNNoiseEnabled) {
        try {
          const rnnoise = await Rnnoise.load();
          denoiseState.current = rnnoise.createDenoiseState();

          audioContext.current = new AudioContext();
          const sourceNode =
            audioContext.current.createMediaStreamSource(stream);
          const processorNode = audioContext.current.createScriptProcessor(
            FRAME_SIZE,
            1,
            1,
          );

          processorNode.onaudioprocess = (audioProcessingEvent) => {
            const inputBuffer = audioProcessingEvent.inputBuffer;
            const outputBuffer = audioProcessingEvent.outputBuffer;
            const inputData = inputBuffer.getChannelData(0);
            const outputData = outputBuffer.getChannelData(0);

            denoiseState.current.processFrame(inputData);

            for (let i = 0; i < FRAME_SIZE; i++) {
              outputData[i] = inputData[i];
            }
          };

          sourceNode.connect(processorNode);
          processorNode.connect(audioContext.current.destination);
          processedStream = new MediaStream();
          processedStream.addTrack(
            audioContext.current
              .createMediaStreamDestination()
              .stream.getAudioTracks()[0],
          );
          stream
            .getVideoTracks()
            .forEach((track) => processedStream.addTrack(track));
        } catch (error) {
          setIsRNNoiseEnabled(false);
          processedStream = stream;
        }
      }

      setLocalStream(processedStream);

      peerConnection.current = new RTCPeerConnection({
        iceServers: [{ urls: STUN_SERVER_URL }],
      });

      processedStream.getTracks().forEach((track) => {
        peerConnection.current?.addTrack(track, processedStream);
      });

      peerConnection.current.ontrack = (event: RTCTrackEvent) => {
        remoteStreamRef.current.addTrack(event.track);
        setRemoteStream(new MediaStream(remoteStreamRef.current.getTracks()));
      };

      peerConnection.current.onicecandidate = (
        event: RTCPeerConnectionIceEvent,
      ) => {
        if (event.candidate && ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(
            JSON.stringify({
              type: "ice_candidate",
              candidate: event.candidate,
              roomId: roomId,
            }),
          );
        }
      };

      peerConnection.current.oniceconnectionstatechange = () => {
        setConnectionStatus(
          `ICE: ${peerConnection.current?.iceConnectionState}`,
        );
      };

      peerConnection.current.onconnectionstatechange = () => {
        setConnectionStatus(
          `Connection: ${peerConnection.current?.connectionState}`,
        );
      };

      if (ws.current?.readyState === WebSocket.OPEN) {
        await createAndSendOffer();
      }
    } catch (error) {
      console.error("Error setting up peer connection:", error);
      setConnectionStatus(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }, [roomId, isRNNoiseEnabled]);

  const createAndSendOffer = async () => {
    if (!peerConnection.current) return;

    try {
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);

      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(
          JSON.stringify({ type: "offer", sdp: offer.sdp, roomId: roomId }),
        );
      }
    } catch (error) {
      console.error("Error creating and sending offer:", error);
    }
  };

  const handleSDP = useCallback(
    async (sdp: RTCSessionDescriptionInit) => {
      if (!peerConnection.current) return;

      try {
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(sdp),
        );

        if (sdp.type === "offer") {
          const answer = await peerConnection.current.createAnswer();
          await peerConnection.current.setLocalDescription(answer);

          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(
              JSON.stringify({
                type: "answer",
                sdp: answer.sdp,
                roomId: roomId,
              }),
            );
          }
        }

        while (iceCandidatesQueue.current.length > 0) {
          const candidate = iceCandidatesQueue.current.shift();
          if (candidate) {
            await peerConnection.current.addIceCandidate(
              new RTCIceCandidate(candidate),
            );
          }
        }
      } catch (error) {
        console.error("Error handling SDP:", error);
        setConnectionStatus(
          `SDP Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    },
    [roomId],
  );

  const handleICECandidate = useCallback(
    async (candidateMessage: RTCIceCandidateInit) => {
      if (!peerConnection.current) return;

      try {
        if (
          peerConnection.current.remoteDescription &&
          peerConnection.current.remoteDescription.type
        ) {
          await peerConnection.current.addIceCandidate(
            new RTCIceCandidate(candidateMessage),
          );
        } else {
          iceCandidatesQueue.current.push(candidateMessage);
        }
      } catch (error) {
        console.error("Error handling ICE candidate:", error);
        setConnectionStatus(
          `ICE Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    },
    [],
  );

  const toggleWebcam = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
    }
  };

  const toggleMicrophone = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
    }
  };

  useEffect(() => {
    ws.current = new WebSocket(`${url}/${roomId}`);

    ws.current.onmessage = async (event: MessageEvent) => {
      const message = JSON.parse(event.data);

      if (message.type === "offer" || message.type === "answer") {
        await handleSDP(message);
      } else if (message.type === "ice_candidate" && message.candidate) {
        await handleICECandidate(message.candidate);
      }
    };

    ws.current.onopen = async () => {
      setConnectionStatus("WebSocket Connected");
      await setupPeerConnection();
    };

    ws.current.onclose = () => {
      setConnectionStatus("WebSocket Disconnected");
      peerConnection.current?.close();
      setRemoteStream(null);
    };

    ws.current.onerror = () => {
      setConnectionStatus("WebSocket Error");
    };

    return () => {
      ws.current?.close();
      peerConnection.current?.close();
      localStream?.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
      setRemoteStream(null);
      if (audioContext.current) {
        audioContext.current.close();
      }
      if (denoiseState.current) {
        denoiseState.current.destroy();
      }
    };
  }, [handleSDP, handleICECandidate, setupPeerConnection, url, roomId]);

  return {
    connectionStatus,
    localStream,
    remoteStream,
    toggleWebcam,
    toggleMicrophone,
  };
};

export default useWebRTC;
