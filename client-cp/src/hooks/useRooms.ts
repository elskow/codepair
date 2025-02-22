import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {apiClient} from "../services/apiClient";
import type {Room} from "../types/auth";

export function useRooms() {
	const queryClient = useQueryClient();

	const roomsQuery = useQuery({
		queryKey: ["rooms"],
		queryFn: () => apiClient.get<Room[]>("/rooms"),
	});

	const createRoomMutation = useMutation({
		mutationFn: (candidateName: string) =>
			apiClient.post<Room>("/rooms", { candidateName }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["rooms"] });
		},
	});

	const endRoomMutation = useMutation({
		mutationFn: (roomId: string) => apiClient.post(`/rooms/${roomId}/end`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["rooms"] });
		},
	});

	const joinRoomMutation = useMutation<Room, Error, string>({
		mutationFn: (token: string) =>
			apiClient.get<Room>(`/rooms/join?token=${token}`),
	});

	return {
		rooms: roomsQuery.data ?? [],
		isLoading: roomsQuery.isLoading,
		error: roomsQuery.error,
		createRoom: createRoomMutation.mutate,
		endRoom: endRoomMutation.mutate,
		joinRoom: joinRoomMutation.mutateAsync,
	};
}
