import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "../types/chat";

interface ChatHook {
	messages: ChatMessage[];
	isLoading: boolean;
	error: Error | null;
	sendMessage: (content: string) => void;
	cleanup: () => void;
}

export const useChat = (
	url: string | null,
	roomId: string,
	token: string | null,
	userName: string,
): ChatHook => {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const ws = useRef<WebSocket | null>(null);
	const reconnectTimeout = useRef<NodeJS.Timeout>();
	const isComponentMounted = useRef(true); // Add this ref

	useEffect(() => {
		isComponentMounted.current = true; // Set on mount

		if (!url || !token) return;

		const connectWebSocket = () => {
			try {
				const socket = new WebSocket(`${url}/${roomId}?token=${token}`);
				ws.current = socket;

				socket.onopen = () => {
					if (isComponentMounted.current) {
						setIsLoading(false);
					}
				};

				socket.onmessage = (event) => {
					if (isComponentMounted.current) {
						const data = JSON.parse(event.data);
						if (data.type === "chat") {
							setMessages((prev) => [...prev, data.message]);
						} else if (data.type === "history") {
							setMessages(data.messages || []);
						}
					}
				};

				socket.onclose = () => {
					if (isComponentMounted.current) {
						ws.current = null;
						reconnectTimeout.current = setTimeout(connectWebSocket, 3000);
					}
				};

				socket.onerror = (error) => {
					if (isComponentMounted.current) {
						console.error("Chat WebSocket Error:", error);
						setError(new Error("Failed to connect to chat"));
					}
				};
			} catch (err) {
				if (isComponentMounted.current) {
					setError(
						err instanceof Error ? err : new Error("Failed to connect to chat"),
					);
					setIsLoading(false);
				}
			}
		};

		connectWebSocket();

		return () => {
			isComponentMounted.current = false;
			if (ws.current) {
				ws.current.close();
				ws.current = null;
			}
			if (reconnectTimeout.current) {
				clearTimeout(reconnectTimeout.current);
			}
		};
	}, [url, roomId, token]);

	const sendMessage = (content: string) => {
		if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
			setError(new Error("Chat connection is not open"));
			return;
		}

		const chatEvent = {
			type: "chat",
			userName,
			content,
		};

		ws.current.send(JSON.stringify(chatEvent));
	};

	const cleanup = useCallback(() => {
		isComponentMounted.current = false;
		if (ws.current) {
			ws.current.close();
			ws.current = null;
		}
		if (reconnectTimeout.current) {
			clearTimeout(reconnectTimeout.current);
		}
		setMessages([]);
		setIsLoading(true);
		setError(null);
	}, []);

	return {
		messages,
		isLoading,
		error,
		sendMessage,
		cleanup,
	};
};
