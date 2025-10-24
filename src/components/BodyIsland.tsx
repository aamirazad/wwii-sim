"use client";

import { useRef, useState } from "react";

export default function BodyIsland({
	children,
}: {
	children: React.ReactNode;
}) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const [showTopFade, setShowTopFade] = useState(false);
	const [showBottomFade, setShowBottomFade] = useState(true);

	const handleScroll = () => {
		const el = scrollRef.current;
		if (!el) return;

		const shouldShowTop = el.scrollTop > 0;
		const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 1;
		const shouldShowBottom = !atBottom;

		if (shouldShowTop !== showTopFade) setShowTopFade(shouldShowTop);
		if (shouldShowBottom !== showBottomFade)
			setShowBottomFade(shouldShowBottom);
	};

	return (
		<main className="island relative flex-1 content-visibility-auto">
			<div
				className={`pointer-events-none absolute top-0 right-0 left-0 h-24 bg-linear-to-b from-[#0E1116] to-transparent transition-opacity duration-300 ${showTopFade ? "opacity-100" : "opacity-0"}`}
			/>
			<div
				ref={scrollRef}
				className="h-full overflow-y-auto p-6"
				onScroll={handleScroll}
			>
				{children}
			</div>
			<div
				className={`pointer-events-none absolute right-0 bottom-0 left-0 h-32 bg-linear-to-t from-[#080A0E] to-transparent transition-opacity duration-300 ${showBottomFade ? "opacity-100" : "opacity-0"}`}
			/>
		</main>
	);
}
