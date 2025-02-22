import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { apiClient } from "../services/apiClient";
import type { Room } from "../types/auth";

const ROOM_POLL_INTERVAL = 10000; // Poll every 10 seconds

export function useRoomState(roomId: string, token?: string | null) {
	const queryClient = useQueryClient();

	// Query for room state
	const roomQuery = useQuery({
		queryKey: ["room", roomId],
		queryFn: async () => {
			if (token) {
				return apiClient.get<Room>(`/rooms/join?token=${token}`);
			}
			return apiClient.get<Room>(`/rooms/${roomId}`);
		},
		// Poll for room state changes
		refetchInterval: ROOM_POLL_INTERVAL,
		retry: false,
		enabled: !!roomId,
	});

	// Invalidate room query when component unmounts
	useEffect(() => {
		return () => {
			queryClient.invalidateQueries({ queryKey: ["room", roomId] });
		};
	}, [queryClient, roomId]);

	return {
		room: roomQuery.data,
		isLoading: roomQuery.isLoading,
		isError: roomQuery.isError,
		error: roomQuery.error,
	};
}
