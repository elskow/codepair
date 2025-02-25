import {useCallback, useEffect, useRef, useState} from "react";

interface NotesPeerHook {
	content: string;
	handleContentChange: (text: string, html: string) => void;
}

interface NotesMessage {
	type: "content" | "sync";
	content: string;
	html: string;
}

const useNotesPeer = (
	url: string | null,
	roomId: string,
	token: string | null,
): NotesPeerHook => {
	const [_, setWs] = useState<WebSocket | null>(null);
	const [content, setContent] = useState("");
	const prevContentRef = useRef(content);
	const reconnectTimeout = useRef<NodeJS.Timeout>();
	const wsRef = useRef<WebSocket | null>(null);

	useEffect(() => {
		if (!url || !token) return;

		const connectWebSocket = () => {
			try {
				console.log("Connecting to notes WebSocket...");
				const socket = new WebSocket(`${url}/notes/${roomId}?token=${token}`);
				wsRef.current = socket;
				setWs(socket);

				socket.onopen = () => {
					console.log("Notes WebSocket Connected");
				};

				socket.onmessage = (event) => {
					try {
						const message = JSON.parse(event.data) as NotesMessage;
						console.log("Received notes message:", message);

						if (message.type === "content" || message.type === "sync") {
							setContent(message.html);
							prevContentRef.current = message.html;
						}
					} catch (err) {
						console.error("Failed to parse notes WebSocket message:", err);
					}
				};

				socket.onclose = () => {
					console.log("Notes WebSocket Disconnected");
					wsRef.current = null;
					setWs(null);

					if (reconnectTimeout.current) {
						clearTimeout(reconnectTimeout.current);
					}
					reconnectTimeout.current = setTimeout(connectWebSocket, 3000);
				};

				socket.onerror = (error) => {
					console.error("Notes WebSocket Error:", error);
				};
			} catch (err) {
				console.error("Failed to connect to notes WebSocket:", err);
			}
		};

		connectWebSocket();

		return () => {
			if (wsRef.current) {
				wsRef.current.close();
				wsRef.current = null;
			}
			if (reconnectTimeout.current) {
				clearTimeout(reconnectTimeout.current);
			}
		};
	}, [url, roomId, token]);

	const handleContentChange = useCallback((text: string, html: string) => {
		if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
			console.log("WebSocket not ready, cannot send update");
			return;
		}

		const message: NotesMessage = {
			type: "content",
			content: text,
			html: html,
		};

		console.log("Sending notes update:", message);
		wsRef.current.send(JSON.stringify(message));
		prevContentRef.current = html;
	}, []);

	return {
		content,
		handleContentChange,
	};
};

export default useNotesPeer;
