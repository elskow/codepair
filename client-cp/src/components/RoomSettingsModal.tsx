import { useState } from "react";
import type { Room, RoomSettings } from "../types/auth";
import { Check, X } from "lucide-react";

interface RoomSettingsModalProps {
	room: Room;
	onClose: () => void;
	onUpdate: (settings: RoomSettings) => Promise<void>;
}

export function RoomSettingsModal({
	room,
	onClose,
	onUpdate,
}: RoomSettingsModalProps) {
	const [candidateName, setCandidateName] = useState(room.candidateName);
	const [isActive, setIsActive] = useState(room.isActive);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		try {
			await onUpdate({
				candidateName,
				isActive,
			});
			onClose();
		} catch (error) {
			console.error("Failed to update settings:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 overflow-y-auto">
			{/* Backdrop */}
			<div className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" />

			{/* Modal */}
			<div className="flex min-h-full items-center justify-center p-4">
				<div className="relative w-full max-w-md transform overflow-hidden bg-[#262626] shadow-xl transition-all">
					{/* Header */}
					<div className="flex items-center justify-between border-b border-[#393939] p-4">
						<h2 className="text-[#f4f4f4] text-lg font-normal">
							Room Settings
						</h2>
						<button
							type="button"
							onClick={onClose}
							className="flex h-8 w-8 items-center justify-center text-[#8d8d8d] hover:text-[#f4f4f4] hover:bg-[#353535] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0f62fe] focus:ring-offset-2 focus:ring-offset-[#262626]"
						>
							<X size={20} />
							<span className="sr-only">Close</span>
						</button>
					</div>

					{/* Form */}
					<form onSubmit={handleSubmit} className="p-6">
						<div className="space-y-6">
							{/* Candidate Name Input */}
							<div className="relative">
								<input
									type="text"
									id="candidateName"
									value={candidateName}
									onChange={(e) => setCandidateName(e.target.value)}
									placeholder=" "
									className="peer h-10 w-full border-0 border-b border-[#525252] bg-transparent px-0 text-[#f4f4f4] placeholder-transparent focus:border-b-2 focus:border-[#0f62fe] focus:outline-none focus:ring-0"
								/>
								<label
									htmlFor="candidateName"
									className="absolute left-0 -top-3.5 text-xs text-[#8d8d8d] transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-[#8d8d8d] peer-placeholder-shown:top-2 peer-focus:-top-3.5 peer-focus:text-xs peer-focus:text-[#0f62fe]"
								>
									Candidate Name
								</label>
							</div>

							{/* Active Status Checkbox */}
							<div className="relative">
								<label className="group inline-flex items-center gap-3 cursor-pointer select-none">
									<div className="relative">
										<input
											type="checkbox"
											checked={isActive}
											onChange={(e) => setIsActive(e.target.checked)}
											className="sr-only peer"
										/>
										<div
											className="h-4 w-4 border border-[#525252] bg-transparent transition-all
                                  group-hover:border-[#8d8d8d]
                                  peer-checked:border-[#0f62fe] peer-checked:bg-[#0f62fe]
                                  peer-checked:group-hover:bg-[#0353e9] peer-checked:group-hover:border-[#0353e9]
                                  peer-focus:border-[#0f62fe] peer-focus:ring-2 peer-focus:ring-[#0f62fe] peer-focus:ring-offset-2 peer-focus:ring-offset-[#262626]"
										>
											<Check
												size={14}
												className="text-[#161616] opacity-0 peer-checked:opacity-100 transition-opacity"
												strokeWidth={3}
											/>
										</div>
									</div>
									<span className="text-sm text-[#c6c6c6] group-hover:text-[#f4f4f4] transition-colors">
										Room is active
									</span>
								</label>
							</div>
						</div>

						{/* Actions */}
						<div className="mt-8 flex justify-end gap-3">
							<button
								type="button"
								onClick={onClose}
								className="inline-flex h-8 items-center justify-center px-4 text-sm text-[#f4f4f4]
                           hover:bg-[#353535] focus:bg-[#353535]
                           transition-colors focus:outline-none focus:ring-2 focus:ring-[#0f62fe] focus:ring-offset-2 focus:ring-offset-[#262626]"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={isSubmitting}
								className="inline-flex h-8 items-center justify-center px-4 text-sm text-white
                           bg-[#0f62fe] hover:bg-[#0353e9] focus:bg-[#0353e9]
                           disabled:bg-[#8d8d8d] disabled:cursor-not-allowed
                           transition-colors focus:outline-none focus:ring-2 focus:ring-[#0f62fe] focus:ring-offset-2 focus:ring-offset-[#262626]"
							>
								{isSubmitting ? (
									<>
										<div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
										Saving...
									</>
								) : (
									"Save Changes"
								)}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
