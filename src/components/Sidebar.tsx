import Link from "next/link";

export default function Sidebar() {
	return (
		// The sidebar should be so rounded that it looks like an island on the side, not touching or comling close to the left or top edges

		<aside className="w-64 backdrop-blur-md shadow-xl p-4 flex flex-col justify-between">
			<div className="rounded-xl bg-slate-200 dark:bg-slate-700 px-4 py-2 h-full">
				<h2 className="mb-4 font-bold text-2xl">
					<Link href="/">HASD WW2 Sim</Link>
				</h2>
				<ul className="space-y-2">
					<ListItem href="/numbers">Numbers</ListItem>
					<ListItem href="/dashboard">Dashboard</ListItem>
					<ListItem href="/test">Test</ListItem>
					<ListItem href="/test2">Test2</ListItem>
				</ul>
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
				className="block items-center px-4 py-3 rounded-2xl bg-slate-600"
			>
				{children}
			</Link>
		</li>
	);
}
