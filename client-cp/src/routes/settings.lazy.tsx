import {createLazyFileRoute} from "@tanstack/react-router";
import {Settings} from "../components/settings/Settings";

export const Route = createLazyFileRoute("/settings")({
	component: SettingsPage,
});

function SettingsPage() {
	return <Settings />;
}
