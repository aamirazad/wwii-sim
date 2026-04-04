"use client";

import { PLAYABLE_COUNTRIES } from "@api/schema";
import Link from "next/link";
import { useEffect, useState } from "react";
import Background from "@/components/background";
import ExternalLink from "@/components/external-link";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
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
			<div className="relative pointer-events-none flex flex-col items-center justify-center flex-1">
				<div className="pointer-events-auto max-w-2/5 text-center">
					<p className="pb-2">HASD History Club & Aamir Azad present</p>
					<h1 className="text-5xl font-bold">The WWII Sim</h1>
					<p className="italic">In Beta!</p>
					<div className="flex flex-col justify-center">
						<p className="mt-5 text-justify">
							The HASD History Sim is a interactive game where interested
							students in the Hollidaysburg Area Senior High play as different
							countries during the Second World War. The game lasts the whole
							day and usually occurs once per marking period.
						</p>
						{!isHydrated ? (
							<p className="py-2 mt-5 rounded-lg bg-primary-foreground min-h-10">
								...
							</p>
						) : !userId ? (
							<div className="mt-5 rounded-lg bg-primary-foreground p-4 text-left space-y-3">
								<div data-tutorial="home-intro" className="space-y-1">
									<p className="font-semibold">First-run guided briefing</p>
									<p className="text-sm text-muted-foreground">
										The game is meant to be played in person, with a group of
										people all connected to the website. I have hosted this game
										at my school with many students in the library. I am
										assuming you do not have that large of a group of people, so
										the site will connect you to a demo site with fake data.
									</p>
								</div>
								<div data-tutorial="home-countries" className="text-sm">
									<p className="font-medium">Playable countries</p>
									<p className="text-muted-foreground">
										{PLAYABLE_COUNTRIES.join(", ")}
									</p>
								</div>
								<div
									data-tutorial="home-demo-launch"
									className="flex flex-wrap items-center gap-2"
								>
									<p className="text-xs text-muted-foreground">
										If you do not want to start the tutorial, click the login
										link in{" "}
										<Tooltip>
											<TooltipTrigger>
												<ExternalLink href="https://mail.google.com/mail/u/0/#search/from%3A(amazad15%40hasdtigers.com)+subject%3A(History+Sim+Login+Link)+after%3A2026%2F2%2F5">
													your email
												</ExternalLink>
											</TooltipTrigger>
											<TooltipContent>
												Hint: click this link to be taken directly to the email
												with your link!
											</TooltipContent>
										</Tooltip>
										.
									</p>
								</div>
							</div>
						) : (
							<p className="py-2 mt-5 rounded-lg bg-primary-foreground min-h-10">
								You are already logged in,{" "}
								<Link href="/game/join">go to the dashboard</Link>.
							</p>
						)}
					</div>
				</div>
			</div>
		</Background>
	);
}
