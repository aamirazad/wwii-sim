import { cookies } from "next/headers";
import Link from "next/link";
import ExternalLink from "@/components/external-link";

export default async function Homepage() {
	const cookieStore = await cookies();
	const userId = cookieStore.get("userId");
	return (
		<div className="relative pointer-events-none flex flex-col items-center justify-center flex-1">
			<div className="pointer-events-auto max-w-2/5 text-center">
				<p className="pb-2">HASD History Club & Aamir Azad present</p>
				<h1 className="text-5xl font-bold">The WWII Sim</h1>
				<p className="italic">In Beta!</p>
				<div className="flex flex-col justify-center">
					<p className="mt-5 text-justify">
						The HASD History Sim is a interactive game where interested students
						in the Hollidaysburg Area Senior High play as different countries
						during the Second World War. The game lasts the whole day and
						usually occurs once per marking period.
					</p>
					<p className="py-2 mt-5 rounded-lg bg-primary-foreground ">
						{!userId ? (
							<>
								You are not logged in. Please login by by clicking the link sent
								to{" "}
								<ExternalLink href="https://mail.google.com/mail/u/0/#search/subject%3A(History+Sim+Login+Link)">
									your email
								</ExternalLink>
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
	);
}
