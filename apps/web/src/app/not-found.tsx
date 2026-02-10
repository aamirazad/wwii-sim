import Link from "next/link";
import Background from "@/components/background";
import FullAlert from "@/components/full-alert";
import { Button } from "@/components/ui/button";
import { links } from "@/data/oreo";

export default function NotFound() {
	const link = links[Math.floor(Math.random() * links.length)];
	return (
		<Background>
			<FullAlert>
				<div className="flex flex-col lg:flex-row items-center h-screen justify-center gap-12 lg:gap-24 p-4 lg:p-8">
					<div className="flex flex-col items-center justify-center text-center">
						<h3 className="mb-4 text-2xl font-bold tracking-wider uppercase text-foreground">
							Unknown Page
						</h3>

						<div className="relative mb-8">
							<h1
								className="select-none text-7xl font-black  sm:text-9xl"
								style={{
									WebkitTextStroke: "3px var(--color-foreground)",
									textShadow: "8px 8px 0px var(--color-foreground)",
								}}
							>
								ERROR 404
							</h1>
						</div>

						<Button
							nativeButton={false}
							render={<Link href="/">Return To Home</Link>}
							size="lg"
							className="h-14 rounded-none border-2 border-foreground bg-foreground px-8 text-xl font-bold text-background shadow-[4px_4px_0px_0px_var(--color-foreground)] transition-transform hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_0px_var(--color-foreground)] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0px_0px_var(--color-foreground)] hover:bg-foreground/90"
						></Button>
					</div>

					<div className="flex flex-col items-center gap-6">
						<p className="max-w-100 text-lg font-medium text-foreground italic">
							We can't seem to find the page you're looking for. Here is a
							picture of my cat to make up for it.
						</p>
						<div className="relative group max-w-100">
							<div className="absolute inset-0 translate-x-3 translate-y-3 rounded-2xl bg-foreground transition-transform group-hover:translate-x-4 group-hover:translate-y-4" />
							{/** biome-ignore lint/performance/noImgElement: I don't care */}
							<img
								src={link}
								alt="My Cat"
								className="pointer-events-none relative z-10 w-full rounded-2xl border-4 border-foreground object-cover shadow-xl transition-transform group-hover:-translate-x-1 group-hover:-translate-y-1"
							/>
						</div>
					</div>
				</div>
			</FullAlert>
		</Background>
	);
}
