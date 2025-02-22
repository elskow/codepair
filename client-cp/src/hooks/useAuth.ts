import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { apiClient } from "../services/apiClient";
import type {
	LoginRequest,
	LoginResponse,
	RegisterRequest,
	User,
} from "../types/auth";

export function useAuth() {
	const queryClient = useQueryClient();

	// Query for getting current user
	const userQuery = useQuery({
		queryKey: ["user"],
		queryFn: async () => {
			const token = localStorage.getItem("token");
			if (!token) return null;
			try {
				return await apiClient.get<User>("/auth/me");
			} catch (error) {
				localStorage.removeItem("token");
				return null;
			}
		},
		staleTime: Number.POSITIVE_INFINITY,
	});

	// Login mutation
	const loginMutation = useMutation({
		mutationFn: async (credentials: LoginRequest) => {
			const response = await apiClient.post<LoginResponse>(
				"/auth/login",
				credentials,
			);
			localStorage.setItem("token", response.token);
			return response;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["user"] });
		},
	});

	// Register mutation
	const registerMutation = useMutation({
		mutationFn: (data: RegisterRequest) =>
			apiClient.post<void>("/auth/register", data),
	});

	// Logout function
	const logout = useCallback(() => {
		localStorage.removeItem("token");
		queryClient.setQueryData(["user"], null);
		queryClient.invalidateQueries();
	}, [queryClient]);

	return {
		user: userQuery.data,
		isLoading: userQuery.isLoading,
		isAuthenticated: !!userQuery.data,
		login: loginMutation,
		register: registerMutation,
		logout,
	};
}
