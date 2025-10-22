"use client";

import { ViewTransition, useState, startTransition } from "react";
import { Video, Thumbnail, FullscreenVideo } from "./Video";
import videos from "./data";

export default function Component() {
	const [fullscreen, setFullscreen] = useState(false);
	if (fullscreen) {
		return (
			<FullscreenVideo
				video={videos[0]}
				onExit={() => startTransition(() => setFullscreen(false))}
			/>
		);
	}
	return (
		<Video
			video={videos[0]}
			onClick={() => startTransition(() => setFullscreen(true))}
		/>
	);
}
