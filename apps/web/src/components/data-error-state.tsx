"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import FullAlert from "@/components/full-alert";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function DataErrorState({
	title = "Unable to load this page",
	message = "The game data could not be loaded. Check your connection and try again.",
	onRetry,
}: {
	title?: string;
	message?: string;
	onRetry?: () => void;
}) {
	return (
		<FullAlert>
			<Alert variant="destructive" className="max-w-lg">
				<AlertCircle />
				<AlertTitle>{title}</AlertTitle>
				<AlertDescription>{message}</AlertDescription>
			</Alert>
			{onRetry && (
				<Button type="button" variant="outline" onClick={onRetry}>
					<RefreshCw /> Try again
				</Button>
			)}
		</FullAlert>
	);
}
