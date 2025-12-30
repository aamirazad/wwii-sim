"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function Game() {
	const [userId, setUserId] = useState<string | null>(null);
	const [checkingCookie, setCheckingCookie] = useState(true);

	useEffect(() => {
		cookieStore.get("userId").then((cookie) => {
			if (cookie?.value) setUserId(cookie.value);
			setCheckingCookie(false);
		});
	}, []);

	const { data, isLoading, isError } = useQuery({
		queryKey: ["userInfo", userId],
		queryFn: async () => {
			if (!userId) throw new Error("No user ID");
			const response = await api.users({ id: userId }).get({
				headers: {
					authorization: userId,
				},
			});
			if (response.error) throw new Error("Failed to fetch user");
			return response.data;
		},
		enabled: !!userId,
		retry: 0,
	});

	if (checkingCookie || isLoading) return null;

	if (!userId) {
		return <div>Please log in.</div>;
	}

	if (isError) return <div>Error fetching user info.</div>;

	return (
		<div className="relative pointer-events-none flex flex-col items-center justify-center flex-1 ">
			<div className="pointer-events-auto text-center">
				{data && "user" in data ? (
					<>
						<h1>Welcome, {data.user.name}</h1>
						<pre>{JSON.stringify(data.user, null, 2)}</pre>
					</>
				) : (
					<div>No user data found</div>
				)}
			</div>
		</div>
	);
}
