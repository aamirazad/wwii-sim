import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ExternalLink from "@/components/ExternalLink";

export default async function Homepage() {
	const cookieStore = await cookies();
	const userId = cookieStore.get("userId");

	if (userId) {
		redirect("/game/dashboard");
	}

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
					<p className="py-2 mt-5 rounded-lg bg-primary-foreground">
						You must login to the site by clicking the link in the{" "}
						<ExternalLink href="https://classroom.google.com/c/NzA4NjIyNTUxNDcy">
							History Club Google Classroom
						</ExternalLink>
					</p>
				</div>
			</div>
		</div>
	);
}
