import { ViewTransition } from "react";
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "HASD WW2 Sim",
	description:
		"A game where students play the countries in the Second World War",
	icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html suppressHydrationWarning className="dark" lang="en">
			<body className="app-bg min-h-screen">
				<ViewTransition>{children}</ViewTransition>
			</body>
		</html>
	);
}
