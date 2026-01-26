"use client";

import { AnnouncementToastListener } from "@/components/announcement-toast";
import { NewYearDialog } from "@/components/new-year-dialog";
import { Toaster } from "@/components/ui/sonner";
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
			<Toaster position="bottom-right" expand richColors />
			<AnnouncementToastListener />
		</GameProvider>
	);
}
