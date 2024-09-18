<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { writable } from 'svelte/store';

    let localStream: MediaStream;
    let remoteStream: MediaStream;
    let peerConnection: RTCPeerConnection;
    let ws: WebSocket;

    const stunServerURL = 'stun:stun.l.google.com:19302';
    let iceCandidatesQueue: RTCIceCandidateInit[] = [];

    export const connectionStatus = writable('Disconnected');

    onMount(async () => {
        ws = new WebSocket('ws://localhost:3000/ws');

        ws.onmessage = async (event: MessageEvent) => {
            const message = JSON.parse(event.data);
            console.log('Received message:', message);

            if (message.type === 'offer' || message.type === 'answer') {
                await handleSDP(message);
            } else if (message.candidate) {
                await handleICECandidate(message);
            }
        };

        ws.onopen = async () => {
            console.log('WebSocket connection opened');
            connectionStatus.set('WebSocket Connected');
            await setupPeerConnection();
        };

        ws.onclose = () => {
            console.log('WebSocket connection closed');
            connectionStatus.set('WebSocket Disconnected');
            if (peerConnection) {
                peerConnection.close();
            }
        };
    });

    onDestroy(() => {
        if (ws) {
            ws.close();
        }
        if (peerConnection) {
            peerConnection.close();
        }
    });

    async function setupPeerConnection() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('getUserMedia is not supported in this browser');
            }

            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            (document.getElementById('localVideo') as HTMLVideoElement).srcObject = localStream;

            peerConnection = new RTCPeerConnection({
                iceServers: [{ urls: stunServerURL }]
            });

            localStream.getTracks().forEach(track => {
                console.log('Adding local track to peer connection:', track.kind);
                peerConnection.addTrack(track, localStream);
            });

            peerConnection.ontrack = (event: RTCTrackEvent) => {
                console.log('Received remote track:', event.track.kind);
                if (!remoteStream) {
                    console.log('Creating new remote stream');
                    remoteStream = new MediaStream();
                    const remoteVideo = document.getElementById('remoteVideo') as HTMLVideoElement;
                    remoteVideo.srcObject = remoteStream;
                    console.log('Set remote video source object');
                }
                remoteStream.addTrack(event.track);
                console.log('Added remote track to remote stream');
            };

            peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
                if (event.candidate) {
                    console.log('Sending ICE candidate:', event.candidate);
                    ws.send(JSON.stringify({ 
                        candidate: event.candidate.candidate,
                        sdpMid: event.candidate.sdpMid,
                        sdpMLineIndex: event.candidate.sdpMLineIndex,
                        usernameFragment: event.candidate.usernameFragment
                    }));
                }
            };

            peerConnection.oniceconnectionstatechange = () => {
                console.log('ICE connection state:', peerConnection.iceConnectionState);
                connectionStatus.set(`ICE: ${peerConnection.iceConnectionState}`);
            };

            peerConnection.onconnectionstatechange = () => {
                console.log('Connection state:', peerConnection.connectionState);
                connectionStatus.set(`Connection: ${peerConnection.connectionState}`);
            };

            peerConnection.onsignalingstatechange = () => {
                console.log('Signaling state:', peerConnection.signalingState);
            };

            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            console.log('Sending SDP offer:', offer);
            ws.send(JSON.stringify({ type: 'offer', sdp: offer.sdp }));

        } catch (error) {
            if (error instanceof Error) {
                console.error('Error setting up peer connection:', error.message);
                connectionStatus.set(`Error: ${error.message}`);
            } else {
                console.error('Unknown error setting up peer connection');
                connectionStatus.set('Unknown error setting up peer connection');
            }
        }
    }

    async function handleSDP(sdp: RTCSessionDescriptionInit) {
        console.log('Handling SDP:', sdp);
        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
            console.log('Set remote description successfully');
            
            if (sdp.type === 'offer') {
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                console.log('Sending SDP answer:', answer);
                ws.send(JSON.stringify({ type: 'answer', sdp: answer.sdp }));
            }

            while (iceCandidatesQueue.length > 0) {
                const candidate = iceCandidatesQueue.shift();
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                console.log('Added queued ICE candidate');
            }
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error handling SDP:', error.message);
                connectionStatus.set(`SDP Error: ${error.message}`);
            } else {
                console.error('Unknown error handling SDP');
                connectionStatus.set('Unknown SDP error');
            }
        }
    }

    async function handleICECandidate(candidateMessage: RTCIceCandidateInit) {
        console.log('Handling ICE candidate:', candidateMessage);
        try {
            if (peerConnection.remoteDescription && peerConnection.remoteDescription.type) {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidateMessage));
                console.log('Added ICE candidate successfully');
            } else {
                iceCandidatesQueue.push(candidateMessage);
                console.log('Queued ICE candidate');
            }
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error adding ICE candidate:', error.message);
                connectionStatus.set(`ICE Error: ${error.message}`);
            } else {
                console.error('Unknown error adding ICE candidate');
                connectionStatus.set('Unknown ICE error');
            }
        }
    }
</script>

<style>
    video {
        width: 300px;
        height: 200px;
        margin: 10px;
        background-color: #ddd;
    }
    .status {
        margin-top: 10px;
        font-weight: bold;
    }
</style>

<div>
    <video id="localVideo" autoplay muted playsinline title="Local video stream"></video>
    <video id="remoteVideo" autoplay playsinline title="Remote video stream"></video>
</div>

<div class="status">Connection Status: {$connectionStatus}</div>