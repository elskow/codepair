export interface User {
	id: string;
	email: string;
	name: string;
	role: "interviewer" | "lead";
	isActive: boolean;
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
	interviewer?: {
		email: string;
		name: string;
	};
	createdAt: string;
	updatedAt: string;
	scheduledTime?: string;
	duration?: number;
	technicalStack?: string[];
}

export interface RoomSettings {
	isActive: boolean;
	candidateName: string;
	scheduledTime?: string;
	duration?: number;
	technicalStack?: string[];
}

export interface JoinRoomResponse {
	id: string;
	roomId: string;
	candidateName: string;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}
