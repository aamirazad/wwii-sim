import Link from "next/link";

export default function LandingPage() {
	return (
		<>
			<main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col items-center justify-center gap-10 px-6 py-8">
				<section className="text-center">
					<h1 className="bg-clip-text font-extrabold text-4xl text-glow-orange text-white tracking-tight sm:text-5xl md:text-6xl">
						HASD WW2 Simulation
					</h1>
					<p className="mx-auto mt-4 max-w-2xl text-balance text-zinc-300">
						Learn history by playing it. Coordinate and strategize as nations in
						the Second World War. Wage war, forge alliances, and have fun.
					</p>
				</section>

				<div className="flex flex-wrap items-center justify-center gap-4">
					<Link
						href="/numbers"
						className="rounded-2xl bg-orange-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-orange-500 focus-visible:bg-orange-500"
					>
						Enter the App
					</Link>
					<Link
						href="/help"
						className="rounded-2xl border border-orange-900/40 bg-slate-900/60 px-6 py-3 text-slate-200 transition-colors hover:bg-slate-800/60 focus-visible:bg-slate-800/60"
					>
						Help
					</Link>
				</div>

				<section className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
					<div className="island rounded-3xl p-6">
						<h3 className="mb-2 font-semibold text-orange-300">
							Play as a Nation
						</h3>
						<p className="text-sm text-zinc-300">
							Take on roles and make decisions that shape outcomes.
						</p>
					</div>
					<div className="island rounded-3xl p-6">
						<h3 className="mb-2 font-semibold text-orange-300">
							Classroom Friendly
						</h3>
						<p className="text-sm text-zinc-300">
							Lightweight and fast, suitable for low-power devices.
						</p>
					</div>
				</section>
			</main>
			<div className="cursor-default py-4 text-center text-slate-500 text-xs">
				A HASD History Club Project by Aamir Azad
			</div>
		</>
	);
}
