import {ChevronDown, Eye, EyeOff, RefreshCw, X} from "lucide-react";
import {useState} from "react";
import {ConfirmationModal} from "../common/ConfirmationModal";

interface CreateInterviewerModalProps {
	onClose: () => void;
	interviewer?: {
		id: string;
		name: string;
		email: string;
		role: string;
		status?: "active" | "inactive";
	};
	mode?: "create" | "edit";
}

const INTERVIEWER_ROLES = {
	INTERVIEWER: "interviewer",
	LEAD: "lead",
} as const;

export function CreateInterviewerModal({
	onClose,
	interviewer,
	mode = "create",
}: CreateInterviewerModalProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
	const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
	const [formData, setFormData] = useState({
		name: interviewer?.name || "",
		email: interviewer?.email || "",
		role: interviewer?.role || "technical",
		status: interviewer?.status || "active",
		password: "",
		showPassword: false,
	});

	const generatePassword = () => {
		const length = 12;
		const charset =
			"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
		let password = "";
		for (let i = 0; i < length; i++) {
			password += charset.charAt(Math.floor(Math.random() * charset.length));
		}
		setFormData((prev) => ({ ...prev, password }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setShowSaveConfirmation(true);
	};

	const handleConfirmSave = async () => {
		setIsSubmitting(true);
		// Implement create/edit logic here
		setTimeout(() => {
			setIsSubmitting(false);
			onClose();
		}, 1000);
	};

	return (
		<>
			<div className="fixed inset-0 z-50 overflow-y-auto">
				<div className="fixed inset-0 bg-[#161616]/70 backdrop-blur-sm transition-opacity" />

				<div className="flex min-h-full items-center justify-center p-4">
					<div className="relative w-full max-w-2xl transform bg-[#262626] shadow-xl">
						{/* Header with timestamps for edit mode */}
						<div className="border-b border-[#393939]">
							<div className="flex h-12 items-center justify-between px-4">
								<div className="flex items-center space-x-3">
									<h2 className="text-[14px] font-semibold leading-5 text-[#f4f4f4]">
										{mode === "create"
											? "Add New Interviewer"
											: "Edit Interviewer"}
									</h2>
								</div>
								<button
									type="button"
									onClick={() => setShowCancelConfirmation(true)}
									className="flex h-8 w-8 items-center justify-center text-[#c6c6c6] hover:bg-[#353535] hover:text-[#f4f4f4]"
								>
									<X size={20} />
								</button>
							</div>

							{/* Show timestamps in edit mode */}
							{mode === "edit" && (
								<div className="px-4 py-2 bg-[#161616] flex items-center space-x-6 text-xs">
									<div className="flex items-center space-x-2">
										<span className="text-[#8d8d8d]">Email:</span>
										<span className="text-[#c6c6c6]">{interviewer?.email}</span>
									</div>
									<div className="flex items-center space-x-2">
										<span className="text-[#8d8d8d]">ID:</span>
										<span className="text-[#c6c6c6]">{interviewer?.id}</span>
									</div>
								</div>
							)}
						</div>

						{/* Form */}
						<form onSubmit={handleSubmit}>
							<div className="divide-y divide-[#393939]">
								{/* Basic Information */}
								<div className="p-4">
									<fieldset>
										<legend className="text-[12px] font-normal text-[#c6c6c6] mb-4">
											Basic Information
										</legend>
										<div className="grid gap-4">
											<div className="relative">
												<input
													type="text"
													id="name"
													value={formData.name}
													onChange={(e) =>
														setFormData((prev) => ({
															...prev,
															name: e.target.value,
														}))
													}
													className="w-full h-10 bg-[#161616] border border-[#525252] px-4 text-[#f4f4f4] text-sm transition-colors duration-150 ease-in-out placeholder-[#6f6f6f] hover:border-[#4c4c4c] focus:outline-none focus:border-[#f4f4f4] focus:ring-1 focus:ring-[#f4f4f4]"
													placeholder="Enter name"
												/>
												<label
													htmlFor="name"
													className="absolute -top-2 left-2 bg-[#262626] px-1 text-xs text-[#c6c6c6]"
												>
													Name
												</label>
											</div>

											{mode === "create" && (
												<div className="relative">
													<input
														type="email"
														id="email"
														value={formData.email}
														onChange={(e) =>
															setFormData((prev) => ({
																...prev,
																email: e.target.value,
															}))
														}
														className="w-full h-10 bg-[#161616] border border-[#525252] px-4 text-[#f4f4f4] text-sm transition-colors duration-150 ease-in-out placeholder-[#6f6f6f] hover:border-[#4c4c4c] focus:outline-none focus:border-[#f4f4f4] focus:ring-1 focus:ring-[#f4f4f4]"
														placeholder="Enter email"
													/>
													<label
														htmlFor="email"
														className="absolute -top-2 left-2 bg-[#262626] px-1 text-xs text-[#c6c6c6]"
													>
														Email
													</label>
												</div>
											)}

											<div className="relative">
												<select
													id="role"
													value={formData.role}
													onChange={(e) =>
														setFormData((prev) => ({
															...prev,
															role: e.target.value,
														}))
													}
													className="w-full h-10 bg-[#161616] border border-[#525252] px-4 pr-10 text-[#f4f4f4] text-sm transition-colors duration-150 ease-in-out hover:border-[#4c4c4c] focus:outline-none focus:border-[#f4f4f4] focus:ring-1 focus:ring-[#f4f4f4] appearance-none cursor-pointer"
												>
													<option value={INTERVIEWER_ROLES.INTERVIEWER}>
														Interviewer
													</option>
													<option value={INTERVIEWER_ROLES.LEAD}>
														Lead Interviewer
													</option>
												</select>
												<label
													htmlFor="role"
													className="absolute -top-2 left-2 bg-[#262626] px-1 text-xs text-[#c6c6c6]"
												>
													Role
												</label>
												{/* Custom chevron */}
												<div className="pointer-events-none absolute right-0 top-0 h-10 w-10 flex items-center justify-center text-[#8d8d8d] group-hover:text-[#f4f4f4]">
													<ChevronDown size={16} />
												</div>
												{/* Help text */}
												<div className="text-xs text-[#8d8d8d] mt-1">
													{formData.role === INTERVIEWER_ROLES.LEAD
														? "Lead Interviewers can manage interviewer accounts and access additional system settings"
														: "Interviewers can conduct interviews and manage their assigned sessions"}
												</div>
											</div>
										</div>
									</fieldset>
								</div>

								{/* Account Status - Only in edit mode */}
								{mode === "edit" && (
									<div className="p-4">
										<fieldset>
											<legend className="text-[12px] font-normal text-[#c6c6c6] mb-4">
												Account Status
											</legend>
											<div className="flex flex-col space-y-2">
												<div className="flex items-center justify-between">
													<span className="text-sm text-[#f4f4f4]">
														Account activation
													</span>
													<div className="flex items-center gap-3">
														<div className="relative">
															<input
																type="checkbox"
																id="accountStatus"
																checked={formData.status === "active"}
																onChange={(e) =>
																	setFormData((prev) => ({
																		...prev,
																		status: e.target.checked
																			? "active"
																			: "inactive",
																	}))
																}
																className="sr-only peer"
															/>
															<label
																htmlFor="accountStatus"
																className="relative inline-flex w-10 h-6 items-center cursor-pointer"
															>
																{/* Track */}
																<span
																	className={`${
																		formData.status === "active"
																			? "bg-[#0f62fe]"
																			: "bg-[#393939]"
																	} absolute h-6 w-10 rounded-full transition-colors duration-200 ease-in-out`}
																/>
																{/* Thumb */}
																<span
																	className={`${
																		formData.status === "active"
																			? "translate-x-4"
																			: "translate-x-0"
																	} absolute left-1 h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out`}
																/>
															</label>
														</div>
													</div>
												</div>
												<p className="text-xs text-[#8d8d8d]">
													{formData.status === "active"
														? "Account is currently active and can access the system"
														: "Account is currently inactive and cannot access the system"}
												</p>
											</div>
										</fieldset>
									</div>
								)}

								{/* Password Section - Only in create mode */}
								{mode === "create" && (
									<div className="p-4">
										<fieldset>
											<legend className="text-[12px] font-normal text-[#c6c6c6] mb-4">
												Security
											</legend>
											<div className="space-y-2">
												<div className="relative">
													<input
														type={formData.showPassword ? "text" : "password"}
														id="password"
														value={formData.password}
														onChange={(e) =>
															setFormData((prev) => ({
																...prev,
																password: e.target.value,
															}))
														}
														className="w-full h-10 bg-[#161616] border border-[#525252] px-4 pr-24 text-[#f4f4f4] text-sm transition-colors duration-150 ease-in-out hover:border-[#4c4c4c] focus:outline-none focus:border-[#f4f4f4] focus:ring-1 focus:ring-[#f4f4f4]"
													/>
													<label
														htmlFor="password"
														className="absolute -top-2 left-2 bg-[#262626] px-1 text-xs text-[#c6c6c6]"
													>
														Password
													</label>
													<div className="absolute right-0 top-0 h-10 flex items-center gap-1 px-2">
														<button
															type="button"
															onClick={generatePassword}
															className="p-2 text-[#8d8d8d] hover:text-[#f4f4f4] hover:bg-[#353535] transition-colors"
															title="Generate password"
														>
															<RefreshCw size={16} />
														</button>
														<button
															type="button"
															onClick={() =>
																setFormData((prev) => ({
																	...prev,
																	showPassword: !prev.showPassword,
																}))
															}
															className="p-2 text-[#8d8d8d] hover:text-[#f4f4f4] hover:bg-[#353535] transition-colors"
														>
															{formData.showPassword ? (
																<EyeOff size={16} />
															) : (
																<Eye size={16} />
															)}
														</button>
													</div>
												</div>
												<p className="text-xs text-[#8d8d8d]">
													Password must be at least 8 characters long
												</p>
											</div>
										</fieldset>
									</div>
								)}
							</div>

							{/* Actions */}
							<div className="flex items-center justify-end border-t border-[#393939] px-4 py-4">
								<div className="flex items-center space-x-3">
									<button
										type="button"
										onClick={() => setShowCancelConfirmation(true)}
										className="h-10 px-4 text-sm text-[#f4f4f4] hover:bg-[#353535] transition-colors"
									>
										Cancel
									</button>
									<button
										type="submit"
										disabled={isSubmitting}
										className="h-10 px-4 text-sm text-white bg-[#0f62fe] hover:bg-[#0353e9] disabled:bg-[#525252] disabled:cursor-not-allowed transition-colors"
									>
										{isSubmitting ? (
											<div className="flex items-center space-x-2">
												<div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
												<span>
													{mode === "create" ? "Creating..." : "Saving..."}
												</span>
											</div>
										) : mode === "create" ? (
											"Create"
										) : (
											"Save changes"
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
				title={mode === "create" ? "Create Interviewer" : "Save Changes"}
				message={
					mode === "create"
						? "Are you sure you want to create this interviewer account?"
						: "Are you sure you want to save these changes?"
				}
				confirmLabel={mode === "create" ? "Create" : "Save changes"}
				cancelLabel="Cancel"
				variant="primary"
				isProcessing={isSubmitting}
				onConfirm={handleConfirmSave}
				onCancel={() => setShowSaveConfirmation(false)}
			/>

			<ConfirmationModal
				isOpen={showCancelConfirmation}
				title="Unsaved Changes"
				message="You have unsaved changes. Are you sure you want to leave? Your changes will be lost."
				confirmLabel="Leave without saving"
				cancelLabel="Continue editing"
				variant="danger"
				onConfirm={onClose}
				onCancel={() => setShowCancelConfirmation(false)}
			/>
		</>
	);
}
