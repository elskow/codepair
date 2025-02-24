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
	interviewer?: {
		email: string;
		name: string;
	};
}

export interface RoomSettings {
	candidateName: string;
	isActive: boolean;
	settings: {
		interview: {
			scheduledTime: string;
			duration: number;
		};
		technical: {
			languages: string[];
		};
	};
}

export interface JoinRoomResponse {
	id: string;
	roomId: string;
	candidateName: string;
	isActive: boolean;
}
