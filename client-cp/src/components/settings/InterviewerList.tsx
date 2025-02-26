import { Edit2, Mail, Trash2, UserCircle } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../hooks/useAuth.ts";
import { useInterviewers } from "../../hooks/useInterviewers";
import type { Interviewer } from "../../types/interviewer.ts";
import { ConfirmationModal } from "../common/ConfirmationModal";
import { CreateInterviewerModal } from "./CreateInterviewerModal";

export function InterviewerList() {
	const { interviewers, isLoading, deleteInterviewer } = useInterviewers();
	const { user: currentUser } = useAuth();
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [editingInterviewer, setEditingInterviewer] =
		useState<Interviewer | null>(null);

	const handleDelete = async () => {
		if (deleteId) {
			try {
				await deleteInterviewer(deleteId);
			} catch (error) {
				console.error("Failed to delete interviewer:", error);
			}
			setDeleteId(null);
		}
	};

	if (isLoading) {
		return (
			<div className="bg-[#262626] border border-[#393939] p-8 text-center">
				<p className="text-[#8d8d8d]">Loading interviewers...</p>
			</div>
		);
	}

	if (!interviewers.length) {
		return (
			<div className="bg-[#262626] border border-[#393939] p-8 text-center">
				<p className="text-[#8d8d8d]">No interviewers found</p>
			</div>
		);
	}
	return (
		<>
			<div className="bg-[#262626] border border-[#393939]">
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead>
							<tr className="border-b border-[#393939]">
								<th className="px-6 py-3 text-left text-xs font-medium text-[#8d8d8d]">
									Name
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-[#8d8d8d]">
									Email
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-[#8d8d8d]">
									Status
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-[#8d8d8d]">
									Role
								</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-[#8d8d8d]">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[#393939]">
							{interviewers.map((interviewer) => {
								const isCurrentUser = interviewer.id === currentUser?.id;

								return (
									<tr key={interviewer.id}>
										<td className="px-6 py-4">
											<div className="flex items-center gap-3">
												<UserCircle className="text-[#8d8d8d]" size={20} />
												<span className="text-sm text-[#f4f4f4]">
													{interviewer.name}
													{isCurrentUser && (
														<span className="ml-2 text-xs text-[#8d8d8d]">
															(You)
														</span>
													)}
												</span>
											</div>
										</td>
										<td className="px-6 py-4">
											<div className="flex items-center gap-2">
												<a
													href={`mailto:${interviewer.email}`}
													className="text-sm text-[#f4f4f4] hover:text-[#8d8d8d] transition-colors flex items-center gap-1"
												>
													<Mail className="text-[#8d8d8d]" size={16} />
													{interviewer.email}
												</a>
											</div>
										</td>

										<td className="px-6 py-4">
											<span
												className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
													interviewer.isActive
														? "bg-[#42be65]/10 text-[#42be65]" // Green for active
														: "bg-[#8d8d8d]/10 text-[#8d8d8d]" // Gray for inactive
												}`}
											>
												{interviewer.isActive ? "Active" : "Inactive"}
											</span>
										</td>

										<td className="px-6 py-4">
											<span
												className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
													interviewer.role === "lead"
														? "bg-[#fa4d56] text-[#f4f4f4]"
														: "bg-[#353535] text-[#f4f4f4]"
												}`}
											>
												{interviewer.role === "lead"
													? "Lead Interviewer"
													: "Interviewer"}
											</span>
										</td>
										<td className="px-6 py-4">
											<div className="flex items-center justify-end gap-2">
												{!isCurrentUser && (
													<>
														<button
															type="button"
															className="p-2 text-[#8d8d8d] hover:text-[#f4f4f4] hover:bg-[#353535]"
															onClick={() => setEditingInterviewer(interviewer)}
														>
															<Edit2 size={16} />
														</button>
														<button
															type="button"
															className="p-2 text-[#fa4d56] hover:text-[#ff8389] hover:bg-[#353535]"
															onClick={() => setDeleteId(interviewer.id)}
														>
															<Trash2 size={16} />
														</button>
													</>
												)}
											</div>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>

			{editingInterviewer && (
				<CreateInterviewerModal
					mode="edit"
					interviewer={editingInterviewer}
					onClose={() => setEditingInterviewer(null)}
				/>
			)}

			<ConfirmationModal
				isOpen={!!deleteId}
				title="Delete Interviewer"
				message="Are you sure you want to delete this interviewer? This action cannot be undone."
				confirmLabel="Delete"
				cancelLabel="Cancel"
				variant="danger"
				onConfirm={handleDelete}
				onCancel={() => setDeleteId(null)}
			/>
		</>
	);
}
