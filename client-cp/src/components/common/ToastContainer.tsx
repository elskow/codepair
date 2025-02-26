import type { Toast as ToastType } from "../../types/toast";
import { Toast } from "./Toast";

interface ToastContainerProps {
	toasts: ToastType[];
	onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
	return (
		<div className="fixed bottom-0 right-0 z-50 flex flex-col items-end gap-3 p-6">
			{toasts.map((toast, index) => (
				<div
					key={toast.id}
					style={{
						animationDelay: `${index * 100}ms`,
					}}
				>
					<Toast {...toast} onDismiss={onDismiss} />
				</div>
			))}
		</div>
	);
}
