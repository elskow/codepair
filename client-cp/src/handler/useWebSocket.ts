import { useEffect, useRef, useState, useCallback } from 'react';

type WebSocketMessage = {
    type: 'offer' | 'answer' | 'ice_candidate';
    sdp?: string;
    candidate?: RTCIceCandidateInit;
};

const useWebSocket = (url: string) => {
    const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
    const ws = useRef<WebSocket | null>(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;
    const reconnectInterval = 5000; // 5 seconds
    const connectionTimeout = 10000; // 10 seconds

    const sendMessage = useCallback((message: WebSocketMessage) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(message));
        } else {
            console.error('WebSocket is not open. Unable to send message:', message);
            setConnectionStatus('WebSocket is not open. Unable to send message.');
        }
    }, []);

    const connect = useCallback(() => {
        if (ws.current) {
            ws.current.close();
        }

        ws.current = new WebSocket(url);

        const connectionTimeoutId = setTimeout(() => {
            if (ws.current && ws.current.readyState !== WebSocket.OPEN) {
                ws.current.close();
            }
        }, connectionTimeout);

        ws.current.onopen = () => {
            clearTimeout(connectionTimeoutId);
            setConnectionStatus('WebSocket Connected');
            reconnectAttempts.current = 0;
        };

        ws.current.onclose = (event) => {
            clearTimeout(connectionTimeoutId);
            setConnectionStatus(`WebSocket Disconnected (Code: ${event.code}, Reason: ${event.reason || 'No reason provided'})`);
            handleReconnect();
        };

        ws.current.onerror = (error) => {
            console.error('WebSocket error:', error);
            setConnectionStatus('WebSocket Error');
        };

        return () => {
            clearTimeout(connectionTimeoutId);
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                ws.current.close();
            }
        };
    }, [url]);

    const handleReconnect = useCallback(() => {
        if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current += 1;
            setConnectionStatus(`Reconnecting (Attempt ${reconnectAttempts.current}/${maxReconnectAttempts})...`);
            setTimeout(connect, reconnectInterval);
        } else {
            setConnectionStatus('Max reconnection attempts reached. Please check your network connection and refresh the page.');
        }
    }, [connect]);

    useEffect(() => {
        const cleanup = connect();
        return cleanup;
    }, [connect]);

    return {
        connectionStatus,
        sendMessage,
        ws
    };
};

export default useWebSocket;