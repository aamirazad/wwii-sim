import type { Metadata } from "next";
import { Geist_Mono, Nunito_Sans } from "next/font/google";
import ExternalLink from "@/components/ExternalLink";
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
	const commitHash = process.env.NEXT_PUBLIC_COMMIT_SHA?.substring(0, 7);

	return (
		<html suppressHydrationWarning lang="en">
			<body
				className={`${geistMono.variable} ${nunitoSans.variable} dark antialiased flex flex-col min-h-screen`}
			>
				<main className="grow flex flex-col">{children}</main>
				<footer className="relative z-10 p-4 flex flex-col items-center">
					<div className="hover:opacity-50 transition-color duration-300 opacity-0 text-sm sp">
						{commitHash ? (
							<p>
								Build{" "}
								<ExternalLink
									href={`https://github.com/aamirazad/wwii-sim/tree/${process.env.NEXT_PUBLIC_COMMIT_SHA}`}
								>
									{commitHash}
								</ExternalLink>
							</p>
						) : null}
					</div>
				</footer>
			</body>
		</html>
	);
}
