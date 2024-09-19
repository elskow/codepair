import { useEffect, useRef } from 'react';

const useWebSocket = (url: string, onMessage: (event: MessageEvent) => void, onOpen: () => void, onClose: () => void) => {
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        ws.current = new WebSocket(url);

        ws.current.onmessage = onMessage;
        ws.current.onopen = onOpen;
        ws.current.onclose = onClose;

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [url, onMessage, onOpen, onClose]);

    const sendMessage = (message: any) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(message));
        }
    };

    return sendMessage;
};

export default useWebSocket;