import {Link, useRouter} from "@tanstack/react-router";
import {LogOut} from "lucide-react";
import {useToast} from "../../context/ToastContext.tsx";

export function MobileMenu() {
	const { show } = useToast();
	const router = useRouter();

	const currentRoute = router.state.location.pathname;
	const isDashboardActive = currentRoute === "/";
	const isSettingsActive = currentRoute === "/settings";

	const handleLogout = () => {
		localStorage.removeItem("token");
		show("auth", "error", {
			title: "Logged out",
			message: "You have been successfully logged out",
			duration: 2000,
		});
	};

	return (
		<div className="md:hidden bg-[#262626] border-b border-[#393939]">
			<nav className="flex flex-col">
				<Link
					to="/"
					className={`flex items-center h-12 px-4 text-sm border-l-2 transition-colors
            ${
							isDashboardActive
								? "text-[#f4f4f4] bg-[#353535] border-[#f4f4f4]"
								: "text-[#8d8d8d] hover:text-[#c6c6c6] border-transparent"
						}`}
				>
					Dashboard
				</Link>
				<Link
					to="/settings"
					className={`flex items-center h-12 px-4 text-sm border-l-2 transition-colors
            ${
							isSettingsActive
								? "text-[#f4f4f4] bg-[#353535] border-[#f4f4f4]"
								: "text-[#8d8d8d] hover:text-[#c6c6c6] border-transparent"
						}`}
				>
					Settings
				</Link>
				<div className="px-4 py-3 border-t border-[#393939]">
					<button
						type="button"
						onClick={handleLogout}
						className="flex items-center gap-2 w-full text-sm text-[#fa4d56] hover:text-[#ff8389] transition-colors"
					>
						<LogOut size={16} />
						Logout
					</button>
				</div>
			</nav>
		</div>
	);
}
