export interface NotesMessage {
	type: "content" | "sync";
	content: string;
	html?: string;
}
