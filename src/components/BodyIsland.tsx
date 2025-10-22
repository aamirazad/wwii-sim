export default function BodyIsland({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<main className="flex-1 rounded-3xl shadow-xl p-4 bg-slate-700 m-4">
			{children}
		</main>
	);
}
