import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
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

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html suppressHydrationWarning={true} lang="en">
			<body>
				<ClerkProvider dynamic>
					<ConvexClientProvider>
						<Sidebar />
						{children}
					</ConvexClientProvider>
				</ClerkProvider>
			</body>
		</html>
	);
}
