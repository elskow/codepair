import {Edit2, Mail, Trash2, UserCircle} from "lucide-react";
import {useState} from "react";
import {ConfirmationModal} from "../common/ConfirmationModal";
import {CreateInterviewerModal} from "./CreateInterviewerModal.tsx";

interface Interviewer {
	id: string;
	name: string;
	email: string;
	role: "interviewer" | "lead";
	status: "active" | "inactive";
}

// Dummy data for now
const MOCK_INTERVIEWERS: Interviewer[] = [
	{
		id: "1",
		name: "John Doe",
		email: "john@example.com",
		role: "lead",
		status: "active",
	},
	{
		id: "2",
		name: "Jane Smith",
		email: "jane@example.com",
		role: "interviewer",
		status: "active",
	},
];

export function InterviewerList() {
	const [interviewers] = useState<Interviewer[]>(MOCK_INTERVIEWERS);
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [editingInterviewer, setEditingInterviewer] =
		useState<Interviewer | null>(null);

	const handleDelete = async () => {
		// TODO: Implement delete logic
		setDeleteId(null);
	};

	if (interviewers.length === 0) {
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
							{interviewers.map((interviewer) => (
								<tr key={interviewer.id}>
									<td className="px-6 py-4">
										<div className="flex items-center gap-3">
											<UserCircle className="text-[#8d8d8d]" size={20} />
											<span className="text-sm text-[#f4f4f4]">
												{interviewer.name}
											</span>
										</div>
									</td>
									<td className="px-6 py-4">
										<div className="flex items-center gap-2">
											<Mail className="text-[#8d8d8d]" size={16} />
											<span className="text-sm text-[#f4f4f4]">
												{interviewer.email}
											</span>
										</div>
									</td>

									<td className="px-6 py-4">
										<span
											className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
												interviewer.status === "active"
													? "bg-[#42be65]/10 text-[#42be65]" // Green for active
													: "bg-[#8d8d8d]/10 text-[#8d8d8d]" // Gray for inactive
											}`}
										>
											{interviewer.status === "active" ? "Active" : "Inactive"}
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
										</div>
									</td>
								</tr>
							))}
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
