export default function Center({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex flex-col items-center justify-center flex-1 pointer-events-none">
			<div className="pointer-events-auto text-center flex flex-col items-center gap-4 z-10">
				{children}
			</div>
		</div>
	);
}
