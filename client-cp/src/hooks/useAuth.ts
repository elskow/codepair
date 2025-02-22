import {useMutation} from "@tanstack/react-query";
import {apiClient} from "../services/apiClient";
import type {LoginRequest, LoginResponse, User} from "../types/auth";
import {useState} from "react";

export function useAuth() {
	const [user] = useState<User | null>(null);

	const loginMutation = useMutation({
		mutationFn: (credentials: LoginRequest) =>
			apiClient.post<LoginResponse>("/auth/login", credentials),
	});

	return {
		login: loginMutation,
		isAuthenticated: !!localStorage.getItem("token"),
		user
	};
}