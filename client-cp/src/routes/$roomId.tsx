import { Editor } from "@monaco-editor/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Camera, CameraOff, Mic, MicOff } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Clock from "../components/rooms/Clock.tsx";
import { RoomLayout } from "../components/rooms/RoomLayout.tsx";
import TabView from "../components/rooms/TabView.tsx";
import VideoStream from "../components/rooms/VideoStream.tsx";
import WriteSpace from "../components/rooms/WriteSpace.tsx";
import { SUPPORTED_LANGUAGES } from "../config/languages";
import { useAuth } from "../hooks/useAuth";
import { useChat } from "../hooks/useChat.ts";
import useEditorPeer from "../hooks/useEditorPeer";
import useNotesPeer from "../hooks/useNotesPeer.ts";
import { useRooms } from "../hooks/useRooms";
import useWebRTC from "../hooks/useWebRTC";
import { apiClient } from "../services/apiClient";
import type { Room as RoomType } from "../types/auth";

export const Route = createFileRoute("/$roomId")({
	component: RoomComponent,
});

const URL = import.meta.env.VITE_WS_URL || "http://localhost:8001/";

function RoomComponent() {
	const { roomId } = Route.useParams();
	const [room, setRoom] = useState<RoomType | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const navigate = useNavigate();
	const { isAuthenticated, user } = useAuth();
	const { joinRoom, endRoom } = useRooms();
	const [isCandidate, setIsCandidate] = useState(false);

	const webRTC = useWebRTC(
		room?.isActive ? `${URL}/videochat` : null,
		roomId,
		room?.isActive ? room.token : null,
	);

	const editorPeer = useEditorPeer(
		room?.isActive ? `${URL}/editor` : null,
		roomId,
		room?.isActive ? room.token : null,
	);

	const chatPeer = useChat(
		room?.isActive ? `${URL}/chat` : null,
		roomId,
		room?.isActive ? room.token : null,
		user?.name || "Anonymous",
	);

	const notesPeer = useNotesPeer(
		room?.isActive ? `${URL}/notes` : null,
		roomId,
		room?.isActive ? room.token : null,
	);

	const { localStream, remoteStream, toggleWebcam, toggleMicrophone } =
		room?.isActive
			? webRTC
			: {
					localStream: null,
					remoteStream: null,
					toggleWebcam: () => {},
					toggleMicrophone: () => {},
				};

	const { code, language, handleEditorChange, handleLanguageChange } =
		room?.isActive
			? editorPeer
			: {
					code: "",
					language: "javascript",
					handleEditorChange: () => {},
					handleLanguageChange: () => {},
				};

	const [isWebcamOn, setIsWebcamOn] = useState(true);
	const [isMicrophoneOn, setIsMicrophoneOn] = useState(true);
	const [editorWidth, setEditorWidth] = useState<number>(50);
	const isDragging = useRef<boolean>(false);
	const mainContentRef = useRef<HTMLDivElement>(null);
	const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

	const handleToggleWebcam = () => {
		toggleWebcam();
		setIsWebcamOn(!isWebcamOn);
	};

	const handleToggleMicrophone = () => {
		toggleMicrophone();
		setIsMicrophoneOn(!isMicrophoneOn);
	};

	const handleMouseDown = (e: React.MouseEvent) => {
		e.preventDefault();
		isDragging.current = true;
		document.body.style.cursor = "col-resize";
		document.body.classList.add("resizing");
		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);
	};

	const handleMouseMove = useCallback((e: MouseEvent) => {
		if (!isDragging.current || !mainContentRef.current) return;

		const containerRect = mainContentRef.current.getBoundingClientRect();
		const mouseX = e.clientX - containerRect.left;
		const totalWidth = containerRect.width;

		let percentage = (mouseX / totalWidth) * 100;
		percentage = 100 - percentage;
		const newWidth = Math.min(Math.max(percentage, 30), 70);
		setEditorWidth(newWidth);
	}, []);

	const handleMouseUp = useCallback(() => {
		isDragging.current = false;
		document.body.style.cursor = "default";
		document.body.classList.remove("resizing");
		document.removeEventListener("mousemove", handleMouseMove);
		document.removeEventListener("mouseup", handleMouseUp);
	}, [handleMouseMove]);

	const initializeRoom = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		const urlParams = new URLSearchParams(window.location.search);
		const roomToken = urlParams.get("token");

		try {
			if (isAuthenticated) {
				// Case 1: Authenticated interviewer - get room from list
				const rooms = await apiClient.get<RoomType[]>("/rooms");
				const currentRoom = rooms.find((r) => r.id === roomId);
				if (currentRoom) {
					setRoom(currentRoom);
					return;
				}
				throw new Error("Room not found");
			}

			if (roomToken) {
				// Case 2: Candidate with token - use joinRoom from useRooms hook
				const response = await joinRoom(roomToken);
				const now = new Date().toISOString();
				setRoom({
					id: response.roomId,
					candidateName: response.candidateName,
					isActive: response.isActive,
					token: roomToken,
					createdAt: response.createdAt || now,
					updatedAt: response.updatedAt || now,
				});
				setIsCandidate(true);
				return;
			}

			// Case 3: No token - check if we should wait for auth
			const storedRoomId = localStorage.getItem("lastVisitedRoom");
			if (storedRoomId === roomId) {
				// Don't redirect yet, wait for auth to complete
				return;
			}
			throw new Error("Authentication required");
		} catch (err) {
			setError(err instanceof Error ? err : new Error("Failed to load room"));
			if (!isAuthenticated) {
				// Only redirect if this isn't the last visited room
				const storedRoomId = localStorage.getItem("lastVisitedRoom");
				if (storedRoomId !== roomId) {
					await navigate({ to: "/login" });
				}
			}
		} finally {
			setIsLoading(false);
		}
	}, [roomId, isAuthenticated, navigate, joinRoom]);

	const handleEndInterview = async () => {
		if (!room) return;
		try {
			endRoom(room.id);

			// Clean up all WebSocket connections
			webRTC.cleanup();
			editorPeer.cleanup();
			chatPeer.cleanup();
			notesPeer.cleanup();

			setRoom(null);
			localStorage.removeItem("lastVisitedRoom");
			await navigate({ to: "/" });
		} catch (error) {
			console.error("Failed to end interview:", error);
		}
	};

	useEffect(() => {
		if (
			!isAuthenticated &&
			localStorage.getItem("lastVisitedRoom") === roomId
		) {
			// If this is the last visited room and we're not authenticated yet,
			// don't initialize until authentication is complete
			return;
		}
		initializeRoom().then((r) => console.debug("Room initialized:", r));
	}, [initializeRoom, isAuthenticated, roomId]);

	useEffect(() => {
		const handleResize = () => {
			setIsMobile(window.innerWidth < 768);
			if (window.innerWidth < 768) {
				setEditorWidth(100);
			} else {
				setEditorWidth(50);
			}
		};

		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	useEffect(() => {
		// Save current room ID when entering
		if (room?.isActive && isAuthenticated) {
			localStorage.setItem("lastVisitedRoom", roomId);
		}
		return () => {
			if (!room?.isActive) {
				localStorage.removeItem("lastVisitedRoom");
				webRTC.cleanup();
				editorPeer.cleanup();
				chatPeer.cleanup();
				notesPeer.cleanup();
			}
		};
	}, [
		room?.isActive,
		webRTC.cleanup,
		editorPeer.cleanup,
		chatPeer.cleanup,
		notesPeer.cleanup,
		isAuthenticated,
		roomId,
	]);

	// Check if the user is allowed to end the interview
	const showEndButton = !isCandidate && isAuthenticated && room?.isActive;

	return (
		<RoomLayout
			room={room}
			isLoading={isLoading}
			isError={!!error}
			error={error ?? undefined}
		>
			<div className="min-h-screen bg-[#161616] text-[#f4f4f4]">
				<div className="h-screen flex flex-col md:flex-row">
					{/* Left Column - Video and TabView */}
					<div className="w-80 md:h-screen bg-[#262626] border-r border-[#393939] flex flex-col">
						<div className="p-4 border-b border-[#393939]">
							<div className="space-y-2 w-full">
								<div className="flex items-center justify-between">
									<h1 className="text-sm font-medium text-[#f4f4f4]">
										Room: {roomId}
									</h1>

									<div className="flex items-center gap-2">
										{/* Status Tag */}
										<span
											className={`inline-flex items-center h-[32px] px-3 text-xs font-medium
													  ${
															room?.isActive
																? "bg-[#054f1750] text-[#42be65] border border-[#42be65]"
																: "bg-[#525252] text-[#c6c6c6] border border-[#6f6f6f]"
														}
													`}
										>
											{room?.isActive ? "Active" : "Ended"}
										</span>
									</div>
								</div>

								{room && (
									<p className="text-xs text-[#8d8d8d]">
										Candidate: {room.candidateName}
									</p>
								)}
							</div>
						</div>
						<div className="flex flex-col flex-1 overflow-hidden">
							{/* Video Section */}
							<div className="p-4 space-y-4">
								<div className="space-y-2">
									<p className="text-xs text-[#c6c6c6] font-medium">
										Your video
									</p>
									<VideoStream
										stream={localStream}
										muted={true}
										title="Local video stream"
										className="rounded-sm border border-[#393939] w-full h-32 shadow-lg bg-[#161616]"
									/>
								</div>
								<div className="space-y-2">
									<p className="text-xs text-[#c6c6c6] font-medium">
										Peer video
									</p>
									<VideoStream
										stream={remoteStream}
										title="Remote video stream"
										className="rounded-sm border border-[#393939] w-full h-32 shadow-lg bg-[#161616]"
									/>
								</div>
								{/* Controls */}
								<div className="flex justify-center space-x-3 py-2">
									<button
										type="button"
										onClick={handleToggleWebcam}
										className={` p-2.5 rounded-full ${isWebcamOn ? "bg-[#393939] hover:bg-[#4d4d4d]" : "bg-[#da1e28] hover:bg-[#bc1a23]"} transition-colors focus:outline-none focus:ring-2 focus:ring-[#0f62fe] focus:ring-offset-2 focus:ring-offset-[#262626]`}
									>
										{isWebcamOn ? (
											<Camera size={18} />
										) : (
											<CameraOff size={18} />
										)}
									</button>
									<button
										type="button"
										onClick={handleToggleMicrophone}
										className={` p-2.5 rounded-full ${isMicrophoneOn ? "bg-[#393939] hover:bg-[#4d4d4d]" : "bg-[#da1e28] hover:bg-[#bc1a23]"} transition-colors focus:outline-none focus:ring-2 focus:ring-[#0f62fe] focus:ring-offset-2 focus:ring-offset-[#262626]`}
									>
										{isMicrophoneOn ? <Mic size={18} /> : <MicOff size={18} />}
									</button>
								</div>
							</div>

							{/* Chat/Log Section */}
							<div className="flex-1 px-4">
								<TabView chatState={chatPeer} />
							</div>
						</div>

						{/* Clock */}
						<div className="p-4 border-t border-[#393939] bg-[#262626]">
							<div className="flex items-center justify-between">
								<Clock />
								{showEndButton && (
									<button
										type="button"
										onClick={handleEndInterview}
										className=" inline-flex items-center h-[32px] px-4 text-xs font-medium bg-[#da1e28] text-white border border-transparent hover:bg-[#bc1a23] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#fa4d56] focus:ring-offset-[#262626] disabled:opacity-50 disabled:cursor-not-allowed"
									>
										End Interview
									</button>
								)}
							</div>
						</div>
					</div>

					{/* Main Content Area */}
					<div
						ref={mainContentRef}
						className="flex-1 flex flex-col md:flex-row min-w-0 bg-[#262626]"
					>
						{/* Writing Space */}
						<div
							style={{ width: isMobile ? "100%" : `${100 - editorWidth}%` }}
							className={`relative min-w-[30%] ${isMobile ? "h-1/2" : "h-full"} border-b md:border-b-0 md:border-r border-[#393939] bg-[#161616]`}
						>
							<WriteSpace notesState={notesPeer} />
							{/* Resizer */}
							{!isMobile && (
								<div
									className="absolute right-0 top-0 w-1 h-full bg-[#393939] hover:bg-[#0f62fe] cursor-col-resize transition-colors"
									onMouseDown={handleMouseDown}
									style={{ userSelect: "none", touchAction: "none" }}
								/>
							)}
						</div>

						{/* Code Editor */}
						<div
							style={{
								width: isMobile ? "100%" : `${editorWidth}%`,
								height: isMobile ? "50%" : "100%",
							}}
							className="flex flex-col min-w-[30%] bg-[#161616]"
						>
							<div className="flex items-center justify-between p-4 border-b border-[#393939]">
								<h2 className="text-sm font-medium text-[#f4f4f4]">
									Code Editor
								</h2>
								<select
									value={language}
									onChange={handleLanguageChange}
									className=" px-3 py-1.5 text-sm bg-[#262626] rounded-none border border-[#525252] hover:bg-[#353535] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0f62fe] appearance-none pr-8 relative"
									style={{
										backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23f4f4f4'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
										backgroundRepeat: "no-repeat",
										backgroundPosition: "right 0.5rem center",
										backgroundSize: "1.5em 1.5em",
									}}
								>
									{SUPPORTED_LANGUAGES.map((lang) => (
										<option key={lang.value} value={lang.value}>
											{lang.label}
										</option>
									))}
								</select>
							</div>
							<div className="flex-1 bg-[#161616]">
								<Editor
									height="100%"
									language={language}
									value={code}
									onChange={handleEditorChange}
									theme="vs-dark"
									options={{
										automaticLayout: true,
										minimap: { enabled: false },
										scrollBeyondLastLine: false,
										wordWrap: "on",
										tabSize: 2,
										padding: { top: 16, bottom: 16 },
										fontFamily: '"IBM Plex Mono", monospace',
										fontSize: 14,
									}}
								/>
							</div>
						</div>
					</div>
				</div>
			</div>
		</RoomLayout>
	);
}
