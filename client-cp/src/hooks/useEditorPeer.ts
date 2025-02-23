import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { EditorMessage } from "../types/webrtc";

interface EditorPeerHook {
	code: string;
	language: string;
	handleEditorChange: (value: string | undefined) => void;
	handleLanguageChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

const useEditorPeer = (
	url: string | null,
	roomId: string,
	token: string | null,
): EditorPeerHook => {
	const [ws, setWs] = useState<WebSocket | null>(null);
	const [code, setCode] = useState("// Start coding...");
	const [language, setLanguage] = useState("javascript");
	const prevCodeRef = useRef(code);

	useEffect(() => {
		if (!url || !token) return;

		const socket = new WebSocket(`${url}/${roomId}?token=${token}`);
		setWs(socket);

		const handleMessage = (event: MessageEvent) => {
			try {
				const message = JSON.parse(event.data) as EditorMessage;
				if (message.type === "code" || message.type === "sync") {
					setCode(message.code);
					setLanguage(message.language);
				}
			} catch (err) {
				console.error("Failed to parse WebSocket message:", err);
			}
		};

		socket.addEventListener("message", handleMessage);

		return () => {
			socket.removeEventListener("message", handleMessage);
			socket.close();
		};
	}, [url, roomId, token]);

	const sendUpdate = useCallback(
		(newCode: string, newLanguage: string) => {
			if (ws?.readyState === WebSocket.OPEN) {
				const message: EditorMessage = {
					type: "code",
					code: newCode,
					language: newLanguage,
					roomId,
				};
				ws.send(JSON.stringify(message));
			}
		},
		[ws, roomId],
	);

	const handleEditorChange = useCallback(
		(value: string | undefined) => {
			if (value !== undefined && value !== prevCodeRef.current) {
				setCode(value);
				sendUpdate(value, language);
				prevCodeRef.current = value;
			}
		},
		[language, sendUpdate],
	);

	const handleLanguageChange = useCallback(
		(event: React.ChangeEvent<HTMLSelectElement>) => {
			const newLanguage = event.target.value;
			setLanguage(newLanguage);
			sendUpdate(code, newLanguage);
		},
		[code, sendUpdate],
	);

	return { code, language, handleEditorChange, handleLanguageChange };
};

export default useEditorPeer;
