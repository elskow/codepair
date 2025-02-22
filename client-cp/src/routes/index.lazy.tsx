import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "../components/layout/Header";
import { MobileMenu } from "../components/layout/MobileMenu";
import { CreateRoomForm } from "../components/index/CreateRoomForm";
import { RoomList } from "../components/index/RoomList";
import { RoomSearch } from "../components/index/RoomSearch";
import { RoomSettingsModal } from "../components/RoomSettingsModal";
import { useAuth } from "../hooks/useAuth";
import { useRooms } from "../hooks/useRooms";
import type { Room, RoomSettings } from "../types/auth";

export const Route = createLazyFileRoute("/")({
	component: Index,
});

function Index() {
	const navigate = useNavigate();
	const [candidateName, setCandidateName] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [settingsRoom, setSettingsRoom] = useState<Room | null>(null);

	const { isAuthenticated, isLoading: isLoadingAuth, user } = useAuth();
	const { rooms, isLoading, createRoom, updateRoomSettings, refetchRooms } =
		useRooms();

	useEffect(() => {
		if (!isLoadingAuth && !isAuthenticated) {
			navigate({ to: "/login" });
		}
	}, [isLoadingAuth, isAuthenticated, navigate]);

	useEffect(() => {
		if (isAuthenticated && !isLoading) {
			refetchRooms();
		}
	}, [isAuthenticated, refetchRooms, isLoading]);

	if (isLoadingAuth || isLoading) {
		return <LoadingScreen />;
	}

	if (!isAuthenticated) {
		return null;
	}

	const handleCreateRoom = async (e: React.FormEvent) => {
		e.preventDefault();
		if (candidateName.trim()) {
			createRoom(candidateName);
			setCandidateName("");
		}
	};

	const handleCopyLink = async (room: Room) => {
		const joinUrl = `${window.location.origin}/${room.id}?token=${room.token}`;
		try {
			await navigator.clipboard.writeText(joinUrl);
			// TODO: Implement toast notification
			console.log("Room link copied!");
		} catch (error) {
			console.error("Failed to copy link:", error);
		}
	};

	const handleUpdateSettings = async (settings: RoomSettings) => {
		if (!settingsRoom) return;

		try {
			updateRoomSettings({
				roomId: settingsRoom.id,
				settings,
			});
			setSettingsRoom(null);
		} catch (error) {
			console.error("Failed to update room settings:", error);
		}
	};

	const filteredRooms = rooms.filter((room) =>
		room.candidateName.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	return (
		<div className="min-h-screen bg-[#161616]">
			<Header
				user={user}
				isMobileMenuOpen={isMobileMenuOpen}
				setIsMobileMenuOpen={setIsMobileMenuOpen}
			/>
			{isMobileMenuOpen && <MobileMenu />}

			<main className="max-w-[1200px] mx-auto p-4 sm:p-8">
				<PageHeader />

				<div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 lg:mb-8">
					<RoomSearch
						searchQuery={searchQuery}
						setSearchQuery={setSearchQuery}
					/>
					<CreateRoomForm
						candidateName={candidateName}
						setCandidateName={setCandidateName}
						onSubmit={handleCreateRoom}
					/>
				</div>

				<RoomList
					rooms={filteredRooms}
					onCopyLink={handleCopyLink}
					onSettingsClick={setSettingsRoom}
				/>
			</main>

			{settingsRoom && (
				<RoomSettingsModal
					room={settingsRoom}
					onClose={() => setSettingsRoom(null)}
					onUpdate={handleUpdateSettings}
				/>
			)}
		</div>
	);
}

function LoadingScreen() {
	return (
		<div className="min-h-screen bg-[#161616] flex items-center justify-center">
			<div className="text-[#f4f4f4]">Loading...</div>
		</div>
	);
}

function PageHeader() {
	return (
		<div className="mb-6 sm:mb-8">
			<h2 className="text-[#f4f4f4] text-xl sm:text-[2rem] font-light mb-1">
				Interview Rooms
			</h2>
			<p className="text-[#8d8d8d] text-sm sm:text-base">
				Manage your interview sessions
			</p>
		</div>
	);
}
