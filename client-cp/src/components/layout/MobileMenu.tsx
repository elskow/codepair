import { LogOut } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export function MobileMenu() {
	const navigate = useNavigate();

	return (
		<div className="md:hidden bg-[#262626] border-b border-[#393939]">
			<nav className="flex flex-col p-4 space-y-2">
				<button
					type="button"
					className="text-sm text-[#f4f4f4] hover:bg-[#353535] px-3 py-2 w-full text-left"
				>
					Dashboard
				</button>
				<button
					type="button"
					className="text-sm text-[#8d8d8d] hover:bg-[#353535] px-3 py-2 w-full text-left"
				>
					Settings
				</button>
				<div className="pt-2 border-t border-[#393939]">
					<button
						type="button"
						onClick={() => navigate({ to: "/logout" })}
						className="text-sm text-[#fa4d56] hover:bg-[#353535] px-3 py-2 w-full text-left flex items-center gap-2"
					>
						<LogOut size={16} />
						Logout
					</button>
				</div>
			</nav>
		</div>
	);
}
