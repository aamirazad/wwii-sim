import type { Metadata } from "next";
import { Geist_Mono, Nunito_Sans } from "next/font/google";
import Background from "@/components/background";
import "./globals.css";
import Script from "next/script";
import { Providers } from "./providers";

const nunitoSans = Nunito_Sans({ variable: "--font-nunito" });

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
				className={`${geistMono.variable} ${nunitoSans.variable} dark antialiased flex flex-col min-h-screen`}
			>
				<Script
					src="https://analytics.aamirazad.com/api/script.js"
					data-site-id="e7360f70ea78"
					strategy="lazyOnload"
					defer
				></Script>
				<Providers>
					<Background>
						<main className="grow flex flex-col">{children}</main>
					</Background>
				</Providers>
			</body>
		</html>
	);
}
