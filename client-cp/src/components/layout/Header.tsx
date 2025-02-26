import { Link, useNavigate, useRouter } from "@tanstack/react-router"; // Change this line
import { LogOut, Menu, UserCircle, X } from "lucide-react";
import { useToast } from "../../context/ToastContext.tsx";
import type { User } from "../../types/auth";

interface HeaderProps {
	user: User | undefined;
	isMobileMenuOpen: boolean;
	setIsMobileMenuOpen: (isOpen: boolean) => void;
}

export function Header({
	user,
	isMobileMenuOpen,
	setIsMobileMenuOpen,
}: HeaderProps) {
	const navigate = useNavigate();
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
		navigate({ to: "/login" });
	};

	return (
		<header className="h-12 bg-[#262626] border-b border-[#393939] flex items-center justify-between px-4">
			<div className="flex items-center gap-8">
				<h1 className="text-[#f4f4f4] text-sm font-normal">CodePair</h1>
				<nav className="hidden md:flex items-center h-12">
					<Link
						to="/"
						className={`h-full flex items-center px-3 text-sm relative transition-colors
              ${
								isDashboardActive
									? "text-[#f4f4f4] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#f4f4f4]"
									: "text-[#8d8d8d] hover:text-[#c6c6c6]"
							}`}
					>
						Dashboard
					</Link>
					<Link
						to="/settings"
						className={`h-full flex items-center px-3 text-sm relative transition-colors
              ${
								isSettingsActive
									? "text-[#f4f4f4] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#f4f4f4]"
									: "text-[#8d8d8d] hover:text-[#c6c6c6]"
							}`}
					>
						Settings
					</Link>
				</nav>
			</div>

			<div className="flex items-center gap-4">
				<div className="hidden sm:flex items-center gap-2">
					<UserCircle size={20} className="text-[#8d8d8d]" />
					<span className="text-[#f4f4f4] text-sm">{user?.email}</span>
				</div>
				<button
					type="button"
					onClick={handleLogout}
					className="hidden sm:flex items-center justify-center w-8 h-8 text-[#8d8d8d] hover:text-[#f4f4f4] hover:bg-[#353535] transition-colors"
				>
					<LogOut size={18} />
				</button>

				<button
					type="button"
					onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
					className="md:hidden flex items-center justify-center w-8 h-8 text-[#8d8d8d] hover:text-[#f4f4f4] hover:bg-[#353535]"
				>
					{isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
				</button>
			</div>
		</header>
	);
}
