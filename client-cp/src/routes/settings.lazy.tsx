import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Settings } from "../components/settings/Settings";
import { useAuth } from "../hooks/useAuth";

export const Route = createLazyFileRoute("/settings")({
	component: SettingsPage,
});

function SettingsPage() {
	const navigate = useNavigate();
	const { isAuthenticated, isLoading } = useAuth();

	useEffect(() => {
		if (!isLoading && !isAuthenticated) {
			navigate({ to: "/login" });
		}
	}, [isLoading, isAuthenticated, navigate]);

	if (isLoading) {
		return (
			<div className="min-h-screen bg-[#161616] flex items-center justify-center">
				<div className="text-[#f4f4f4]">Loading...</div>
			</div>
		);
	}

	if (!isAuthenticated) {
		return null;
	}

	return <Settings />;
}
