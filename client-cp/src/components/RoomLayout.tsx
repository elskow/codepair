import type { Room } from "../types/auth";
import type { ReactNode } from "react";
import { RoomState } from "./RoomState";
import { Loader } from "lucide-react";

interface RoomLayoutProps {
	room: Room | null;
	isLoading: boolean;
	isError: boolean;
	error?: Error;
	children: ReactNode;
}

export function RoomLayout({
	room,
	isLoading,
	isError,
	error,
	children,
}: RoomLayoutProps) {
	if (isLoading) {
		return (
			<div className="min-h-screen bg-[#161616] flex items-center justify-center">
				<div className="bg-[#262626] w-full max-w-[400px] border border-[#393939]">
					<div className="flex items-center h-12 px-4 border-b border-[#393939]">
						<h2 className="text-sm font-normal text-[#f4f4f4]">Loading Room</h2>
					</div>
					<div className="p-8 flex flex-col items-center">
						<Loader size={24} className="text-[#0f62fe] animate-spin mb-4" />
						<p className="text-sm text-[#8d8d8d]">
							Loading room information...
						</p>
					</div>
				</div>
			</div>
		);
	}

	if (isError) {
		return (
			<RoomState
				type="error"
				title="Unable to Load Room"
				message={
					error?.message ||
					"An error occurred while trying to access this room."
				}
			/>
		);
	}

	if (!room) {
		return (
			<RoomState
				type="invalid"
				title="Room Not Found"
				message="This interview room does not exist or you don't have permission to access it."
			/>
		);
	}

	if (!room.isActive) {
		return (
			<RoomState
				type="ended"
				title="Interview Session Ended"
				message="This interview session has been completed and is no longer active."
			/>
		);
	}

	return <>{children}</>;
}
