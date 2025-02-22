import { useNavigate } from "@tanstack/react-router";
import type { Room } from "../../types/auth";
import { RoomItem } from "./RoomItem.tsx";

interface RoomListProps {
	rooms: Room[];
	onCopyLink: (room: Room) => void;
	onSettingsClick: (room: Room) => void;
}

export function RoomList({
	rooms,
	onCopyLink,
	onSettingsClick,
}: RoomListProps) {
	const navigate = useNavigate();

	if (rooms.length === 0) {
		return (
			<div className="text-center py-8">
				<p className="text-[#8d8d8d]">No rooms found</p>
			</div>
		);
	}

	return (
		<div className="grid gap-4">
			{rooms.map((room) => (
				<RoomItem
					key={room.id}
					room={room}
					onCopyLink={onCopyLink}
					onSettingsClick={onSettingsClick}
					onJoinRoom={() =>
						navigate({ to: `/${room.id}`, search: { token: room.token } })
					}
				/>
			))}
		</div>
	);
}
