import { ViewTransition } from "react";

export default function TestPage() {
	return (
		<ViewTransition name="title">
			<div className="text-2xl">Test2 Page</div>
		</ViewTransition>
	);
}
