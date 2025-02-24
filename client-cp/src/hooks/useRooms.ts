import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../services/apiClient";
import type { JoinRoomResponse, Room, RoomSettings } from "../types/auth";
import { useAuth } from "./useAuth";

export function useRooms() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const roomsQuery = useQuery({
    queryKey: ["rooms"],
    queryFn: () => apiClient.get<Room[]>("/rooms"),
    initialData: [] as Room[],
    enabled: isAuthenticated,
    retry: 3,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

  const createRoomMutation = useMutation({
    mutationFn: (candidateName: string) =>
      apiClient.post<Room>("/rooms", { candidateName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });

  const updateRoomSettingsMutation = useMutation({
    mutationFn: ({
      roomId,
      settings,
    }: {
      roomId: string;
      settings: RoomSettings;
    }) => apiClient.patch(`/rooms/${roomId}/settings`, settings),
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

  const joinRoomMutation = useMutation<JoinRoomResponse, Error, string>({
    mutationFn: (token: string) =>
      apiClient.get<JoinRoomResponse>(`/rooms/join?token=${token}`),
  });

  const deleteRoomMutation = useMutation({
    mutationFn: (roomId: string) => apiClient.delete(`/rooms/${roomId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });

  return {
    rooms: roomsQuery.data ?? [],
    isLoading: roomsQuery.isLoading,
    error: roomsQuery.error,
    createRoom: createRoomMutation.mutate,
    updateRoomSettings: updateRoomSettingsMutation.mutate,
    deleteRoom: deleteRoomMutation.mutateAsync,
    joinRoom: joinRoomMutation.mutateAsync,
    endRoom: endRoomMutation.mutate,
    refetchRooms: () => queryClient.invalidateQueries({ queryKey: ["rooms"] }),
  };
}
