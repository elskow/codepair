import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Editor } from '@monaco-editor/react';
import VideoStream from './components/VideoStream';
import './App.css';

type WebSocketMessage = {
    type: 'offer' | 'answer' | 'ice_candidate' | 'code_update';
    sdp?: string;
    candidate?: RTCIceCandidateInit;
    code?: string;
};

const App: React.FC = () => {
    const [connectionStatus, setConnectionStatus] = useState('Disconnected');
    const [code, setCode] = useState('// Start coding...');
    const [language, setLanguage] = useState('javascript');
    const localStream = useRef<MediaStream | null>(null);
    const remoteStream = useRef<MediaStream | null>(null);
    const [remoteStreamState, setRemoteStreamState] = useState<MediaStream | null>(null);

    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const ws = useRef<WebSocket | null>(null);

    const stunServerURL = 'stun:stun.l.google.com:19302';
    const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;
    const reconnectInterval = 5000; // 5 seconds
    const connectionTimeout = 10000; // 10 seconds

    const messageQueue = useRef<WebSocketMessage[]>([]);

    const clearRemoteVideo = useCallback(() => {
        if (remoteStream.current) {
            remoteStream.current.getTracks().forEach((track) => track.stop());
        }
        setRemoteStreamState(null);
    }, []);

    const sendWebSocketMessage = useCallback((message: WebSocketMessage) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(message));
        } else {
            console.error('WebSocket is not open. Unable to send message:', message);
            setConnectionStatus('WebSocket is not open. Unable to send message.');
            messageQueue.current.push(message);
        }
    }, []);

    const processMessageQueue = useCallback(() => {
        while (messageQueue.current.length > 0) {
            const message = messageQueue.current.shift();
            if (ws.current && ws.current.readyState === WebSocket.OPEN && message) {
                ws.current.send(JSON.stringify(message));
            }
        }
    }, []);

    const handleSetupError = useCallback((error: unknown) => {
        if (error instanceof Error) {
            console.error('Error setting up peer connection:', error.message);
            setConnectionStatus(`Error: ${error.message}`);
        } else {
            console.error('Unknown error setting up peer connection');
            setConnectionStatus('Unknown error setting up peer connection');
        }
    }, []);

    const handleSDPError = useCallback((error: unknown) => {
        if (error instanceof Error) {
            console.error('Error handling SDP:', error.message);
            setConnectionStatus(`SDP Error: ${error.message}`);
        } else {
            console.error('Unknown error handling SDP');
            setConnectionStatus('Unknown SDP error');
        }
    }, []);

    const handleICEError = useCallback((error: unknown) => {
        if (error instanceof Error) {
            console.error('Error adding ICE candidate:', error.message);
            setConnectionStatus(`ICE Error: ${error.message}`);
        } else {
            console.error('Unknown error adding ICE candidate');
            setConnectionStatus('Unknown ICE error');
        }
    }, []);

    const handleSDP = useCallback(async (sdp: RTCSessionDescriptionInit) => {
        try {
            if (!peerConnection.current) {
                throw new Error('PeerConnection is not initialized');
            }
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(sdp));

            if (sdp.type === 'offer') {
                const answer = await peerConnection.current.createAnswer();
                await peerConnection.current.setLocalDescription(answer);
                sendWebSocketMessage({ type: 'answer', sdp: answer.sdp });
            }

            while (iceCandidatesQueue.current.length > 0) {
                const candidate = iceCandidatesQueue.current.shift();
                if (candidate) {
                    await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
                }
            }
        } catch (error) {
            handleSDPError(error);
        }
    }, [sendWebSocketMessage, handleSDPError]);

    const handleICECandidate = useCallback(async (candidateMessage: RTCIceCandidateInit) => {
        try {
            if (!peerConnection.current) {
                throw new Error('PeerConnection is not initialized');
            }
            if (peerConnection.current.remoteDescription && peerConnection.current.remoteDescription.type) {
                await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidateMessage));
            } else {
                iceCandidatesQueue.current.push(candidateMessage);
            }
        } catch (error) {
            handleICEError(error);
        }
    }, [handleICEError]);

    const setupPeerConnection = useCallback(async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('getUserMedia is not supported in this browser');
            }

            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStream.current = stream;

            peerConnection.current = new RTCPeerConnection({
                iceServers: [{ urls: stunServerURL }]
            });

            stream.getTracks().forEach((track) => {
                peerConnection.current?.addTrack(track, stream);
            });

            peerConnection.current.ontrack = (event: RTCTrackEvent) => {
                console.log('Received remote track:', event.track);
                if (!remoteStream.current) {
                    remoteStream.current = new MediaStream();
                }
                remoteStream.current.addTrack(event.track);
                setRemoteStreamState(new MediaStream(remoteStream.current.getTracks()));
            };

            peerConnection.current.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
                if (event.candidate) {
                    sendWebSocketMessage({ type: 'ice_candidate', candidate: event.candidate.toJSON() });
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
                setConnectionStatus(`Signaling: ${peerConnection.current?.signalingState}`);
            };

            const offer = await peerConnection.current.createOffer();
            await peerConnection.current.setLocalDescription(offer);
            sendWebSocketMessage({ type: 'offer', sdp: offer.sdp });
        } catch (error) {
            handleSetupError(error);
        }
    }, [clearRemoteVideo, sendWebSocketMessage, handleSetupError]);

    useEffect(() => {
        const setupWebSocket = () => {
            const wsURL = `ws://localhost:3000/ws`;

            if (ws.current) {
                ws.current.close();
            }

            ws.current = new WebSocket(wsURL);

            const connectionTimeoutId = setTimeout(() => {
                if (ws.current && ws.current.readyState !== WebSocket.OPEN) {
                    ws.current.close();
                    handleReconnect();
                }
            }, connectionTimeout);

            ws.current.onmessage = async (event: MessageEvent) => {
                const message: WebSocketMessage = JSON.parse(event.data);

                if (message.type === 'offer' || message.type === 'answer') {
                    await handleSDP({ type: message.type, sdp: message.sdp });
                } else if (message.type === 'ice_candidate' && message.candidate) {
                    await handleICECandidate(message.candidate);
                } else if (message.type === 'code_update' && message.code !== undefined) {
                    setCode(message.code);
                }
            };

            ws.current.onopen = async () => {
                clearTimeout(connectionTimeoutId);
                setConnectionStatus('WebSocket Connected');
                reconnectAttempts.current = 0;
                processMessageQueue();
            };

            ws.current.onclose = (event) => {
                clearTimeout(connectionTimeoutId);
                setConnectionStatus(`WebSocket Disconnected (Code: ${event.code}, Reason: ${event.reason || 'No reason provided'})`);
                if (peerConnection.current) {
                    peerConnection.current.close();
                    peerConnection.current = null;
                }
                handleReconnect();
            };

            ws.current.onerror = (error) => {
                console.error('WebSocket error:', error);
                setConnectionStatus('WebSocket Error');
            };
        };

        const handleReconnect = () => {
            if (reconnectAttempts.current < maxReconnectAttempts) {
                reconnectAttempts.current += 1;
                setConnectionStatus(`Reconnecting (Attempt ${reconnectAttempts.current}/${maxReconnectAttempts})...`);
                setTimeout(() => {
                    setupWebSocket();
                }, reconnectInterval);
            } else {
                setConnectionStatus('Max reconnection attempts reached. Please check your network connection and refresh the page.');
            }
        };

        const initializeConnection = async () => {
            try {
                await setupPeerConnection();
            } catch (error) {
                handleSetupError(error);
            }
        };

        setupWebSocket();
        initializeConnection();

        return () => {
            if (ws.current) {
                ws.current.close();
            }
            if (peerConnection.current) {
                peerConnection.current.close();
            }
            if (localStream.current) {
                localStream.current.getTracks().forEach((track) => track.stop());
            }
        };
    }, [handleSDP, handleICECandidate, setupPeerConnection, handleSetupError, processMessageQueue]);

    const handleEditorChange = (value: string | undefined) => {
        if (value !== undefined) {
            setCode(value);
            sendWebSocketMessage({ type: 'code_update', code: value });
        }
    };

    const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setLanguage(event.target.value);
    };

    useEffect(() => {
        const autoSaveInterval = setInterval(() => {
            sendWebSocketMessage({ type: 'code_update', code });
        }, 5000);

        return () => clearInterval(autoSaveInterval);
    }, [code, sendWebSocketMessage]);

    return (
        <header className='min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center'>
            <main className='flex flex-col items-center space-y-4'>
                <section className='flex flex-row space-x-4'>
                    <VideoStream stream={localStream.current} muted={true} title="Local video stream" className="rounded-lg border border-neutral-700" />
                    <VideoStream stream={remoteStreamState} title="Remote video stream" className="rounded-lg border border-neutral-700" />
                </section>
                <div className="text-center text-sm">Connection Status: {connectionStatus}</div>
            </main>
            <section className='w-full px-4'>
                <div className='flex justify-end items-center mb-2 mx-8'>
                    <label htmlFor="language" className='sr-only'>Select Language</label>
                    <select id="language" value={language} onChange={handleLanguageChange} className='bg-neutral-800 text-white p-2 rounded hover:bg-neutral-700 text-sm'>
                        <option value="javascript">JavaScript</option>
                        <option value="typescript">TypeScript</option>
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                        <option value="csharp">C#</option>
                        <option value="cpp">C++</option>
                    </select>
                </div>
                <Editor
                    height="70vh"
                    language={language}
                    value={code}
                    onChange={handleEditorChange}
                    className="rounded-lg"
                    theme='vs-dark'
                    options={{
                        automaticLayout: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        tabSize: 2,
                    }}
                />
            </section>
        </header>
    );
};

export default App;