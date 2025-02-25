import type { Room } from "../../types/auth";
import { RoomItem } from "./RoomItem.tsx";

interface RoomListProps {
	rooms: Room[];
	onCopyLink: (room: Room) => Promise<void>;
	onSettingsClick: (room: Room) => void;
	onJoinRoom?: (room: Room) => void;
}

export function RoomList({
	rooms,
	onCopyLink,
	onSettingsClick,
	onJoinRoom,
}: RoomListProps) {
	if (rooms.length === 0) {
		return (
			<div className="text-center text-[#8d8d8d] py-8">No rooms found</div>
		);
	}

	return (
		<div className="space-y-4">
			{rooms.map((room) => (
				<RoomItem
					key={room.id}
					room={room}
					onCopyLink={onCopyLink}
					onSettingsClick={onSettingsClick}
					onJoinRoom={() => onJoinRoom?.(room)}
				/>
			))}
		</div>
	);
}
