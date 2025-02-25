import {createLazyFileRoute, useNavigate} from "@tanstack/react-router";
import {useEffect, useState} from "react";
import {CreateRoomForm} from "../components/index/CreateRoomForm";
import {RoomList} from "../components/index/RoomList";
import {RoomSearch} from "../components/index/RoomSearch";
import {RoomSettingsModal} from "../components/index/RoomSettingsModal.tsx";
import {Header} from "../components/layout/Header";
import {MobileMenu} from "../components/layout/MobileMenu";
import {useToast} from "../context/ToastContext.tsx";
import {useAuth} from "../hooks/useAuth";
import {useRooms} from "../hooks/useRooms";
import type {Room, RoomSettings} from "../types/auth";

export const Route = createLazyFileRoute("/")({
	component: Index,
});

function Index() {
	const navigate = useNavigate();
	const { show } = useToast();

	const [candidateName, setCandidateName] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [settingsRoom, setSettingsRoom] = useState<Room | null>(null);

	const { isAuthenticated, isLoading: isLoadingAuth, user } = useAuth();
	const {
		rooms,
		isLoading,
		createRoom,
		deleteRoom,
		updateRoomSettings,
		refetchRooms,
	} = useRooms();

	useEffect(() => {
		if (!isLoadingAuth) {
			if (!isAuthenticated) {
				navigate({ to: "/login" });
			} else {
				// Check for last visited room
				const lastVisitedRoom = localStorage.getItem("lastVisitedRoom");
				if (lastVisitedRoom) {
					navigate({ to: `/${lastVisitedRoom}` });
					// Optionally clear the stored room ID
					// localStorage.removeItem('lastVisitedRoom');
				}
			}
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
			try {
				await createRoom(candidateName);
				setCandidateName("");
				show("create", "success", {
					title: "Room created",
					message: `Interview room for ${candidateName} has been created`,
					duration: 3000,
				});
			} catch (error) {
				show("create", "error", {
					title: "Creation failed",
					message: "Failed to create the room. Please try again.",
					duration: 4000,
				});
			}
		}
	};

	const handleCopyLink = async (room: Room) => {
		const joinUrl = `${window.location.origin}/${room.id}?token=${room.token}`;
		try {
			await navigator.clipboard.writeText(joinUrl);
			show("copy", "info", {
				title: "Link copied",
				message: "Interview room link has been copied to clipboard",
				duration: 2000,
			});
		} catch (error) {
			show("copy", "error", {
				title: "Copy failed",
				message: "Could not copy the room link to clipboard",
				duration: 4000,
			});
		}
	};

	const handleUpdateSettings = async (settings: RoomSettings) => {
		if (!settingsRoom) return;

		try {
			await updateRoomSettings({
				roomId: settingsRoom.id,
				settings,
			});
			setSettingsRoom(null);
			show("update", "warning", {
				title: "Settings updated",
				message: "Room settings have been successfully updated",
				duration: 3000,
			});
		} catch (error) {
			show("update", "error", {
				title: "Update failed",
				message: "Failed to update room settings. Please try again.",
				duration: 4000,
			});
		}
	};

	const handleDeleteRoom = async (roomId: string) => {
		try {
			await deleteRoom(roomId);
			setSettingsRoom(null);
			show("delete", "error", {
				title: "Room deleted",
				message: "The interview room has been successfully deleted",
				duration: 3000,
			});
		} catch (error) {
			if (error instanceof Error && error.message.includes("network")) {
				show("network", "error", {
					title: "Network Error",
					message: "Please check your internet connection and try again.",
					duration: 5000,
				});
			} else {
				show("delete", "error", {
					title: "Delete failed",
					message: "Failed to delete the room. Please try again.",
					duration: 4000,
				});
			}
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
					onJoinRoom={(room) => navigate({ to: `/${room.id}` })}
				/>
			</main>

			{settingsRoom && (
				<RoomSettingsModal
					room={settingsRoom}
					onClose={() => setSettingsRoom(null)}
					onUpdate={handleUpdateSettings}
					onDelete={() => handleDeleteRoom(settingsRoom.id)}
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
