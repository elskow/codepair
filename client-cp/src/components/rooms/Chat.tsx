import {formatDistance} from "date-fns";
import {Loader} from "lucide-react";
import type React from "react";
import {useCallback, useEffect, useRef, useState} from "react";
import {useAuth} from "../../hooks/useAuth";
import {useChat} from "../../hooks/useChat";

interface ChatProps {
	roomId: string;
	token: string | null;
}

const Chat = ({ roomId, token }: ChatProps) => {
	const { user } = useAuth();
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const [newMessage, setNewMessage] = useState("");

	const url = import.meta.env.VITE_WS_URL || "ws://localhost:8001";
	const { messages, isLoading, error, sendMessage } = useChat(
		url,
		roomId,
		token,
		user?.name || "Anonymous",
	);

	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	useEffect(() => {
		scrollToBottom();
	}, [scrollToBottom]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!newMessage.trim()) return;

		sendMessage(newMessage.trim());
		setNewMessage("");
		inputRef.current?.focus();
	};

	if (isLoading) {
		return (
			<div className="absolute inset-0 flex items-center justify-center">
				<div className="flex flex-col items-center space-y-2">
					<Loader size={24} className="text-[#0f62fe] animate-spin" />
					<p className="text-sm text-[#8d8d8d]">Connecting to chat...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="absolute inset-0 flex items-center justify-center">
				<div className="flex flex-col items-center space-y-2 text-center px-4">
					<p className="text-sm text-[#fa4d56]">{error.message}</p>
					<p className="text-xs text-[#8d8d8d]">
						Please try refreshing the page.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="absolute inset-0 flex flex-col">
			<div className="flex-1 overflow-y-auto custom-scrollbar">
				<div className="px-2">
					{messages.map((msg) => (
						<div
							key={msg.id}
							className={`group py-2 border-b border-[#393939] last:border-0 ${
								msg.userName === user?.name ? "bg-[#262626]" : ""
							}`}
						>
							<div className="flex items-baseline justify-between mb-1">
								<span className="text-xs font-medium text-[#f4f4f4]">
									{msg.userName}
								</span>
								<span className="text-[11px] text-[#8d8d8d]">
									{formatDistance(new Date(msg.timestamp), new Date(), {
										addSuffix: true,
									})}
								</span>
							</div>
							<p className="text-sm text-[#e0e0e0] break-words">
								{msg.content}
							</p>
						</div>
					))}
					<div ref={messagesEndRef} />
				</div>
			</div>

			<div className="flex-shrink-0 py-3 border-t border-[#393939] bg-[#262626]">
				<form onSubmit={handleSubmit}>
					<input
						ref={inputRef}
						type="text"
						value={newMessage}
						onChange={(e) => setNewMessage(e.target.value)}
						placeholder="Type a message..."
						className="w-full h-8 px-3 bg-[#161616] text-[#f4f4f4] text-sm
                     border border-[#393939] hover:border-[#525252]
                     focus:border-[#393939] focus:outline-none
                     placeholder-[#6f6f6f] transition-colors"
					/>
				</form>
			</div>
		</div>
	);
};

export default Chat;
