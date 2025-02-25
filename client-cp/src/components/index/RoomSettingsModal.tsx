import {
	Calendar,
	Check,
	ChevronDown,
	ChevronUp,
	Trash2,
	X,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import type { Room, RoomSettings } from "../../types/auth.ts";
import { ConfirmationModal } from "../common/ConfirmationModal.tsx";

interface RoomSettingsModalProps {
	room: Room;
	onClose: () => void;
	onDelete?: () => Promise<void>;
	onUpdate: (settings: RoomSettings) => Promise<void>;
}

const PROGRAMMING_LANGUAGES = [
	"JavaScript",
	"Python",
	"Java",
	"C++",
	"Go",
] as const;

const formatDate = (dateString: string) => {
	const date = new Date(dateString);
	return date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};

export function RoomSettingsModal({
	room,
	onClose,
	onUpdate,
	onDelete,
}: RoomSettingsModalProps) {
	const [candidateName, setCandidateName] = useState(room.candidateName);
	const [isActive, setIsActive] = useState(room.isActive);

	const [scheduledTime, setScheduledTime] = useState<string>(() => {
		if (room.scheduledTime) {
			const date = new Date(room.scheduledTime);
			return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
				.toISOString()
				.slice(0, 16);
		}
		return "";
	});
	const [duration, setDuration] = useState(room.duration || 60);
	const [programmingLanguages, setProgrammingLanguages] = useState<string[]>(
		room.technicalStack || [],
	);
	const [isDeleting, setIsDeleting] = useState(false);

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
	const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
	const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
	const [pendingFormData, setPendingFormData] = useState<RoomSettings | null>(
		null,
	);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const formData: RoomSettings = {
			isActive,
			candidateName,
			scheduledTime: scheduledTime
				? new Date(scheduledTime).toISOString()
				: undefined,
			duration,
			technicalStack: programmingLanguages,
		};
		setPendingFormData(formData);
		setShowSaveConfirmation(true);
	};

	const handleConfirmSave = async () => {
		if (!pendingFormData) return;

		setIsSubmitting(true);
		try {
			await onUpdate(pendingFormData);
			onClose();
		} catch (error) {
			console.error("Failed to update settings:", error);
		} finally {
			setIsSubmitting(false);
			setShowSaveConfirmation(false);
		}
	};

	const handleDelete = async () => {
		if (!onDelete) return;

		setIsDeleting(true);
		try {
			await onDelete();
			onClose();
		} catch (error) {
			console.error("Failed to delete room:", error);
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<>
			<div className="fixed inset-0 z-50 overflow-y-auto">
				<div className="fixed inset-0 bg-[#161616]/70 backdrop-blur-sm transition-opacity" />

				<div className="flex min-h-full items-center justify-center p-4">
					<div className="relative w-full max-w-2xl transform bg-[#262626] shadow-xl">
						{/* Header */}
						<div className="border-b border-[#393939]">
							{/* Title and close button */}
							<div className="flex h-12 items-center justify-between px-4">
								<div className="flex items-center space-x-3">
									<h2 className="text-[14px] font-semibold leading-5 text-[#f4f4f4]">
										Room configuration
									</h2>
								</div>
								<button
									type="button"
									onClick={onClose}
									className="flex h-8 w-8 items-center justify-center rounded text-[#c6c6c6] hover:bg-[#353535] hover:text-[#f4f4f4]"
								>
									<X size={20} />
									<span className="sr-only">Close</span>
								</button>
							</div>

							{/* Timestamps */}
							<div className="px-4 py-2 bg-[#161616] flex items-center space-x-6 text-xs">
								<div className="flex items-center space-x-2">
									<span className="text-[#8d8d8d]">Created:</span>
									<time dateTime={room.createdAt} className="text-[#c6c6c6]">
										{formatDate(room.createdAt)}
									</time>
								</div>
								<div className="flex items-center space-x-2">
									<span className="text-[#8d8d8d]">Last modified:</span>
									<time dateTime={room.updatedAt} className="text-[#c6c6c6]">
										{formatDate(room.updatedAt)}
									</time>
								</div>
							</div>
						</div>

						{/* Form */}
						<form onSubmit={handleSubmit}>
							<div className="divide-y divide-[#393939]">
								{/* Basic Information */}
								<div className="p-4">
									<fieldset>
										<legend className="text-[12px] font-normal text-[#c6c6c6] mb-4">
											Basic information
										</legend>
										<div className="space-y-4">
											<div className="relative">
												<input
													type="text"
													id="candidateName"
													value={candidateName}
													onChange={(e) => setCandidateName(e.target.value)}
													className="w-full h-10 bg-[#161616] border border-[#525252] px-4 text-[#f4f4f4] text-sm transition-colors duration-150 ease-in-out placeholder-[#6f6f6f] hover:border-[#4c4c4c] focus:outline-none focus:border-[#0f62fe] focus:ring-1 focus:ring-[#0f62fe]"
													placeholder="Enter candidate name"
												/>
												<label
													htmlFor="candidateName"
													className="absolute -top-2 left-2 bg-[#262626] px-1 text-xs text-[#c6c6c6]"
												>
													Candidate name
												</label>
											</div>

											{/* Time and Duration */}
											<div className="grid grid-cols-2 gap-4">
												<div className="relative group">
													<input
														type="datetime-local"
														id="scheduledTime"
														value={scheduledTime}
														onChange={(e) => setScheduledTime(e.target.value)}
														className="w-full h-10 bg-[#161616] border border-[#525252] pl-4 pr-10 text-[#f4f4f4] text-sm transition-colors duration-150 ease-in-out hover:border-[#4c4c4c] focus:outline-none focus:border-[#0f62fe] focus:ring-1 focus:ring-[#0f62fe] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:h-10 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
													/>
													<label
														htmlFor="scheduledTime"
														className="absolute -top-2 left-2 bg-[#262626] px-1 text-xs text-[#c6c6c6]"
													>
														Schedule time
													</label>
													<div className="absolute right-0 top-0 h-10 w-10 flex items-center justify-center pointer-events-none text-[#8d8d8d] group-hover:text-[#f4f4f4] transition-colors duration-150">
														<Calendar size={16} />
													</div>
												</div>

												<div className="relative">
													<input
														type="number"
														id="duration"
														value={duration}
														onChange={(e) =>
															setDuration(Number(e.target.value))
														}
														className="w-full h-10 bg-[#161616] border border-[#525252] pl-4 pr-10 text-[#f4f4f4] text-sm  transition-colors duration-150 ease-in-out  hover:border-[#4c4c4c]  focus:outline-none focus:border-[#0f62fe] focus:ring-1 focus:ring-[#0f62fe]  [&::-webkit-inner-spin-button]:appearance-none  [&::-webkit-outer-spin-button]:appearance-none"
													/>
													<label
														htmlFor="duration"
														className="absolute -top-2 left-2 bg-[#262626] px-1 text-xs text-[#c6c6c6]"
													>
														Duration (minutes)
													</label>

													<div className="absolute right-0 top-0 h-full flex flex-col border-l border-[#525252] divide-y divide-[#525252]">
														<button
															type="button"
															onClick={() => setDuration((prev) => prev + 1)}
															className="flex items-center justify-center w-10 h-5 text-[#8d8d8d] hover:text-[#f4f4f4] hover:bg-[#353535] transition-colors"
														>
															<ChevronUp size={16} />
														</button>
														<button
															type="button"
															onClick={() =>
																setDuration((prev) => Math.max(0, prev - 1))
															}
															className="flex items-center justify-center w-10 h-5 text-[#8d8d8d] hover:text-[#f4f4f4] hover:bg-[#353535] transition-colors"
														>
															<ChevronDown size={16} />
														</button>
													</div>
												</div>
											</div>
										</div>
									</fieldset>
								</div>

								{/* Technical Requirements */}
								<div className="p-4">
									<fieldset>
										<legend className="text-[12px] font-normal text-[#c6c6c6] mb-4">
											Technical requirements
										</legend>
										<div className="space-y-6">
											{/* Languages */}
											<div>
												<span className="block text-xs text-[#c6c6c6] mb-2">
													Programming languages
												</span>
												<div className="grid grid-cols-2 gap-3">
													{PROGRAMMING_LANGUAGES.map((lang) => (
														<label
															key={lang}
															className="group inline-flex items-center space-x-3 cursor-pointer"
														>
															<div className="relative flex items-center">
																<input
																	type="checkbox"
																	checked={programmingLanguages.includes(lang)}
																	onChange={(e) => {
																		if (e.target.checked) {
																			setProgrammingLanguages([
																				...programmingLanguages,
																				lang,
																			]);
																		} else {
																			setProgrammingLanguages(
																				programmingLanguages.filter(
																					(l) => l !== lang,
																				),
																			);
																		}
																	}}
																	className="sr-only peer"
																/>
																<div className="h-4 w-4 border border-[#525252] bg-[#161616] transition-all duration-150 ease-in-out group-hover:border-[#4c4c4c] peer-checked:border-[#0f62fe] peer-checked:bg-[#0f62fe] peer-focus:ring-2 peer-focus:ring-[#0f62fe] peer-focus:ring-offset-1 peer-focus:ring-offset-[#262626]">
																	<Check
																		size={14}
																		className="text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-150"
																		strokeWidth={3}
																	/>
																</div>
															</div>
															<span className="text-sm text-[#f4f4f4] group-hover:text-white transition-colors duration-150">
																{lang}
															</span>
														</label>
													))}
												</div>
											</div>
										</div>
									</fieldset>
								</div>

								{/* Room Status */}
								<div className="p-4">
									<fieldset>
										<legend className="text-[12px] font-normal text-[#c6c6c6] mb-4">
											Room status
										</legend>
										<div className="flex items-center space-x-3">
											<div className="relative">
												<input
													type="checkbox"
													id="roomStatus"
													checked={isActive}
													onChange={(e) => setIsActive(e.target.checked)}
													className="sr-only peer"
												/>
												<label
													htmlFor="roomStatus"
													className="relative inline-flex w-10 items-center rounded-full transition-colors duration-200 ease-in-out focus-within:ring-2 focus-within:ring-[#0f62fe] focus-within:ring-offset-2 focus-within:ring-offset-[#262626] cursor-pointer"
												>
													{/* Track */}
													<span
														className={`${
															isActive ? "bg-[#0f62fe]" : "bg-[#393939]"
														} h-6 w-10 rounded-full transition-colors duration-200 ease-in-out`}
													/>
													{/* Thumb */}
													<span
														className={`${
															isActive ? "translate-x-4" : "translate-x-0"
														} absolute left-1 inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out`}
													/>
												</label>
											</div>
											<span className="text-sm text-[#f4f4f4]">
												Room is {isActive ? "active" : "inactive"}
											</span>
										</div>
									</fieldset>
								</div>
							</div>

							{/* Actions */}
							<div className="flex items-center justify-between border-t border-[#393939] bg-[#262626] px-4 py-4">
								{onDelete && (
									<button
										type="button"
										onClick={() => setShowDeleteConfirmation(true)}
										disabled={isDeleting}
										className="group relative h-10 px-4 text-sm font-normal inline-flex items-center gap-2 bg-[#fa4d56]/10 text-[#fa4d56] border border-[#fa4d56]/20 transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#fa4d56] focus:ring-offset-2 focus:ring-offset-[#262626] active:bg-[#da1e28] disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{isDeleting ? (
											<div className="flex items-center gap-2">
												<div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
												<span>Deleting room...</span>
											</div>
										) : (
											<>
												<Trash2
													size={16}
													className="relative fill-current"
													strokeWidth={1.5}
												/>
												<span>Delete room</span>
											</>
										)}
									</button>
								)}
								<div className="flex items-center space-x-3">
									<button
										type="button"
										onClick={onClose}
										className="h-10 px-4 text-sm font-normal text-[#f4f4f4] transition-all duration-150 ease-in-out hover:bg-[#353535] focus:outline-none focus:ring-2 focus:ring-[#0f62fe] focus:ring-offset-2 focus:ring-offset-[#262626] active:bg-[#4c4c4c]"
									>
										Cancel
									</button>
									<button
										type="submit"
										disabled={isSubmitting}
										className="h-10 px-4 text-sm font-normal text-white transition-all duration-150 ease-in-out bg-[#0f62fe] hover:bg-[#0353e9] focus:outline-none focus:ring-2 focus:ring-[#0f62fe] focus:ring-offset-2 focus:ring-offset-[#262626] active:bg-[#002d9c] disabled:bg-[#8d8d8d] disabled:cursor-not-allowed"
									>
										{isSubmitting ? (
											<div className="flex items-center space-x-2">
												<div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
												<span>Saving...</span>
											</div>
										) : (
											"Save"
										)}
									</button>
								</div>
							</div>
						</form>
					</div>
				</div>
			</div>

			<ConfirmationModal
				isOpen={showSaveConfirmation}
				title="Save Changes"
				message="Are you sure you want to save these changes? This will update the room configuration."
				confirmLabel="Save changes"
				cancelLabel="Cancel"
				variant="primary"
				isProcessing={isSubmitting}
				onConfirm={handleConfirmSave}
				onCancel={() => setShowSaveConfirmation(false)}
			/>

			<ConfirmationModal
				isOpen={showDeleteConfirmation}
				title="Delete Room"
				message={
					<div className="space-y-2">
						<p>
							Are you sure you want to delete this room? This action cannot be
							undone.
						</p>
						<p className="text-[#fa4d56] text-sm">
							All room data, including configuration and settings, will be
							permanently deleted.
						</p>
					</div>
				}
				confirmLabel={
					<div className="flex items-center gap-2">
						<Trash2 size={16} />
						<span>Delete room</span>
					</div>
				}
				cancelLabel="Cancel"
				variant="danger"
				isProcessing={isDeleting}
				onConfirm={handleDelete}
				onCancel={() => setShowDeleteConfirmation(false)}
			/>

			<ConfirmationModal
				isOpen={showCancelConfirmation}
				title="Unsaved Changes"
				message="You have unsaved changes. Are you sure you want to leave?"
				confirmLabel="Leave without saving"
				cancelLabel="Continue editing"
				variant="warning"
				onConfirm={onClose}
				onCancel={() => setShowCancelConfirmation(false)}
			/>
		</>
	);
}
