export interface Interviewer {
	id: string;
	name: string;
	email: string;
	role: "interviewer" | "lead";
	isActive: boolean;
}

export interface CreateInterviewerRequest {
	name: string;
	email: string;
	password: string;
	role: "interviewer" | "lead";
}

export interface UpdateInterviewerRequest {
	id: string;
	role?: string;
	isActive?: boolean;
}
