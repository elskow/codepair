import { useState } from "react";
import Chat from "./Chat.tsx";
import Log from "./Log.tsx";
import type { ChatMessage } from "../../types/chat.ts";

interface TabViewProps {
	chatState: {
		messages: ChatMessage[];
		isLoading: boolean;
		error: Error | null;
		sendMessage: (content: string) => void;
	};
}

const TabView = ({ chatState }: TabViewProps) => {
	const [activeTab, setActiveTab] = useState<"chat" | "log">("chat");

	return (
		<div className="h-full flex flex-col bg-[#262626] rounded-lg overflow-hidden">
			{/* Tab buttons */}
			<div className="flex border-b border-[#393939]">
				<button
					type="button"
					className={`
            flex-1 px-4 py-2 text-sm font-medium
            ${
							activeTab === "chat"
								? "bg-[#393939] text-white"
								: "text-[#8d8d8d] hover:text-white hover:bg-[#353535]"
						}
            transition-colors
          `}
					onClick={() => setActiveTab("chat")}
				>
					Chat
				</button>
				<button
					type="button"
					className={`
            flex-1 px-4 py-2 text-sm font-medium
            ${
							activeTab === "log"
								? "bg-[#393939] text-white"
								: "text-[#8d8d8d] hover:text-white hover:bg-[#353535]"
						}
            transition-colors
          `}
					onClick={() => setActiveTab("log")}
				>
					Log
				</button>
			</div>

			<div className="flex-1 overflow-hidden relative">
				{activeTab === "chat" ? <Chat chatState={chatState} /> : <Log />}
			</div>
		</div>
	);
};

export default TabView;
