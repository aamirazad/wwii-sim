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
	const commitHash = process.env.NEXT_PUBLIC_COMMIT_SHA?.substring(0, 7);

	return (
		<html suppressHydrationWarning lang="en">
			<body
				className={`${geistMono.variable} ${nunitoSans.variable} dark antialiased flex flex-col min-h-screen`}
			>
				<main className="grow">{children}</main>
				<footer className="relative z-10 p-4 flex flex-col items-center">
					<div className="opacity-30 text-sm">
						{commitHash ? (
							<p>
								Build{" "}
								<a
									target="_blank"
									rel="noopener noreferrer"
									href={`https://github.com/aamirazad/wwii-sim/tree/${process.env.NEXT_PUBLIC_COMMIT_SHA}`}
								>
									{commitHash}
								</a>
							</p>
						) : null}
					</div>
				</footer>
			</body>
		</html>
	);
}
