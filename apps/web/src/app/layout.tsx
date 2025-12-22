import type { Metadata } from "next";
import { Geist_Mono, Nunito_Sans } from "next/font/google";
import "./globals.css";

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
				className={`${geistMono.variable} ${nunitoSans.variable} dark antialiased`}
			>
				{children}
			</body>
		</html>
	);
}
