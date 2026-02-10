import Background from "@/components/background";
import FullAlert from "@/components/full-alert";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function ErrorPage({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
	const error = (await searchParams).e;

	return (
		<Background>
			<FullAlert>
				<Alert variant={"destructive"}>
					<AlertTitle>Bugs? What bugs?</AlertTitle>
					<AlertDescription>
						{error
							? `There was an error: ${error}`
							: "I know there was an error, but I don't know what it is. Sorry, ask Aamir for help."}
					</AlertDescription>
				</Alert>
			</FullAlert>
		</Background>
	);
}
