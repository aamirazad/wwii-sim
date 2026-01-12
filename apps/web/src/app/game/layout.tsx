"use client";

import { NewYearDialog } from "@/components/new-year-dialog";
import { GameProvider } from "./GameContext";

export default function GameLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<GameProvider>
			{children}
			<NewYearDialog />
		</GameProvider>
	);
}
