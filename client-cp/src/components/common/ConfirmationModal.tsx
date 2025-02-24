import {X} from "lucide-react";
import type {ReactNode} from "react";

interface ConfirmationModalProps {
	isOpen: boolean;
	title: string;
	message: ReactNode;
	confirmLabel: ReactNode;
	cancelLabel: string;
	variant?: "danger" | "warning" | "primary";
	isProcessing?: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

const variants = {
	danger: {
		button: "text-white bg-[#da1e28] hover:bg-[#bc1a23] active:bg-[#750e13]",
		border: "border-[#da1e28]",
		processing: "border-[#da1e28] border-t-transparent",
	},
	warning: {
		button: "text-white bg-[#f1c21b] hover:bg-[#d2a106] active:bg-[#b28600]",
		border: "border-[#f1c21b]",
		processing: "border-[#f1c21b] border-t-transparent",
	},
	primary: {
		button: "text-white bg-[#0f62fe] hover:bg-[#0353e9] active:bg-[#002d9c]",
		border: "border-[#0f62fe]",
		processing: "border-white border-t-transparent",
	},
};

export function ConfirmationModal({
	isOpen,
	title,
	message,
	confirmLabel,
	cancelLabel,
	variant = "primary",
	isProcessing = false,
	onConfirm,
	onCancel,
}: ConfirmationModalProps) {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-[60] overflow-y-auto">
			<div className="fixed inset-0 bg-[#161616]/70 backdrop-blur-sm transition-opacity" />

			<div className="flex min-h-full items-center justify-center p-4">
				<div className="relative w-full max-w-md transform bg-[#262626] shadow-xl">
					{/* Header */}
					<div className="flex h-12 items-center justify-between border-b border-[#393939] px-4">
						<h3 className="text-[14px] font-semibold leading-5 text-[#f4f4f4]">
							{title}
						</h3>
						<button
							type="button"
							onClick={onCancel}
							className="flex h-8 w-8 items-center justify-center rounded text-[#c6c6c6] hover:bg-[#353535] hover:text-[#f4f4f4]"
						>
							<X size={20} />
							<span className="sr-only">Close</span>
						</button>
					</div>

					{/* Content */}
					<div className="p-4">
						<div className="text-sm text-[#f4f4f4]">{message}</div>
					</div>

					{/* Footer */}
					<div className="flex items-center justify-end space-x-3 border-t border-[#393939] bg-[#262626] px-4 py-4">
						<button
							type="button"
							onClick={onCancel}
							className="h-10 px-4 text-sm font-normal text-[#f4f4f4] transition-all duration-150 ease-in-out hover:bg-[#353535] focus:outline-none focus:ring-2 focus:ring-[#0f62fe] focus:ring-offset-2 focus:ring-offset-[#262626] active:bg-[#4c4c4c]"
						>
							{cancelLabel}
						</button>
						<button
							type="button"
							onClick={onConfirm}
							disabled={isProcessing}
							className={`h-10 px-4 text-sm font-normal transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#262626] disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant].button}`}
						>
							{isProcessing ? (
								<div className="flex items-center space-x-2">
									<div
										className={`h-4 w-4 animate-spin rounded-full border-2 ${variants[variant].processing}`}
									/>
									<span>Processing...</span>
								</div>
							) : (
								confirmLabel
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
