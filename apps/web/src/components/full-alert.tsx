import Center from "./center";

export default function FullAlert({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh]">
			<Center>{children}</Center>
		</div>
	);
}
