import {useState} from "react";
import {useAuth} from "../../hooks/useAuth";
import {Header} from "../layout/Header";
import {MobileMenu} from "../layout/MobileMenu";
import {CreateInterviewerModal} from "./CreateInterviewerModal";
import {InterviewerList} from "./InterviewerList";
import {UserProfileCard} from "./UserProfileCard";
import {UserSettingsModal} from "./UserSettingsModal";

export function Settings() {
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const { user } = useAuth();

	return (
		<div className="min-h-screen bg-[#161616]">
			<Header
				user={user}
				isMobileMenuOpen={isMobileMenuOpen}
				setIsMobileMenuOpen={setIsMobileMenuOpen}
			/>
			{isMobileMenuOpen && <MobileMenu />}

			<main className="max-w-[1200px] mx-auto p-4 sm:p-8">
				{/* Header */}
				<div className="mb-6 sm:mb-8">
					<h2 className="text-[#f4f4f4] text-xl sm:text-[2rem] font-light mb-1">
						Settings
					</h2>
					<p className="text-[#8d8d8d] text-sm sm:text-base">
						Manage interviewer accounts and system preferences
					</p>
				</div>

				{/* Content */}
				<div className="space-y-8">
					{/* Personal Account Section */}
					<section>
						<div className="mb-4">
							<h3 className="text-[#f4f4f4] text-lg font-medium">
								Personal Account
							</h3>
						</div>
						<UserProfileCard
							user={user}
							onEditClick={() => setIsUserSettingsOpen(true)}
						/>
					</section>

					{/* Interviewers Section */}
					<section>
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-[#f4f4f4] text-lg font-medium">
								Interviewer Accounts
							</h3>
							<button
								type="button"
								onClick={() => setIsCreateModalOpen(true)}
								className="h-10 px-4 bg-[#0f62fe] text-white text-sm hover:bg-[#0353e9] focus:outline-2 focus:outline-offset-2 focus:outline-[#ffffff] active:bg-[#002d9c] transition-colors"
							>
								Add Interviewer
							</button>
						</div>
						<InterviewerList />
					</section>
				</div>
			</main>

			{isCreateModalOpen && (
				<CreateInterviewerModal onClose={() => setIsCreateModalOpen(false)} />
			)}

			{isUserSettingsOpen && (
				<UserSettingsModal
					user={user}
					onClose={() => setIsUserSettingsOpen(false)}
				/>
			)}
		</div>
	);
}
