import {Edit2, Mail, UserCircle} from "lucide-react";
import type {User} from "../../types/auth";

interface UserProfileCardProps {
	user: User | undefined;
	onEditClick: () => void;
}

export function UserProfileCard({ user, onEditClick }: UserProfileCardProps) {
	return (
		<div className="bg-[#262626] border border-[#393939] p-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<UserCircle className="text-[#8d8d8d]" size={40} />
					<div>
						<h4 className="text-[#f4f4f4] text-sm font-medium">{user?.name}</h4>
						<div className="flex items-center gap-2 mt-1">
							<Mail className="text-[#8d8d8d]" size={14} />
							<span className="text-[#8d8d8d] text-sm">{user?.email}</span>
						</div>
					</div>
				</div>
				<button
					type="button"
					onClick={onEditClick}
					className="h-8 px-3 text-[#f4f4f4] text-sm hover:bg-[#353535] focus:outline-none focus:ring-2 focus:ring-[#0f62fe] focus:ring-offset-2 focus:ring-offset-[#262626] active:bg-[#4c4c4c] transition-colors flex items-center gap-2"
				>
					<Edit2 size={14} />
					<span>Edit Profile</span>
				</button>
			</div>
		</div>
	);
}
