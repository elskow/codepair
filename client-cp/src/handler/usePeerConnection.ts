import { useEffect, useRef, useState } from 'react';

const usePeerConnection = (stunServerURL: string, sendMessage: (message: any) => void) => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [connectionStatus, setConnectionStatus] = useState('Disconnected');
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);

    useEffect(() => {
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
                    peerConnection.current?.addTrack(track, stream);
                });

                peerConnection.current.ontrack = (event: RTCTrackEvent) => {
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
                        sendMessage({
                            candidate: event.candidate.candidate,
                            sdpMid: event.candidate.sdpMid,
                            sdpMLineIndex: event.candidate.sdpMLineIndex,
                            usernameFragment: event.candidate.usernameFragment
                        });
                    }
                };

                peerConnection.current.oniceconnectionstatechange = () => {
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
                    setConnectionStatus(`Connection: ${peerConnection.current?.connectionState}`);
                };

                peerConnection.current.onsignalingstatechange = () => {
                    console.log('Signaling state:', peerConnection.current?.signalingState);
                };

                const offer = await peerConnection.current.createOffer();
                await peerConnection.current.setLocalDescription(offer);
                sendMessage({ type: 'offer', sdp: offer.sdp });
            } catch (error) {
                if (error instanceof Error) {
                    setConnectionStatus(`Error: ${error.message}`);
                } else {
                    setConnectionStatus('Unknown error setting up peer connection');
                }
            }
        };

        setupPeerConnection();

        return () => {
            if (peerConnection.current) {
                peerConnection.current.close();
            }
        };
    }, [stunServerURL, sendMessage]);

    const handleSDP = async (sdp: RTCSessionDescriptionInit) => {
        try {
            await peerConnection.current?.setRemoteDescription(new RTCSessionDescription(sdp));
            if (sdp.type === 'offer') {
                const answer = await peerConnection.current?.createAnswer();
                if (answer) {
                    await peerConnection.current?.setLocalDescription(answer);
                    sendMessage({ type: 'answer', sdp: answer.sdp });
                } else {
                    setConnectionStatus('Failed to create SDP answer');
                }
            }

            while (iceCandidatesQueue.current.length > 0) {
                const candidate = iceCandidatesQueue.current.shift();
                await peerConnection.current?.addIceCandidate(new RTCIceCandidate(candidate));
            }
        } catch (error) {
            if (error instanceof Error) {
                setConnectionStatus(`SDP Error: ${error.message}`);
            } else {
                setConnectionStatus('Unknown SDP error');
            }
        }
    };

    const handleICECandidate = async (candidateMessage: RTCIceCandidateInit) => {
        try {
            if (peerConnection.current?.remoteDescription && peerConnection.current.remoteDescription.type) {
                await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidateMessage));
            } else {
                iceCandidatesQueue.current.push(candidateMessage);
            }
        } catch (error) {
            if (error instanceof Error) {
                setConnectionStatus(`ICE Error: ${error.message}`);
            } else {
                setConnectionStatus('Unknown ICE error');
            }
        }
    };

    const clearRemoteVideo = () => {
        setRemoteStream((prevStream) => {
            if (prevStream) {
                prevStream.getTracks().forEach((track) => track.stop());
            }
            return null;
        });
    };

    return { localStream, remoteStream, connectionStatus, handleSDP, handleICECandidate };
};

export default usePeerConnection;