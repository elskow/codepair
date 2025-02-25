import { useCallback, useEffect, useRef, useState } from "react";

interface NotesPeerHook {
	content: string;
	handleContentChange: (text: string, html: string) => void;
	cleanup: () => void;
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
	const [content, setContent] = useState("");
	const prevContentRef = useRef(content);
	const reconnectTimeout = useRef<NodeJS.Timeout>();
	const wsRef = useRef<WebSocket | null>(null);
	const isComponentMounted = useRef(true);

	useEffect(() => {
		isComponentMounted.current = true;

		if (!url || !token) return;

		const connectWebSocket = () => {
			try {
				const socket = new WebSocket(`${url}/${roomId}?token=${token}`);
				wsRef.current = socket;

				socket.onmessage = (event) => {
					if (isComponentMounted.current) {
						try {
							const message = JSON.parse(event.data) as NotesMessage;
							if (message.type === "content" || message.type === "sync") {
								setContent(message.html);
							}
						} catch (err) {
							console.error("Failed to parse notes WebSocket message:", err);
						}
					}
				};

				socket.onclose = () => {
					if (isComponentMounted.current) {
						wsRef.current = null;
						reconnectTimeout.current = setTimeout(connectWebSocket, 3000);
					}
				};

				socket.onerror = (error) => {
					if (isComponentMounted.current) {
						console.error("Notes WebSocket Error:", error);
					}
				};
			} catch (err) {
				console.error("Failed to connect to notes WebSocket:", err);
			}
		};

		connectWebSocket();

		return () => {
			isComponentMounted.current = false;
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
			return;
		}

		const message: NotesMessage = {
			type: "content",
			content: text,
			html: html,
		};
		wsRef.current.send(JSON.stringify(message));
		prevContentRef.current = html;
	}, []);

	const cleanup = useCallback(() => {
		isComponentMounted.current = false;
		if (wsRef.current) {
			wsRef.current.close();
			wsRef.current = null;
		}
		if (reconnectTimeout.current) {
			clearTimeout(reconnectTimeout.current);
		}
		setContent("");
	}, []);

	return {
		content,
		handleContentChange,
		cleanup,
	};
};

export default useNotesPeer;
