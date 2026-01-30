import FullAlert from "@/components/full-alert";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ServerOffline() {
	return (
		<FullAlert>
			<Alert variant="destructive" className="max-w-md">
				<AlertTitle>Server Unavailable</AlertTitle>
				<AlertDescription>
					The server is currently down. Please let Aamir know if you think this
					is a mistake.
				</AlertDescription>
			</Alert>
		</FullAlert>
	);
}
