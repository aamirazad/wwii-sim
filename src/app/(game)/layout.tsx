import type { Metadata } from "next";
import "@/app/globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import BodyIsland from "@/components/BodyIsland";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
	title: "HASD WW2 Sim",
	description:
		"A game where students play the countries in the Second World War",
	icons: {
		icon: "/favicon.ico",
	},
};

export default function IslandLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<ClerkProvider dynamic>
			<ConvexClientProvider>
				<div className="mx-6 flex h-screen gap-4 overflow-hidden">
					<Sidebar />
					<BodyIsland>{children}</BodyIsland>
				</div>
			</ConvexClientProvider>
		</ClerkProvider>
	);
}
