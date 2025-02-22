import { useCallback, useEffect, useRef, useState } from "react";
import type {
	ConnectionState,
	ICEMessage,
	SDPMessage,
	WebRTCMessage,
} from "../types/webrtc";

const STUN_SERVER_URL = "stun:stun.l.google.com:19302";
const RECONNECT_DELAY = 2000; // 2 seconds delay between reconnection attempts
const MAX_RECONNECT_ATTEMPTS = 3;

interface WebRTCHook {
	connectionStatus: string;
	localStream: MediaStream | null;
	remoteStream: MediaStream | null;
	toggleWebcam: () => void;
	toggleMicrophone: () => void;
}

const useWebRTC = (url: string, roomId: string): WebRTCHook => {
	const [connectionState, setConnectionState] = useState<ConnectionState>({
		status: "Disconnected",
	});
	const [localStream, setLocalStream] = useState<MediaStream | null>(null);
	const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

	const peerConnection = useRef<RTCPeerConnection | null>(null);
	const ws = useRef<WebSocket | null>(null);
	const remoteStreamRef = useRef<MediaStream>(new MediaStream());
	const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);
	const reconnectAttempts = useRef(0);
	const isComponentMounted = useRef(true);

	const updateConnectionState = useCallback((status: string, error?: Error) => {
		setConnectionState({ status, error });
	}, []);

	const createAndSendOffer = useCallback(async () => {
		if (!peerConnection.current) return;

		try {
			const offer = await peerConnection.current.createOffer();
			await peerConnection.current.setLocalDescription(offer);

			if (ws.current?.readyState === WebSocket.OPEN && offer.sdp) {
				const message: SDPMessage = {
					type: "offer",
					sdp: offer.sdp,
					roomId,
				};
				ws.current.send(JSON.stringify(message));
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			console.error("Error creating and sending offer:", error);
			updateConnectionState("Error", new Error(errorMessage));
		}
	}, [roomId, updateConnectionState]);

	const setupPeerConnection = useCallback(async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: true,
				audio: true,
			});

			setLocalStream(stream);

			peerConnection.current = new RTCPeerConnection({
				iceServers: [{ urls: STUN_SERVER_URL }],
			});

			for (const track of stream.getTracks()) {
				peerConnection.current?.addTrack(track, stream);
			}

			peerConnection.current.ontrack = (event: RTCTrackEvent) => {
				remoteStreamRef.current.addTrack(event.track);
				setRemoteStream(new MediaStream(remoteStreamRef.current.getTracks()));
			};

			peerConnection.current.onicecandidate = (
				event: RTCPeerConnectionIceEvent,
			) => {
				if (event.candidate && ws.current?.readyState === WebSocket.OPEN) {
					const message: ICEMessage = {
						type: "ice_candidate",
						candidate: event.candidate.toJSON(),
						roomId,
					};
					ws.current.send(JSON.stringify(message));
				}
			};

			peerConnection.current.oniceconnectionstatechange = () => {
				updateConnectionState(
					`ICE: ${peerConnection.current?.iceConnectionState}`,
				);
			};

			peerConnection.current.onconnectionstatechange = () => {
				updateConnectionState(
					`Connection: ${peerConnection.current?.connectionState}`,
				);
			};

			if (ws.current?.readyState === WebSocket.OPEN) {
				await createAndSendOffer();
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			console.error("Error setting up peer connection:", error);
			updateConnectionState("Error", new Error(errorMessage));
		}
	}, [roomId, updateConnectionState, createAndSendOffer]);

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

					if (ws.current?.readyState === WebSocket.OPEN && answer.sdp) {
						const message: SDPMessage = {
							type: "answer",
							sdp: answer.sdp,
							roomId,
						};
						ws.current.send(JSON.stringify(message));
					}
				}

				// Process queued ICE candidates
				while (iceCandidatesQueue.current.length > 0) {
					const candidate = iceCandidatesQueue.current.shift();
					if (candidate) {
						await peerConnection.current.addIceCandidate(
							new RTCIceCandidate(candidate),
						);
					}
				}
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";
				console.error("Error handling SDP:", error);
				updateConnectionState("SDP Error", new Error(errorMessage));
			}
		},
		[roomId, updateConnectionState],
	);

	const handleICECandidate = useCallback(
		async (candidateMessage: RTCIceCandidateInit) => {
			if (!peerConnection.current) return;

			try {
				if (peerConnection.current.remoteDescription?.type) {
					await peerConnection.current.addIceCandidate(
						new RTCIceCandidate(candidateMessage),
					);
				} else {
					iceCandidatesQueue.current.push(candidateMessage);
				}
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";
				console.error("Error handling ICE candidate:", error);
				updateConnectionState("ICE Error", new Error(errorMessage));
			}
		},
		[updateConnectionState],
	);

	const handleMessage = useCallback(
		async (event: MessageEvent) => {
			try {
				const message = JSON.parse(event.data) as WebRTCMessage;

				if (message.type === "offer" || message.type === "answer") {
					const sdpMessage = message as SDPMessage;
					if (sdpMessage.sdp) {
						await handleSDP({
							type: sdpMessage.type,
							sdp: sdpMessage.sdp,
						});
					}
				} else if (message.type === "ice_candidate") {
					const iceMessage = message as ICEMessage;
					if (iceMessage.candidate) {
						await handleICECandidate(iceMessage.candidate);
					}
				}
			} catch (error) {
				console.error("Error processing WebSocket message:", error);
			}
		},
		[handleSDP, handleICECandidate],
	);

	const toggleWebcam = useCallback(() => {
		if (!localStream) return;
		for (const track of localStream.getVideoTracks()) {
			track.enabled = !track.enabled;
		}
	}, [localStream]);

	const toggleMicrophone = useCallback(() => {
		if (!localStream) return;
		for (const track of localStream.getAudioTracks()) {
			track.enabled = !track.enabled;
		}
	}, [localStream]);

	const connectWebSocket = useCallback(() => {
		if (!isComponentMounted.current) return;
		if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) return;

		const handleReconnection = () => {
			if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
				const delay = RECONNECT_DELAY * 2 ** reconnectAttempts.current;
				reconnectAttempts.current += 1;
				setTimeout(connectWebSocket, delay);
			}
		};

		try {
			console.log(`Connecting to WebSocket: ${url}/${roomId}`);

			if (ws.current) {
				console.log("Closing existing connection");
				ws.current.onclose = null;
				ws.current.onerror = null;
				ws.current.onmessage = null;
				ws.current.onopen = null;
				ws.current.close();
				ws.current = null;
			}

			const socket = new WebSocket(`${url}/${roomId}`);
			ws.current = socket;

			socket.onmessage = (event) => {
				if (!isComponentMounted.current) return;
				handleMessage(event).catch(console.error);
			};

			socket.onopen = () => {
				if (!isComponentMounted.current) return;
				console.log("WebSocket Connected");
				updateConnectionState("WebSocket Connected");
				reconnectAttempts.current = 0;
				setupPeerConnection().catch(console.error);
			};

			socket.onclose = (event) => {
				if (!isComponentMounted.current) return;
				console.log("WebSocket Closed:", event.code, event.reason);
				updateConnectionState("WebSocket Disconnected");

				if (
					event.code !== 1000 &&
					reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS
				) {
					handleReconnection();
					console.log(
						`Reconnecting in ${RECONNECT_DELAY * 2 ** reconnectAttempts.current}ms (attempt ${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})`,
					);
				} else {
					updateConnectionState("Connection Failed");
				}
			};

			socket.onerror = (error) => {
				if (!isComponentMounted.current) return;
				console.error("WebSocket Error:", error);
				updateConnectionState("WebSocket Error");
			};
		} catch (error) {
			console.error("Failed to create WebSocket:", error);
			handleReconnection();
		}
	}, [roomId, handleMessage, setupPeerConnection, updateConnectionState, url]);

	useEffect(() => {
		isComponentMounted.current = true;
		reconnectAttempts.current = 0;
		connectWebSocket();

		return () => {
			isComponentMounted.current = false;
			if (ws.current) {
				ws.current.onclose = null;
				ws.current.onerror = null;
				ws.current.onmessage = null;
				ws.current.onopen = null;
				ws.current.close();
				ws.current = null;
			}
			if (peerConnection.current) {
				peerConnection.current.close();
				peerConnection.current = null;
			}
			const currentLocalStream = localStream;
			if (currentLocalStream) {
				for (const track of currentLocalStream.getTracks()) {
					track.stop();
				}
			}
			setLocalStream(null);
			setRemoteStream(null);
		};
	}, [connectWebSocket, localStream]);

	return {
		connectionStatus: connectionState.status,
		localStream,
		remoteStream,
		toggleWebcam,
		toggleMicrophone,
	};
};

export default useWebRTC;
