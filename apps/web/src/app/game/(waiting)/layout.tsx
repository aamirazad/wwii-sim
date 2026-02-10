import Background from "@/components/background";

export default function WaitingGameLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <Background>{children}</Background>;
}
