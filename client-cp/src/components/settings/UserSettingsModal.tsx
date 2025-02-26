import {Eye, EyeOff, X} from "lucide-react";
import {useState} from "react";
import type {User} from "../../types/auth";
import {ConfirmationModal} from "../common/ConfirmationModal";

interface UserSettingsModalProps {
	user: User | undefined;
	onClose: () => void;
}

export function UserSettingsModal({ user, onClose }: UserSettingsModalProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
	const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
	const [formData, setFormData] = useState({
		name: user?.name || "",
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
		showCurrentPassword: false,
		showNewPassword: false,
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setShowSaveConfirmation(true);
	};

	const handleConfirmSave = async () => {
		setIsSubmitting(true);
		// Implement save logic here
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
						{/* Header */}
						<div className="border-b border-[#393939]">
							<div className="flex h-12 items-center justify-between px-4">
								<div className="flex items-center space-x-3">
									<h2 className="text-[14px] font-semibold leading-5 text-[#f4f4f4]">
										Edit Profile
									</h2>
								</div>
								<button
									type="button"
									onClick={() => setShowCancelConfirmation(true)}
									className="flex h-8 w-8 items-center justify-center rounded text-[#c6c6c6] hover:bg-[#353535] hover:text-[#f4f4f4]"
								>
									<X size={20} />
									<span className="sr-only">Close</span>
								</button>
							</div>
						</div>

						{/* Form */}
						<form onSubmit={handleSubmit}>
							<div className="divide-y divide-[#393939]">
								{/* Profile Information */}
								<div className="p-4">
									<fieldset>
										<legend className="text-[12px] font-normal text-[#c6c6c6] mb-4">
											Profile Information
										</legend>
										<div className="space-y-4">
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
													className="w-full h-10 bg-[#161616] border border-[#525252] px-4 text-[#f4f4f4] text-sm transition-colors duration-150 ease-in-out hover:border-[#4c4c4c] focus:outline-none focus:border-[#0f62fe] focus:ring-1 focus:ring-[#0f62fe]"
												/>
												<label
													htmlFor="name"
													className="absolute -top-2 left-2 bg-[#262626] px-1 text-xs text-[#c6c6c6]"
												>
													Name
												</label>
											</div>
										</div>
									</fieldset>
								</div>

								{/* Security */}
								<div className="p-4">
									<fieldset>
										<legend className="text-[12px] font-normal text-[#c6c6c6] mb-4">
											Change Password
										</legend>
										<div className="grid gap-4">
											<div className="relative">
												<input
													type={
														formData.showCurrentPassword ? "text" : "password"
													}
													id="currentPassword"
													value={formData.currentPassword}
													onChange={(e) =>
														setFormData((prev) => ({
															...prev,
															currentPassword: e.target.value,
														}))
													}
													className="w-full h-10 bg-[#161616] border border-[#525252] px-4 pr-12 text-[#f4f4f4] text-sm transition-colors duration-150 ease-in-out hover:border-[#4c4c4c] focus:outline-none focus:border-[#0f62fe] focus:ring-1 focus:ring-[#0f62fe]"
												/>
												<label
													htmlFor="currentPassword"
													className="absolute -top-2 left-2 bg-[#262626] px-1 text-xs text-[#c6c6c6]"
												>
													Current Password
												</label>
												<button
													type="button"
													onClick={() =>
														setFormData((prev) => ({
															...prev,
															showCurrentPassword: !prev.showCurrentPassword,
														}))
													}
													className="absolute right-0 top-0 h-10 w-12 flex items-center justify-center text-[#8d8d8d] hover:text-[#f4f4f4] hover:bg-[#353535] transition-colors"
												>
													{formData.showCurrentPassword ? (
														<EyeOff size={16} />
													) : (
														<Eye size={16} />
													)}
												</button>
											</div>

											<div className="grid gap-4 sm:grid-cols-2">
												<div className="relative">
													<input
														type={
															formData.showNewPassword ? "text" : "password"
														}
														id="newPassword"
														value={formData.newPassword}
														onChange={(e) =>
															setFormData((prev) => ({
																...prev,
																newPassword: e.target.value,
															}))
														}
														className="w-full h-10 bg-[#161616] border border-[#525252] px-4 pr-12 text-[#f4f4f4] text-sm transition-colors duration-150 ease-in-out hover:border-[#4c4c4c] focus:outline-none focus:border-[#0f62fe] focus:ring-1 focus:ring-[#0f62fe]"
													/>
													<label
														htmlFor="newPassword"
														className="absolute -top-2 left-2 bg-[#262626] px-1 text-xs text-[#c6c6c6]"
													>
														New Password
													</label>
													<button
														type="button"
														onClick={() =>
															setFormData((prev) => ({
																...prev,
																showNewPassword: !prev.showNewPassword,
															}))
														}
														className="absolute right-0 top-0 h-10 w-12 flex items-center justify-center text-[#8d8d8d] hover:text-[#f4f4f4] hover:bg-[#353535] transition-colors"
													>
														{formData.showNewPassword ? (
															<EyeOff size={16} />
														) : (
															<Eye size={16} />
														)}
													</button>
												</div>

												<div className="relative">
													<input
														type={
															formData.showNewPassword ? "text" : "password"
														}
														id="confirmPassword"
														value={formData.confirmPassword}
														onChange={(e) =>
															setFormData((prev) => ({
																...prev,
																confirmPassword: e.target.value,
															}))
														}
														className="w-full h-10 bg-[#161616] border border-[#525252] px-4 text-[#f4f4f4] text-sm transition-colors duration-150 ease-in-out hover:border-[#4c4c4c] focus:outline-none focus:border-[#0f62fe] focus:ring-1 focus:ring-[#0f62fe]"
													/>
													<label
														htmlFor="confirmPassword"
														className="absolute -top-2 left-2 bg-[#262626] px-1 text-xs text-[#c6c6c6]"
													>
														Confirm Password
													</label>
												</div>
											</div>
										</div>
									</fieldset>
								</div>
							</div>

							{/* Actions */}
							<div className="flex items-center justify-end border-t border-[#393939] bg-[#262626] px-4 py-4">
								<div className="flex items-center space-x-3">
									<button
										type="button"
										onClick={() => setShowCancelConfirmation(true)}
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
				title="Save Changes"
				message="Are you sure you want to save these changes? You may need to log in again if you changed your password."
				confirmLabel="Save Changes"
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
