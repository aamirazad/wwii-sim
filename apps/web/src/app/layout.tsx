import type { Metadata } from "next";
import { Geist_Mono, Nunito_Sans } from "next/font/google";
import Background from "@/components/background";
import ExternalLink from "@/components/external-link";
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
	const commitHash = process.env.NEXT_PUBLIC_COMMIT_SHA?.substring(0, 7);

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
						<footer className="relative p-4 flex flex-col items-end">
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
					</Background>
				</Providers>
			</body>
		</html>
	);
}
