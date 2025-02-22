import { createRootRoute, Outlet, redirect } from "@tanstack/react-router";
import React, { Suspense } from "react";
import "../app.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const TanStackRouterDevtools =
	process.env.NODE_ENV === "production"
		? () => null
		: React.lazy(() =>
				import("@tanstack/router-devtools").then((res) => ({
					default: res.TanStackRouterDevtools,
				})),
			);

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5,
			retry: 1,
		},
	},
});

export const Route = createRootRoute({
	component: () => (
		<QueryClientProvider client={queryClient}>
			<Outlet />
			<Suspense>
				<TanStackRouterDevtools />
			</Suspense>
		</QueryClientProvider>
	),
	beforeLoad: ({ location }) => {
		// Redirect /logout to login page and clear token
		if (location.pathname === "/logout") {
			localStorage.removeItem("token");
			throw redirect({
				to: "/login",
			});
		}
	},
});
