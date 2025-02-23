import { AlertTriangle, X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

interface RoomStateProps {
	type: "invalid" | "ended" | "error";
	title: string;
	message: string;
}

export function RoomState({ type, title, message }: RoomStateProps) {
	const navigate = useNavigate();

	const getIconStyles = (type: RoomStateProps["type"]) => {
		switch (type) {
			case "invalid":
				return "bg-[#ff838910] text-[#ff8389] border border-[#ff8389]";
			case "ended":
				return "bg-[#8d8d8d10] text-[#8d8d8d] border border-[#8d8d8d]";
			case "error":
				return "bg-[#fa4d5610] text-[#fa4d56] border border-[#fa4d56]";
		}
	};

	return (
		<div className="min-h-screen bg-[#161616] flex items-center justify-center p-4">
			<div className="bg-[#262626] w-full max-w-[400px] border border-[#393939]">
				{/* Header */}
				<div className="flex items-center h-12 px-4 border-b border-[#393939] bg-[#262626]">
					<h2 className="text-sm font-normal text-[#f4f4f4]">Room Status</h2>
				</div>

				{/* Content */}
				<div className="p-4 flex flex-col items-center text-center">
					<div
						className={`
            inline-flex items-center justify-center w-12 h-12 mb-6 rounded-full
            ${getIconStyles(type)}
          `}
					>
						{type === "invalid" && (
							<AlertTriangle size={24} className="stroke-[1.5]" />
						)}
						{type === "ended" && <X size={24} className="stroke-[1.5]" />}
						{type === "error" && (
							<AlertTriangle size={24} className="stroke-[1.5]" />
						)}
					</div>

					<div className="space-y-2">
						<h3 className="text-[#f4f4f4] text-lg font-light">{title}</h3>
						<p className="text-[#8d8d8d] text-sm leading-5">{message}</p>
					</div>
				</div>

				{/* Footer */}
				<div className="flex justify-end px-4 py-4 border-t border-[#393939] bg-[#262626]">
					<button
						type="button"
						onClick={() => navigate({ to: "/" })}
						className="inline-flex items-center h-[32px] px-4 text-xs font-medium
                     bg-[#0f62fe] text-white border border-transparent
                     hover:bg-[#0353e9] active:bg-[#002d9c]
                     focus:outline-none focus:ring-2 focus:ring-[#0f62fe] focus:ring-offset-2 focus:ring-offset-[#262626]
                     disabled:bg-[#8d8d8d] disabled:cursor-not-allowed
                     transition-colors"
					>
						Return to Dashboard
					</button>
				</div>
			</div>
		</div>
	);
}
