import {createFileRoute, useNavigate} from "@tanstack/react-router";
import type React from "react";
import {useState} from "react";
import {useToast} from "../context/ToastContext.tsx";
import {useAuth} from "../hooks/useAuth";

export const Route = createFileRoute("/login")({
	component: LoginPage,
});

function LoginPage() {
	const { show } = useToast();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const navigate = useNavigate();
	const { login } = useAuth();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		login.mutate(
			{ email, password },
			{
				onSuccess: (data) => {
					localStorage.setItem("token", data.token);
					show("auth", "success", {
						title: "Welcome back!",
						message: "You have successfully logged in",
						duration: 3000,
					});
					navigate({ to: "/" });
				},
			},
		);
	};

	return (
		<div className="min-h-screen bg-[#161616] flex flex-col items-center justify-center p-4">
			<div className="w-full max-w-[400px]">
				<div className="mb-8">
					<h1 className="text-[#f4f4f4] text-[2rem] leading-tight font-light">
						CodePair
					</h1>
					<p className="text-[#c6c6c6] text-base mt-1">
						Collaborative Interview Platform
					</p>
				</div>

				<form onSubmit={handleSubmit}>
					<div className="space-y-6">
						<div className="relative">
							<input
								id="email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder=" "
								className=" peer w-full h-[2.5rem] bg-transparent text-[#f4f4f4] border-0 border-b border-[#525252] pt-4 px-0 text-sm focus:outline-none focus:border-b-2 focus:border-[#f4f4f4] placeholder-transparent transition-all [-webkit-autofill:hover]:bg-transparent [&:-webkit-autofill]:bg-transparent [&:-webkit-autofill:hover]:bg-transparent [&:-webkit-autofill:focus]:bg-transparent [&:-webkit-autofill:active]:bg-transparent [&:-webkit-autofill]:text-[#f4f4f4] [&:-webkit-autofill]:[-webkit-text-fill-color:#f4f4f4] [&:-webkit-autofill]:[-webkit-box-shadow:0_0_0px_1000px_#262626_inset] hover:border-[#8d8d8d]"
							/>
							<label
								htmlFor="email"
								className=" absolute left-0 text-[#8d8d8d] text-xs transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-[#8d8d8d] peer-placeholder-shown:top-2 peer-focus:top-0 peer-focus:text-xs peer-focus:text-[#f4f4f4] top-0"
							>
								Email
							</label>
						</div>

						<div className="relative">
							<input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder=" "
								className=" peer w-full h-[2.5rem] bg-transparent text-[#f4f4f4] border-0 border-b border-[#525252] pt-4 px-0 text-sm focus:outline-none focus:border-b-2 focus:border-[#f4f4f4] placeholder-transparent transition-all [-webkit-autofill:hover]:bg-transparent [&:-webkit-autofill]:bg-transparent [&:-webkit-autofill:hover]:bg-transparent [&:-webkit-autofill:focus]:bg-transparent [&:-webkit-autofill:active]:bg-transparent [&:-webkit-autofill]:text-[#f4f4f4] [&:-webkit-autofill]:[-webkit-text-fill-color:#f4f4f4] [&:-webkit-autofill]:[-webkit-box-shadow:0_0_0px_1000px_#262626_inset] hover:border-[#8d8d8d]"
							/>
							<label
								htmlFor="password"
								className=" absolute left-0 text-[#8d8d8d] text-xs transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-[#8d8d8d] peer-placeholder-shown:top-2 peer-focus:top-0 peer-focus:text-xs peer-focus:text-[#f4f4f4] top-0"
							>
								Password
							</label>
						</div>

						{login.isError && (
							<div className="bg-[#ff000020] border-l-4 border-l-[#da1e28] p-4">
								<p className="text-[#fa4d56] text-sm">{login.error.message}</p>
							</div>
						)}

						<button
							type="submit"
							disabled={login.isPending}
							className=" w-full h-[3rem] bg-[#0f62fe] text-white hover:bg-[#0353e9] focus:outline-[#ffffff] focus:outline-2 disabled:bg-[#8d8d8d] disabled:cursor-not-allowed text-sm font-normal transition-colors           "
						>
							{login.isPending ? "Signing in..." : "Sign in"}
						</button>
					</div>
				</form>

				<p className="mt-8 text-center text-[#c6c6c6] text-sm">
					Need an account?{" "}
					<a
						href="mailto:admin@codepair.dev"
						className="text-[#78a9ff] hover:text-[#0f62fe] focus:outline-[#ffffff] focus:outline-2"
					>
						Contact administrator
					</a>
				</p>
			</div>
		</div>
	);
}
