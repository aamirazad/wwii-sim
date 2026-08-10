export default function Background({
	children,
}: Readonly<{
	children: React.ReactNode;
	static?: boolean;
}>) {
	return (
		<>
			<div className="historical-backdrop fixed inset-0" />
			{children}
		</>
	);
}
