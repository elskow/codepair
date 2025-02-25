import {createContext, type ReactNode, useCallback, useContext, useState,} from "react";
import {ToastContainer} from "../components/common/ToastContainer.tsx";
import type {Toast, ToastAction, ToastActionConfig, ToastResult, ToastVariant,} from "../types/toast";

interface ToastContextValue {
	show: (
		action: ToastAction,
		result: ToastResult,
		config?: Partial<ToastActionConfig>,
	) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<Toast[]>([]);

	const show = useCallback(
		(
			action: ToastAction,
			result: ToastResult,
			config?: Partial<ToastActionConfig>,
		) => {
			const id = Math.random().toString(36).substr(2, 9);
			const type: ToastVariant = result; // Direct assignment since they're the same type

			// Adjust default durations based on result type
			const defaultDuration =
				result === "success"
					? 2000
					: result === "error"
						? 4000
						: result === "warning"
							? 3000
							: 3000; // info

			const toast: Toast = {
				id,
				type,
				action,
				title: config?.title || `${action} ${result}`,
				message: config?.message,
				duration: config?.duration || defaultDuration,
				...(config?.data || {}),
			};

			setToasts((prev) => [...prev, toast]);
		},
		[],
	);

	const dismiss = useCallback((id: string) => {
		setToasts((prev) => prev.filter((toast) => toast.id !== id));
	}, []);

	return (
		<ToastContext.Provider value={{ show }}>
			{children}
			<ToastContainer toasts={toasts} onDismiss={dismiss} />
		</ToastContext.Provider>
	);
}

export function useToast() {
	const context = useContext(ToastContext);
	if (!context) {
		throw new Error("useToast must be used within ToastProvider");
	}
	return context;
}
