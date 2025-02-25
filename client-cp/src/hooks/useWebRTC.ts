import { useCallback, useEffect, useRef, useState } from "react";
import type {
	ConnectionState,
	ICEMessage,
	SDPMessage,
	WebRTCMessage,
} from "../types/webrtc";

const STUN_SERVER_URL = "stun:stun.l.google.com:19302";
const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_ATTEMPTS = 3;

interface WebRTCHook {
	connectionStatus: string;
	localStream: MediaStream | null;
	remoteStream: MediaStream | null;
	toggleWebcam: () => void;
	toggleMicrophone: () => void;
	cleanup: () => void;
}

const useWebRTC = (
	url: string | null,
	roomId: string,
	token: string | null,
): WebRTCHook => {
	// States
	const [connectionState, setConnectionState] = useState<ConnectionState>({
		status: "Disconnected",
	});
	const [localStream, setLocalStream] = useState<MediaStream | null>(null);
	const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

	// Refs
	const peerConnection = useRef<RTCPeerConnection | null>(null);
	const ws = useRef<WebSocket | null>(null);
	const remoteStreamRef = useRef<MediaStream>(new MediaStream());
	const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);
	const localStreamRef = useRef<MediaStream | null>(null);
	const reconnectAttempts = useRef(0);
	const isConnecting = useRef(false);
	const isComponentMounted = useRef(true);

	const updateConnectionState = useCallback((status: string, error?: Error) => {
		setConnectionState({ status, error });
	}, []);

	const cleanupWebSocket = useCallback(() => {
		if (ws.current) {
			ws.current.onclose = null;
			ws.current.onerror = null;
			ws.current.onmessage = null;
			ws.current.onopen = null;
			ws.current.close();
			ws.current = null;
		}
	}, []);

	const createAndSendOffer = useCallback(async () => {
		if (!peerConnection.current) return;

		try {
			const offer = await peerConnection.current.createOffer();
			await peerConnection.current.setLocalDescription(offer);

			if (ws.current?.readyState === WebSocket.OPEN && offer.sdp) {
				ws.current.send(
					JSON.stringify({
						type: "offer",
						sdp: offer.sdp,
						roomId,
					} as SDPMessage),
				);
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			console.error("Error creating and sending offer:", error);
			updateConnectionState("Error", new Error(errorMessage));
		}
	}, [roomId, updateConnectionState]);

	const initializeMediaStream = useCallback(async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: true,
				audio: true,
			});
			localStreamRef.current = stream;
			setLocalStream(stream);
			return stream;
		} catch (error) {
			console.error("Failed to get media stream:", error);
			updateConnectionState(
				"MediaStream Error",
				error instanceof Error
					? error
					: new Error("Failed to get media stream"),
			);
			return null;
		}
	}, [updateConnectionState]);

	const setupPeerConnection = useCallback(
		async (stream?: MediaStream) => {
			try {
				const mediaStream = stream || (await initializeMediaStream());
				if (!mediaStream) return;

				peerConnection.current = new RTCPeerConnection({
					iceServers: [{ urls: STUN_SERVER_URL }],
				});

				mediaStream.getTracks().forEach((track) => {
					peerConnection.current?.addTrack(track, mediaStream);
				});

				// Set up event handlers
				peerConnection.current.ontrack = ({ track }) => {
					remoteStreamRef.current.addTrack(track);
					setRemoteStream(new MediaStream(remoteStreamRef.current.getTracks()));
				};

				peerConnection.current.onicecandidate = ({ candidate }) => {
					if (candidate && ws.current?.readyState === WebSocket.OPEN) {
						ws.current.send(
							JSON.stringify({
								type: "ice_candidate",
								candidate: candidate.toJSON(),
								roomId,
							} as ICEMessage),
						);
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
				console.error("Error setting up peer connection:", error);
				updateConnectionState(
					"Error",
					error instanceof Error ? error : new Error("Setup failed"),
				);
			}
		},
		[createAndSendOffer, initializeMediaStream, updateConnectionState, roomId],
	);

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
						ws.current.send(
							JSON.stringify({
								type: "answer",
								sdp: answer.sdp,
								roomId,
							} as SDPMessage),
						);
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
				console.error("Error handling SDP:", error);
				updateConnectionState(
					"SDP Error",
					error instanceof Error ? error : new Error("SDP handling failed"),
				);
			}
		},
		[roomId, updateConnectionState],
	);

	const handleICECandidate = useCallback(
		async (candidate: RTCIceCandidateInit) => {
			if (!peerConnection.current) return;

			try {
				if (peerConnection.current.remoteDescription?.type) {
					await peerConnection.current.addIceCandidate(
						new RTCIceCandidate(candidate),
					);
				} else {
					iceCandidatesQueue.current.push(candidate);
				}
			} catch (error) {
				console.error("Error handling ICE candidate:", error);
				updateConnectionState(
					"ICE Error",
					error instanceof Error ? error : new Error("ICE handling failed"),
				);
			}
		},
		[updateConnectionState],
	);

	const handleMessage = useCallback(
		async (event: MessageEvent) => {
			try {
				const message = JSON.parse(event.data) as WebRTCMessage;

				if (message.type === "offer" || message.type === "answer") {
					await handleSDP({
						type: message.type,
						sdp: (message as SDPMessage).sdp,
					});
				} else if (message.type === "ice_candidate") {
					await handleICECandidate((message as ICEMessage).candidate);
				}
			} catch (error) {
				console.error("Error processing WebSocket message:", error);
			}
		},
		[handleSDP, handleICECandidate],
	);

	const connectWebSocket = useCallback(() => {
		if (!isComponentMounted.current || isConnecting.current || !token) return;
		if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) return;
		if (ws.current?.readyState === WebSocket.OPEN) return;

		isConnecting.current = true;

		try {
			cleanupWebSocket();

			const socket = new WebSocket(`${url}/${roomId}?token=${token}`);
			ws.current = socket;

			socket.onmessage = (event) => {
				if (isComponentMounted.current) {
					handleMessage(event).catch(console.error);
				}
			};

			socket.onopen = () => {
				if (isComponentMounted.current) {
					updateConnectionState("WebSocket Connected");
					reconnectAttempts.current = 0;
					isConnecting.current = false;
					setupPeerConnection().catch(console.error);
				}
			};

			socket.onclose = (event) => {
				if (isComponentMounted.current) {
					updateConnectionState("WebSocket Disconnected");
					isConnecting.current = false;

					if (
						event.code !== 1000 &&
						reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS
					) {
						const delay = RECONNECT_DELAY * 2 ** reconnectAttempts.current;
						reconnectAttempts.current += 1;
						setTimeout(connectWebSocket, delay);
					} else {
						updateConnectionState("Connection Failed");
					}
				}
			};

			socket.onerror = (error) => {
				if (isComponentMounted.current) {
					console.error("WebSocket Error:", error);
					updateConnectionState("WebSocket Error");
					isConnecting.current = false;
				}
			};
		} catch (error) {
			console.error("Failed to create WebSocket:", error);
			isConnecting.current = false;

			if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
				const delay = RECONNECT_DELAY * 2 ** reconnectAttempts.current;
				reconnectAttempts.current += 1;
				setTimeout(connectWebSocket, delay);
			}
		}
	}, [
		roomId,
		handleMessage,
		setupPeerConnection,
		updateConnectionState,
		url,
		token,
		cleanupWebSocket,
	]);

	// Media controls
	const toggleWebcam = useCallback(() => {
		localStream?.getVideoTracks().forEach((track) => {
			track.enabled = !track.enabled;
		});
	}, [localStream]);

	const toggleMicrophone = useCallback(() => {
		localStream?.getAudioTracks().forEach((track) => {
			track.enabled = !track.enabled;
		});
	}, [localStream]);

	const cleanup = useCallback(() => {
		isComponentMounted.current = false;
		isConnecting.current = false;

		cleanupWebSocket();

		if (peerConnection.current) {
			peerConnection.current.close();
			peerConnection.current = null;
		}

		if (localStreamRef.current) {
			localStreamRef.current.getTracks().forEach((track) => track.stop());
			localStreamRef.current = null;
		}

		setLocalStream(null);
		setRemoteStream(null);
	}, [cleanupWebSocket]);

	// Initialization and cleanup
	useEffect(() => {
		if (!url) return;

		let isInitialized = false;

		const initialize = async () => {
			if (isInitialized) return;
			isInitialized = true;

			isComponentMounted.current = true;
			reconnectAttempts.current = 0;
			isConnecting.current = false;

			const stream = await initializeMediaStream();
			if (stream) {
				connectWebSocket();
			}
		};

		initialize();

		return () => {
			isInitialized = false;
			isComponentMounted.current = false;
			isConnecting.current = false;

			cleanupWebSocket();

			if (peerConnection.current) {
				peerConnection.current.close();
				peerConnection.current = null;
			}

			if (localStreamRef.current) {
				localStreamRef.current.getTracks().forEach((track) => track.stop());
				localStreamRef.current = null;
			}

			setLocalStream(null);
			setRemoteStream(null);
		};
	}, [connectWebSocket, initializeMediaStream, cleanupWebSocket, url]);

	return {
		connectionStatus: connectionState.status,
		localStream,
		remoteStream,
		toggleWebcam,
		toggleMicrophone,
		cleanup,
	};
};

export default useWebRTC;
