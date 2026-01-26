import PixelBlast from "@/components/pixel-blast";

export default async function Background({
	children,
}: Readonly<{
	children: React.ReactNode;
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
					enableRipples
					rippleSpeed={0.9}
					rippleThickness={0.1}
					rippleIntensityScale={1}
					speed={0.1}
					edgeFade={0.05}
					transparent
				/>
			</div>
			{children}
		</>
	);
}
