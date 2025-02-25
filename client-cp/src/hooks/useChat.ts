import {useEffect, useRef, useState} from "react";
import type {ChatMessage} from "../types/chat";

interface ChatHook {
	messages: ChatMessage[];
	isLoading: boolean;
	error: Error | null;
	sendMessage: (content: string) => void;
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

	useEffect(() => {
		if (!url || !token) return;

		const connectWebSocket = () => {
			try {
				const socket = new WebSocket(`${url}/chat/${roomId}?token=${token}`);
				ws.current = socket;

				socket.onopen = () => {
					console.log("Chat WebSocket Connected");
					setIsLoading(false);
				};

				socket.onmessage = (event) => {
					const data = JSON.parse(event.data);
					if (data.type === "chat") {
						setMessages((prev) => [...prev, data.message]);
					} else if (data.type === "history") {
						setMessages(data.messages || []);
					}
				};

				socket.onclose = () => {
					console.log("Chat WebSocket Disconnected");
					ws.current = null;
					// Attempt to reconnect after 3 seconds
					reconnectTimeout.current = setTimeout(connectWebSocket, 3000);
				};

				socket.onerror = (error) => {
					console.error("Chat WebSocket Error:", error);
					setError(new Error("Failed to connect to chat"));
				};
			} catch (err) {
				setError(
					err instanceof Error ? err : new Error("Failed to connect to chat"),
				);
				setIsLoading(false);
			}
		};

		connectWebSocket();

		return () => {
			if (ws.current) {
				ws.current.close();
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

	return {
		messages,
		isLoading,
		error,
		sendMessage,
	};
};
