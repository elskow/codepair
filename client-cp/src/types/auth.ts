export interface User {
	email: string;
	name: string;
}

export interface LoginRequest {
	email: string;
	password: string;
}

export interface LoginResponse {
	token: string;
}

export interface RegisterRequest {
	email: string;
	password: string;
	name: string;
}

export interface Room {
	id: string;
	candidateName: string;
	token: string;
	isActive: boolean;
}

export type JoinRoomFn = (token: string) => Promise<Room>;
