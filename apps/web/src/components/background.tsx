"use client";
import { usePathname } from "next/navigation";
import PixelBlast from "@/components/pixel-blast";

export default function Background({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const pathname = usePathname();

	const isGamePage =
		pathname in ["/game/resources", "/game/battles", "/game/info"];

	return (
		<>
			<div className="fixed inset-0 opacity-40 fade-in">
				<PixelBlast
					variant="square"
					pixelSize={4}
					color="#B19EEF"
					patternScale={2}
					patternDensity={1}
					pixelSizeJitter={1}
					enableRipples={!isGamePage}
					rippleSpeed={0.9}
					rippleThickness={0.1}
					rippleIntensityScale={1}
					speed={isGamePage ? 0 : 0.1}
					edgeFade={0.05}
					transparent
				/>
			</div>
			{children}
		</>
	);
}
