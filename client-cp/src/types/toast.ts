// Base types for toast configuration
export type ToastVariant = "success" | "error" | "warning" | "info";

export type ToastAction =
	| "copy"
	| "create"
	| "update"
	| "delete"
	| "network"
	| "auth";

export type ToastResult = ToastVariant;

// Configuration type for toasts
export interface ToastActionConfig {
	type: ToastVariant;
	title: string;
	message?: string;
	duration?: number;
	data?: Record<string, unknown>;
}

// Type-safe way to define toast configurations
export type ToastConfigMap = {
	[K in ToastAction]: {
		success?: ToastActionConfig;
		error?: ToastActionConfig;
	};
};

// Update the Toast interface to include action
export interface Toast extends Omit<ToastActionConfig, "type"> {
	id: string;
	type: ToastVariant;
	action: ToastAction;
}
