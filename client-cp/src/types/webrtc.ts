export type WebRTCMessageType = "offer" | "answer" | "ice_candidate";

export interface BaseWebRTCMessage {
	type: WebRTCMessageType;
	roomId: string;
}

export interface SDPMessage extends BaseWebRTCMessage {
	type: "offer" | "answer";
	sdp: string;
}

export interface ICEMessage extends BaseWebRTCMessage {
	type: "ice_candidate";
	candidate: RTCIceCandidateInit;
}

export type WebRTCMessage = SDPMessage | ICEMessage;

export interface EditorMessage {
	type: "code" | "sync";
	code: string;
	language: string;
	roomId: string;
}

export interface ConnectionState {
	status: string;
	error?: Error;
}
