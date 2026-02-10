"use client";

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
						<p className="py-2 mt-5 rounded-lg bg-primary-foreground min-h-10">
							{!isHydrated ? (
								"..."
							) : !userId ? (
								<>
									You are not logged in. Please login by by clicking the link
									sent to{" "}
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
								</>
							) : (
								<>
									You are already logged in,{" "}
									<Link href="/game/join">go to the dashboard</Link>.
								</>
							)}
						</p>
					</div>
				</div>
			</div>
		</Background>
	);
}
