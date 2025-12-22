import ExternalLink from "@/components/ExternalLink";
import LandingPage from "@/components/LandingPage";

export default async function Homepage() {
	return (
		<LandingPage>
			<div className="flex flex-col justify-center">
				<p className="mt-5 text-justify">
					The HASD History Sim is a interactive game where interested students
					in the Hollidaysburg Area Senior High play as different countries
					during the Second World War. The game lasts the whole day and usually
					occurs once per marking period.
				</p>
				<p className="py-2 	mt-5 rounded-lg bg-primary-foreground">
					You must login to the site by clicking the link in the{" "}
					<ExternalLink href="https://classroom.google.com/c/NzA4NjIyNTUxNDcy">
						History Club Google Classroom
					</ExternalLink>
				</p>
			</div>
		</LandingPage>
	);
}
