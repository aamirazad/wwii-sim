"use client";

import { PLAYABLE_COUNTRIES } from "@api/schema";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import Background from "@/components/background";
import { Button } from "@/components/ui/button";
import { getUserId } from "@/lib/cookies";

export default function Homepage() {
	const [userId, setUserId] = useState<string | null>(null);
	const [isHydrated, setIsHydrated] = useState(false);

	useEffect(() => {
		setUserId(getUserId());
		setIsHydrated(true);
	}, []);

	return (
		<Background>
			<div className="relative flex min-h-screen flex-1 items-center px-6 py-16 sm:px-10">
				<div className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
					<section>
						<h1
							className="max-w-3xl font-serif text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl"
							data-tutorial="home-title"
						>
							The Second World War Simulation
						</h1>
						<p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
							A moderated, in-person strategy game for classrooms and history
							clubs. Lead a nation, manage its wartime economy, develop new
							capabilities, negotiate with other teams, and submit detailed
							operations as the years advance.
						</p>
						<div className="mt-8">
							{!isHydrated ? (
								<div className="h-9 w-40 animate-pulse rounded-sm bg-muted" />
							) : userId ? (
								<Button
									nativeButton={false}
									size="lg"
									render={<Link href="/game/join" className="no-underline" />}
								>
									Enter your command room <ArrowRight />
								</Button>
							) : (
								<div className="flex max-w-xl items-start gap-3 border-l-2 border-primary pl-4 text-sm leading-6 text-muted-foreground">
									<Mail className="mt-1 size-4 shrink-0 text-primary" />
									<p>
										Your moderator assigns your country and emails a personal
										sign-in link. Open that link on this device to join the
										active game.
									</p>
								</div>
							)}
						</div>
					</section>
					<aside className="border-y border-border bg-card/75 px-6 py-7 sm:px-8">
						<div className="flex items-center gap-3">
							<ShieldCheck className="size-5 text-primary" />
							<h2 className="font-serif text-2xl font-semibold">
								Nations in play
							</h2>
						</div>
						<p className="mt-3 text-sm leading-6 text-muted-foreground">
							Teams begin with historically distinct resources, forces,
							research, morale, production tables, and national objectives.
						</p>
						<ul
							className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 text-sm"
							data-tutorial="home-countries"
						>
							{PLAYABLE_COUNTRIES.map((country) => (
								<li key={country} className="border-b border-border/70 pb-2">
									{country}
								</li>
							))}
						</ul>
					</aside>
				</div>
			</div>
		</Background>
	);
}
