export default function Sidebar() {
	return (
		// The sidebar should be so ounded that it looks like an island on the side, not touching or comling close to the left or top edgesi
		//
		<div className="fixed top-0 left-0 h-full w-64 rounded-xl border-slate-200 border-r-2 bg-background p-4 dark:border-slate-800">
			<h2 className="mb-4 font-bold text-2xl">Sidebar</h2>
		</div>
	);
}
