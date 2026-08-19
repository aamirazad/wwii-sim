import type { Metadata } from "next";
import { Geist_Mono, Libre_Baskerville, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const sourceSans = Source_Sans_3({
	variable: "--font-source-sans",
	subsets: ["latin"],
});
const libreBaskerville = Libre_Baskerville({
	variable: "--font-libre-baskerville",
	weight: ["400", "700"],
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "WWII Sim",
	description: "Created by Aamir Azad and HASD History Club",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html suppressHydrationWarning lang="en">
			<body
				className={`${geistMono.variable} ${sourceSans.variable} ${libreBaskerville.variable} antialiased flex flex-col min-h-screen`}
			>
				<Providers>
					<main className="grow flex flex-col">{children}</main>
				</Providers>
			</body>
		</html>
	);
}
