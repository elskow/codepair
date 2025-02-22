import { UserPlus } from "lucide-react";
import type { FormEvent } from "react";

interface CreateRoomFormProps {
	candidateName: string;
	setCandidateName: (name: string) => void;
	onSubmit: (e: FormEvent) => void;
}

export function CreateRoomForm({
	candidateName,
	setCandidateName,
	onSubmit,
}: CreateRoomFormProps) {
	return (
		<form onSubmit={onSubmit} className="flex w-full gap-2">
			<div className="relative flex-1 lg:flex-none">
				<label
					htmlFor="candidate-name"
					className="absolute left-4 -top-2 px-1 text-xs text-[#8d8d8d] bg-[#262626] transition-all"
				>
					Candidate Name
				</label>
				<input
					id="candidate-name"
					type="text"
					value={candidateName}
					onChange={(e) => setCandidateName(e.target.value)}
					placeholder=" "
					className="w-full lg:w-[300px] h-10 bg-[#262626] text-[#f4f4f4] border border-[#393939] px-4 text-sm focus:outline-none focus:border-[#ffffff] placeholder-transparent"
				/>
			</div>
			<button
				type="submit"
				className="h-10 px-4 bg-[#0f62fe] text-white hover:bg-[#0353e9] active:bg-[#002d9c] focus:outline-2 focus:outline-offset-2 focus:outline-[#ffffff] disabled:bg-[#8d8d8d] disabled:cursor-not-allowed text-sm font-normal flex items-center gap-2 transition-colors whitespace-nowrap"
			>
				<UserPlus size={18} />
				<span>Create Room</span>
			</button>
		</form>
	);
}
