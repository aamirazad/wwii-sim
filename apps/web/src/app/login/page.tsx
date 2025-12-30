"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { api } from "@/lib/api";

function App() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const id = searchParams.get("id");

	const { data, isLoading, isError } = useQuery({
		queryKey: ["user", id],
		queryFn: async () => {
			if (!id) throw new Error("No ID provided");
			const response = await api["user-exist"]({ id }).get();
			if (response.error) throw new Error("Failed to fetch user");
			return response.data;
		},
		enabled: !!id,
		retry: 0,
	});

	useEffect(() => {
		if (data?.type === "server.userExist" && !isError && !isLoading) {
			if (id) {
				cookieStore.set({
					name: "userId",
					value: id,
					expires: Date.now() + 31536000000,
				});
			}
			router.push("/game");
		}
	}, [data, isError, isLoading, router, id]);

	if (isLoading) {
		return (
			<div className="relative pointer-events-none flex flex-col items-center justify-center flex-1 ">
				<div className="pointer-events-auto text-center">
					<h1 className="text-3xl font-bold">Logging you in...</h1>
				</div>
			</div>
		);
	}

	if (data?.type !== "server.userExist" || isError) {
		return (
			<div className="relative pointer-events-none flex flex-col items-center justify-center flex-1 ">
				<div className="pointer-events-auto text-center">
					<h1 className="text-3xl font-bold">Your link was invalid</h1>
				</div>
			</div>
		);
	}

	return (
		<div className="relative pointer-events-none flex flex-col items-center justify-center flex-1 ">
			<div className="pointer-events-auto text-center">
				<h1 className="text-3xl font-bold">Welcome, {data.name}!</h1>
			</div>
		</div>
	);
}

export default function LoginPage() {
	return (
		<Suspense>
			<App />
		</Suspense>
	);
}
