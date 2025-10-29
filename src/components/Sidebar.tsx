import Link from "next/link";

export default function Sidebar() {
	return (
		<aside className="flex w-64 shrink-0 flex-col justify-between">
			<div className="island flex h-full flex-col">
				<div className="shrink-0 border-orange-900/30 border-b px-6 py-5">
					<h2 className="font-extrabold text-2xl tracking-tight">
						<Link href="/" className="text-white hover:opacity-90">
							HASD <span className="text-orange-400">WW2</span> Sim
						</Link>
					</h2>
				</div>
				<nav className="flex-1 overflow-y-auto p-4">
					<ul className="space-y-2">
						<ListItem href="/numbers">Numbers</ListItem>
						<ListItem href="/help">Long Text</ListItem>
					</ul>
				</nav>
			</div>
		</aside>
	);
}

function ListItem({
	children,
	href,
}: {
	children: React.ReactNode;
	href: string;
}) {
	return (
		<li>
			<Link
				href={href}
				className="block items-center rounded-2xl bg-neutral-900/70 px-4 py-3 text-zinc-200 transition-colors hover:bg-neutral-800/70 focus-visible:bg-neutral-800/70"
			>
				{children}
			</Link>
		</li>
	);
}
