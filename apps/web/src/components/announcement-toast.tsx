"use client";

import { Megaphone, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { useGame } from "@/app/game/GameContext";

export function AnnouncementToastListener() {
	const { subscribeToMessage, userState } = useGame();
	const router = useRouter();

	const userCountry =
		userState.status === "authenticated" ? userState.user.country : null;
	const isMod = userCountry === "Mods";

	useEffect(() => {
		const unsubscribe = subscribeToMessage("server.announcement", (message) => {
			if (message.type !== "server.announcement") return;

			const { announcement } = message;

			// Check if this announcement is relevant to the user
			const isRelevant =
				isMod ||
				!announcement.targetCountries ||
				(userCountry &&
					announcement.targetCountries.includes(userCountry as never));

			if (!isRelevant) return;

			// Truncate content for the toast preview
			const previewContent =
				announcement.content.length > 120
					? `${announcement.content.substring(0, 120)}...`
					: announcement.content;

			// Remove any markdown for the preview
			const cleanPreview = previewContent
				.replace(/[#*_~`]/g, "")
				.replace(/\n+/g, " ");

			toast(
				<div className="relative flex items-start gap-4 w-full text-left p-1">
					<button
						type="button"
						className="relative flex items-start gap-4 cursor-pointer flex-1 text-left"
						onClick={() => {
							router.push("/game/announcements");
							toast.dismiss();
						}}
					>
						<div className="shrink-0 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 relative z-10">
							<Megaphone className="h-6 w-6 text-primary" />
						</div>

						<div className="flex-1 min-w-0 relative z-10">
							<div className="flex items-center justify-between mb-1">
								<p className="font-bold text-base text-slate-100 tracking-tight">
									New Announcement
								</p>
							</div>

							<p className="text-sm text-slate-300 line-clamp-2 leading-relaxed mb-2">
								{cleanPreview}
							</p>

							<div className="flex items-center gap-2">
								<div className="h-1px grow bg-white/5" />
								<p className="text-[10px] uppercase font-bold text-muted-foreground whitespace-nowrap">
									By {announcement.createdBy}
								</p>
							</div>
						</div>
					</button>

					<button
						type="button"
						className="pl-15 pb-5 justify-self-end text-slate-400 hover:text-slate-200 relative z-10"
						onClick={() => toast.dismiss()}
					>
						<X />
					</button>
				</div>,
				{
					duration: Infinity,
					className: "announcement-toast overflow-hidden",
				},
			);
		});

		return unsubscribe;
	}, [subscribeToMessage, router, userCountry, isMod]);

	return null;
}
