import { ArrowRight, Circle, Copy, LinkIcon, Settings } from "lucide-react";
import type { Room } from "../../types/auth";

interface RoomItemProps {
	room: Room;
	onCopyLink: (room: Room) => void;
	onSettingsClick: (room: Room) => void;
	onJoinRoom: () => void;
}

export function RoomItem({
	room,
	onCopyLink,
	onSettingsClick,
	onJoinRoom,
}: RoomItemProps) {
	return (
		<div className="bg-[#262626] p-4 border border-[#393939] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-0">
			<div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 lg:gap-4 w-full lg:w-auto">
				<div className="flex items-center gap-2">
					<Circle
						size={8}
						fill={room.isActive ? "#42be65" : "#525252"}
						className={room.isActive ? "text-[#42be65]" : "text-[#525252]"}
					/>
					<span className="text-[#f4f4f4] text-sm font-medium">
						{room.candidateName}
					</span>
				</div>
				<div className="flex items-center gap-2 text-[#8d8d8d]">
					<LinkIcon size={14} />
					<span className="text-xs break-all">{room.id}</span>
				</div>
			</div>

			<div className="flex items-center gap-2 w-full lg:w-auto">
				<button
					type="button"
					onClick={() => onCopyLink(room)}
					className="flex-1 lg:flex-none h-8 px-3 bg-transparent border border-[#393939] text-[#f4f4f4] text-sm hover:bg-[#353535] hover:border-[#525252] focus:outline-2 focus:outline-offset-2 focus:outline-[#0f62fe] flex items-center justify-center gap-2 transition-colors"
				>
					<Copy size={14} />
					<span>Copy Link</span>
				</button>

				{room.isActive && (
					<button
						type="button"
						onClick={onJoinRoom}
						className="flex-1 lg:flex-none h-8 px-3 bg-[#0f62fe] text-white text-sm hover:bg-[#0353e9] focus:outline-2 focus:outline-offset-2 focus:outline-[#ffffff] active:bg-[#002d9c] flex items-center justify-center gap-2 transition-colors"
					>
						<ArrowRight size={14} />
						<span>Join Room</span>
					</button>
				)}

				<button
					type="button"
					onClick={() => onSettingsClick(room)}
					className="h-8 w-8 flex items-center justify-center text-[#8d8d8d] hover:text-[#f4f4f4] hover:bg-[#353535] focus:outline-2 focus:outline-offset-2 focus:outline-[#0f62fe] transition-colors shrink-0"
				>
					<Settings size={14} />
				</button>
			</div>
		</div>
	);
}
