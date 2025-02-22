import type React from "react";
import {useEffect, useState} from "react";
import {createLazyFileRoute, useNavigate} from "@tanstack/react-router";
import {useRooms} from "../hooks/useRooms";
import {useAuth} from "../hooks/useAuth";
import type {Room} from "../types/auth.ts";
import {
	ArrowRight,
	Circle,
	Copy,
	Link as LinkIcon,
	LogOut,
	Menu,
	Settings,
	UserCircle,
	UserPlus,
	X
} from 'lucide-react';


export const Route = createLazyFileRoute("/")({
	component: Index,
});

function Index() {
	const [candidateName, setCandidateName] = useState("");
	const navigate = useNavigate();
	const { isAuthenticated, user} = useAuth();
	const { rooms, isLoading, createRoom } = useRooms();
	const [searchQuery, setSearchQuery] = useState("");
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);


	useEffect(() => {
		if (!isAuthenticated) {
			navigate({ to: "/login" });
		}
	}, [isAuthenticated, navigate]);

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

	const filteredRooms = rooms.filter(room =>
		room.candidateName.toLowerCase().includes(searchQuery.toLowerCase())
	);

	if (isLoading) {
		return (
			<div className="min-h-screen bg-[#161616] flex items-center justify-center">
				<div className="text-[#f4f4f4]">Loading...</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#161616]">
			{/* Header */}
			<header className="h-12 bg-[#262626] border-b border-[#393939] flex items-center justify-between px-4">
				<div className="flex items-center gap-8">
					<h1 className="text-[#f4f4f4] text-sm font-normal">CodePair</h1>
					{/* Desktop Navigation */}
					<nav className="hidden md:flex items-center gap-4">
						<button
							type="button"
							className="text-sm text-[#f4f4f4] hover:text-[#f4f4f4] hover:bg-[#353535] px-3 py-1.5 rounded-none transition-colors"
						>
							Dashboard
						</button>
						<button
							type="button"
							className="text-sm text-[#8d8d8d] hover:text-[#f4f4f4] hover:bg-[#353535] px-3 py-1.5 rounded-none transition-colors"
						>
							Settings
						</button>
					</nav>
				</div>

				{/* User Info and Logout */}
				<div className="flex items-center gap-4">
					<div className="hidden sm:flex items-center gap-2">
						<UserCircle size={20} className="text-[#8d8d8d]" />
						<span className="text-[#f4f4f4] text-sm">{user?.email}</span>
					</div>
					<button
						type="button"
						onClick={() => navigate({ to: '/logout' })}
						className="hidden sm:flex items-center justify-center w-8 h-8 text-[#8d8d8d] hover:text-[#f4f4f4] hover:bg-[#353535] transition-colors"
					>
						<LogOut size={18} />
					</button>

					{/* Mobile Menu Button */}
					<button
						type="button"
						onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
						className="md:hidden flex items-center justify-center w-8 h-8 text-[#8d8d8d] hover:text-[#f4f4f4] hover:bg-[#353535]"
					>
						{isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
					</button>
				</div>
			</header>

			{/* Mobile Menu */}
			{isMobileMenuOpen && (
				<div className="md:hidden bg-[#262626] border-b border-[#393939]">
					<nav className="flex flex-col p-4 space-y-2">
						<button
							type="button"
							className="text-sm text-[#f4f4f4] hover:bg-[#353535] px-3 py-2 w-full text-left"
						>
							Dashboard
						</button>
						<button
							type="button"
							className="text-sm text-[#8d8d8d] hover:bg-[#353535] px-3 py-2 w-full text-left"
						>
							Settings
						</button>
						<div className="pt-2 border-t border-[#393939]">
							<button
								type="button"
								onClick={() => navigate({ to: '/logout' })}
								className="text-sm text-[#fa4d56] hover:bg-[#353535] px-3 py-2 w-full text-left flex items-center gap-2"
							>
								<LogOut size={16} />
								Logout
							</button>
						</div>
					</nav>
				</div>
			)}

			<div className="max-w-[1200px] mx-auto p-4 sm:p-8">
				{/* Page Header */}
				<div className="mb-6 sm:mb-8">
					<h2 className="text-[#f4f4f4] text-xl sm:text-[2rem] font-light mb-1">Interview Rooms</h2>
					<p className="text-[#8d8d8d] text-sm sm:text-base">Manage your interview sessions</p>
				</div>

				{/* Action Bar */}
				<div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 lg:mb-8">
					<div className="w-full">
						<label htmlFor="search-rooms" className="sr-only">
							Search rooms
						</label>
						<input
							id="search-rooms"
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Search rooms"
							className="w-full lg:w-[400px] h-10 pl-4 pr-10 bg-[#262626] text-[#f4f4f4] border border-[#393939] focus:outline-none focus:border-[#ffffff] text-sm placeholder-[#525252]"
						/>
					</div>

					<form onSubmit={handleCreateRoom} className="flex w-full gap-2">
						<div className="relative flex-1 lg:flex-none">
							<label
								htmlFor="candidate-name"
								className="absolute left-4 -top-2 px-1 text-xs text-[#8d8d8d] bg-[#262626] transition-all"
							>
								Candidate Name
							</label>
							<input
								id="candidate-name"
								type="text"
								value={candidateName}
								onChange={(e) => setCandidateName(e.target.value)}
								placeholder=" "
								className="w-full lg:w-[300px] h-10 bg-[#262626] text-[#f4f4f4] border border-[#393939] px-4 text-sm focus:outline-none focus:border-[#ffffff] placeholder-transparent"
							/>
						</div>
						<button
							type="submit"
							className="h-10 px-4 bg-[#0f62fe] text-white hover:bg-[#0353e9] active:bg-[#002d9c] focus:outline-2 focus:outline-offset-2 focus:outline-[#ffffff] disabled:bg-[#8d8d8d] disabled:cursor-not-allowed text-sm font-normal flex items-center gap-2 transition-colors whitespace-nowrap"
						>
							<UserPlus size={18} />
							<span>Create Room</span>
						</button>
					</form>
				</div>

				{/* Rooms Grid */}
				<div className="grid gap-4">
					{filteredRooms.map((room) => (
						<div
							key={room.id}
							className="bg-[#262626] p-4 border border-[#393939] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-0"
						>
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
									onClick={() => handleCopyLink(room)}
									className="flex-1 lg:flex-none h-8 px-3 bg-transparent border border-[#393939] text-[#f4f4f4] text-sm hover:bg-[#353535] hover:border-[#525252] focus:outline-2 focus:outline-offset-2 focus:outline-[#0f62fe] flex items-center justify-center gap-2 transition-colors"
								>
									<Copy size={14} />
									<span>Copy Link</span>
								</button>

								{room.isActive && (
									<button
										type="button"
										onClick={() => navigate({
											to: `/${room.id}`,
											search: { token: room.token },
										})}
										className="flex-1 lg:flex-none h-8 px-3 bg-[#0f62fe] text-white text-sm hover:bg-[#0353e9] focus:outline-2 focus:outline-offset-2 focus:outline-[#ffffff] active:bg-[#002d9c] flex items-center justify-center gap-2 transition-colors"
									>
										<ArrowRight size={14} />
										<span>Join Room</span>
									</button>
								)}

								<button
									type="button"
									className="h-8 w-8 flex items-center justify-center text-[#8d8d8d] hover:text-[#f4f4f4] hover:bg-[#353535] focus:outline-2 focus:outline-offset-2 focus:outline-[#0f62fe] transition-colors shrink-0"
								>
									<Settings size={14} />
								</button>
							</div>
						</div>
					))}

					{filteredRooms.length === 0 && (
						<div className="text-center py-8">
							<p className="text-[#8d8d8d]">No rooms found</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}