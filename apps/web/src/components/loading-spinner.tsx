import FullAlert from "./full-alert";

export default function LoadingSpinner() {
	return (
		<FullAlert>
			<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
			<p className="text-muted-foreground">Loading...</p>
		</FullAlert>
	);
}
