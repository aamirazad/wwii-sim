"use client";

import PixelBlast from "@/components/pixel-blast";

export default function Background({
	children,
	static: isStatic = false,
}: Readonly<{
	children: React.ReactNode;
	static?: boolean;
}>) {
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
					enableRipples={!isStatic}
					rippleSpeed={0.9}
					rippleThickness={0.1}
					rippleIntensityScale={1}
					speed={isStatic ? 0 : 0.1}
					edgeFade={0.05}
					transparent
				/>
			</div>
			{children}
		</>
	);
}
