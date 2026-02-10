"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import Background from "@/components/background";
import FullAlert from "@/components/full-alert";
import LoadingSpinner from "@/components/loading-spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { api } from "@/lib/api";

function App() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const id = searchParams.get("id");

	const { data, isLoading } = useQuery({
		queryKey: ["user", id],
		queryFn: async () => {
			if (!id) throw new Error("No ID provided");
			const response = await api.user({ id }).get();
			if (response.error) throw new Error("Failed to fetch user");
			return response.data;
		},
		enabled: !!id,
		retry: 0,
	});

	useEffect(() => {
		if (!data || data.error || !data.user?.id) return;

		const setCookieAndRedirect = async () => {
			await cookieStore.set({
				name: "userId",
				value: data.user.id,
				expires: Date.now() + 31536000000,
			});
			router.push("/game/join");
		};

		setCookieAndRedirect();
	}, [data, router]);

	if (isLoading) {
		return <LoadingSpinner />;
	}

	if (!data || data.error) {
		return (
			<FullAlert>
				<Alert variant="destructive">
					<AlertTitle>
						There was an error logging you in. Check your link.
					</AlertTitle>
					<AlertDescription>
						Maybe the server is off right now?
					</AlertDescription>
				</Alert>
			</FullAlert>
		);
	}

	return <LoadingSpinner />;
}

export default function LoginPage() {
	return (
		<Background>
			<Suspense>
				<App />
			</Suspense>
		</Background>
	);
}
