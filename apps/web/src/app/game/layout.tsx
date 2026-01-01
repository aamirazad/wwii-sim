"use client";

import { useQuery } from "@tanstack/react-query";
import { Dices, LayoutDashboard, Pickaxe, Swords } from "lucide-react";
import { useEffect, useState } from "react";
import Dock from "@/components/Dock";
import ExternalLink from "@/components/ExternalLink";
import { api } from "@/lib/api";

export default function Game({ children }: { children: React.ReactNode }) {
	const [userId, setUserId] = useState<string | null>(null);
	const [checkingCookie, setCheckingCookie] = useState(true);
	const time = new Date();

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

	if ((!userId && !isLoading && !checkingCookie) || isError) {
		return (
			<div className="flex flex-col grow relative justify-center items-center">
				<p className="py-2 mt-5 rounded-lg bg-primary-foreground px-3">
					You must login to the site by clicking the link in the{" "}
					<ExternalLink href="https://classroom.google.com/c/NzA4NjIyNTUxNDcy">
						History Club Google Classroom
					</ExternalLink>
				</p>
			</div>
		);
	}

	const user = (data as { user?: { name: string } } | undefined)?.user;
	const countryName = "United States"; // Placeholder
	const gameYear = 1942;

	const dockItems = [
		{
			icon: <LayoutDashboard size={24} />,
			label: "Dashboard",
			href: "/game/dashboard",
		},
		{
			icon: <Pickaxe size={24} />,
			label: "Resources",
			href: "/game/resources",
		},
		{
			icon: <Swords size={24} />,
			label: "Battles",
			href: "/game/battles",
		},
		{
			icon: <Dices size={24} />,
			label: "Game",
			href: "/game/info",
		},
	];

	return (
		<div className="flex flex-col grow relative">
			{/* Top Bar */}
			<header className="w-full pt-6 px-8 pb-2 flex justify-between items-start">
				<div className="flex flex-col">
					<h1 className="text-5xl font-black tracking-tighter uppercase text-white drop-shadow-lg">
						{countryName}
					</h1>
					<div className="flex items-center gap-2 mt-1">
						<div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
						<p className="text-lg font-medium text-zinc-400">
							Commander {user?.name}
						</p>
					</div>
				</div>
				<div className="flex flex-col items-end">
					<p className="text-5xl font-mono font-bold text-white drop-shadow-lg">
						{gameYear}
					</p>
					<p className="text-lg font-medium text-zinc-400 font-mono">
						{time.toLocaleTimeString([], {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</p>
				</div>
			</header>

			{/* Main Content Island */}
			<div className=" mx-6 grow flex bg-zinc-900/50 backdrop-blur-2xl border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden relative">
				{/* Inner Content */}
				<div className="p-8 h-full overflow-auto w-full">
					<div className="flex items-center justify-center h-full text-zinc-500">
						{children}
					</div>
				</div>
			</div>

			{/* Dock */}
			<div className="  ">
				<Dock
					items={dockItems}
					panelHeight={68}
					baseItemSize={50}
					magnification={70}
				/>
			</div>
		</div>
	);
}
