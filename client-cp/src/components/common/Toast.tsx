import {
	CheckCircle,
	ClipboardCheck,
	Network,
	Plus,
	Save,
	Trash2,
	X,
	XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Toast as ToastType, ToastAction } from "../../types/toast";

interface ToastProps extends ToastType {
	onDismiss: (id: string) => void;
	action: ToastAction;
}

const actionIcons = {
	copy: ClipboardCheck,
	create: Plus,
	update: Save,
	delete: Trash2,
	network: Network,
} as const;

const variantStyles = {
	success: {
		background: "bg-[#161616]",
		border: "border-l-[#42be65]",
		iconColor: "text-[#42be65]",
		progressBar: "bg-[#42be65]",
	},
	error: {
		background: "bg-[#161616]",
		border: "border-l-[#fa4d56]",
		iconColor: "text-[#fa4d56]",
		progressBar: "bg-[#fa4d56]",
	},
	warning: {
		background: "bg-[#161616]",
		border: "border-l-[#f1c21b]",
		iconColor: "text-[#f1c21b]",
		progressBar: "bg-[#f1c21b]",
	},
	info: {
		background: "bg-[#161616]",
		border: "border-l-[#0f62fe]",
		iconColor: "text-[#0f62fe]",
		progressBar: "bg-[#0f62fe]",
	},
};

const DEFAULT_DURATION = 2000;

export function Toast({
	id,
	type,
	action,
	title,
	message,
	duration,
	onDismiss,
}: ToastProps) {
	const [isExiting, setIsExiting] = useState(false);
	const [isEntering, setIsEntering] = useState(true);
	const styles = variantStyles[type];
	const Icon =
		actionIcons[action] || (type === "error" ? XCircle : CheckCircle);
	const TOAST_DURATION = duration || DEFAULT_DURATION;

	useEffect(() => {
		const enterTimer = setTimeout(() => {
			setIsEntering(false);
		}, 200);

		const exitTimer = setTimeout(() => {
			setIsExiting(true);
			setTimeout(() => onDismiss(id), 200);
		}, TOAST_DURATION);

		return () => {
			clearTimeout(enterTimer);
			clearTimeout(exitTimer);
		};
	}, [id, TOAST_DURATION, onDismiss]);

	return (
		<div
			className={`
        group relative flex w-[400px] items-start gap-4
        shadow-lg border-l-4 border border-[#393939]
        transition-all duration-200 overflow-hidden
        ${styles.background} ${styles.border}
        ${
					isEntering
						? "translate-x-full opacity-0"
						: isExiting
							? "translate-x-full opacity-0"
							: "translate-x-0 opacity-100"
				}
      `}
			style={{
				animation: isEntering ? "slideIn 200ms ease-out forwards" : undefined,
			}}
		>
			{/* Progress bar */}
			<div
				className={`absolute bottom-0 left-0 h-[2px] ${styles.progressBar}`}
				style={{
					width: "100%",
					transform: "scaleX(1)",
					transformOrigin: "left",
					transition: `transform ${TOAST_DURATION}ms linear`,
					animation: `shrink ${TOAST_DURATION}ms linear forwards`,
				}}
			/>

			<div className="flex items-start gap-4 p-4 w-full">
				<Icon size={20} className={`shrink-0 ${styles.iconColor}`} />

				<div className="flex-1 min-w-0">
					<div className="text-sm font-medium text-[#f4f4f4] mb-1">{title}</div>
					{message && (
						<div className="text-sm text-[#8d8d8d] line-clamp-2">{message}</div>
					)}
				</div>

				<button
					type="button"
					onClick={() => setIsExiting(true)}
					className="shrink-0 -mt-1 -mr-2 flex h-8 w-8 items-center justify-center rounded-full text-[#8d8d8d] hover:text-[#f4f4f4] hover:bg-[#353535] transition-colors"
				>
					<X size={16} />
					<span className="sr-only">Dismiss</span>
				</button>
			</div>
		</div>
	);
}
