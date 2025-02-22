import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { apiClient, ApiError } from "../services/apiClient";
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
			try {
				return await apiClient.get<User>("/auth/me");
			} catch (error) {
				if (
					error instanceof ApiError &&
					(error.status === 401 || error.status === 403)
				) {
					localStorage.removeItem("token");
				}
				throw error;
			}
		},
		enabled: !!localStorage.getItem("token"),
		staleTime: Number.POSITIVE_INFINITY,
		retry: false,
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
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["user"] });
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
		isError: userQuery.isError,
		error: userQuery.error,
		isAuthenticated: !!userQuery.data,
		login: loginMutation,
		register: registerMutation,
		logout,
	};
}
