import PixelBlast from "@/components/PixelBlast";

export default async function LandingPage({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<>
			<div className="z-0 fixed inset-0 opacity-40 fade-in">
				<PixelBlast
					variant="square"
					pixelSize={4}
					color="#B19EEF"
					patternScale={2}
					patternDensity={1}
					pixelSizeJitter={0}
					enableRipples
					rippleSpeed={0.4}
					rippleThickness={0.1}
					rippleIntensityScale={1}
					speed={0.6}
					edgeFade={0.05}
					transparent
				/>
			</div>
			<div className="relative z-10 pointer-events-none flex flex-col items-center justify-center flex-1">
				<div className="pointer-events-auto max-w-2/5  text-center">
					<p className="pb-2">HASD History Club & Aamir Azad present</p>
					<h1 className="text-5xl font-bold">The WWII Sim</h1>
					<p className="italic">In Beta!</p>
					{children}
				</div>
			</div>
		</>
	);
}
