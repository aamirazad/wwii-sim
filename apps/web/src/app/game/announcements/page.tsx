"use client";

import type { Announcement, PlayableCountry } from "@api/schema";
import { PLAYABLE_COUNTRIES } from "@api/schema";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Megaphone, Send, Users } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import CountryDashboard from "@/components/country-dashboard";
import LoadingSpinner from "@/components/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxItem,
	ComboboxList,
	ComboboxValue,
} from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGamePageGuard } from "@/hooks/useGamePageGuard";
import { api } from "@/lib/api";
import { getUserId } from "@/lib/cookies";
import { useGame } from "../GameContext";

function AnnouncementCard({
	announcement,
	index,
}: {
	announcement: Announcement;
	index: number;
}) {
	const formattedDate = new Date(announcement.createdAt).toLocaleString(
		undefined,
		{
			month: "short",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
		},
	);

	// Basic markdown-like rendering
	const renderContent = (content: string) => {
		const lines = content.split("\n");
		const elements: React.ReactNode[] = [];
		let currentParagraph: React.ReactNode[] = [];
		let key = 0;

		const flushParagraph = () => {
			if (currentParagraph.length > 0) {
				elements.push(
					<p
						key={key++}
						className="mb-4 text-sm leading-relaxed text-slate-300"
					>
						{currentParagraph}
					</p>,
				);
				currentParagraph = [];
			}
		};

		lines.forEach((line, i) => {
			const trimmed = line.trim();

			if (trimmed === "") {
				flushParagraph();
				return;
			}

			if (line.startsWith("### ")) {
				flushParagraph();
				elements.push(
					<h3
						key={key++}
						className="text-lg font-bold mt-1 mb-2 text-primary/90 tracking-tight"
					>
						{processInlineFormatting(line.slice(4))}
					</h3>,
				);
				return;
			}
			if (line.startsWith("## ")) {
				flushParagraph();
				elements.push(
					<h2
						key={key++}
						className="text-xl font-bold mt-2 mb-3 text-primary tracking-tight"
					>
						{processInlineFormatting(line.slice(3))}
					</h2>,
				);
				return;
			}
			if (line.startsWith("# ")) {
				flushParagraph();
				elements.push(
					<h1
						key={key++}
						className="text-2xl font-extrabold mt-3 mb-4 text-primary tracking-tighter decoration-primary/30 underline decoration-4 underline-offset-4"
					>
						{processInlineFormatting(line.slice(2))}
					</h1>,
				);
				return;
			}

			if (currentParagraph.length > 0) {
				// Add space between lines in the same paragraph if they are physically separated in source but not by empty line?
				// Markdown usually treats single newline as space.
				currentParagraph.push(" ");
			}
			currentParagraph.push(
				<span key={`span-${i}`}>{processInlineFormatting(line)}</span>,
			);
		});

		flushParagraph();
		return elements;
	};

	// Process bold and italic
	const processInlineFormatting = (text: string) => {
		const parts: React.ReactNode[] = [];
		let remaining = text;
		let key = 0;

		while (remaining.length > 0) {
			// Bold: **text**
			const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
			// Italic: *text* or _text_
			const italicMatch = remaining.match(/(?<!\*)\*([^*]+)\*(?!\*)|_([^_]+)_/);

			const foundMatches: {
				match: RegExpMatchArray;
				type: "bold" | "italic";
			}[] = [];
			if (boldMatch && typeof boldMatch.index === "number") {
				foundMatches.push({ match: boldMatch, type: "bold" });
			}
			if (italicMatch && typeof italicMatch.index === "number") {
				foundMatches.push({ match: italicMatch, type: "italic" });
			}

			if (foundMatches.length > 0) {
				// Sort by index to find the first occurring match
				foundMatches.sort(
					(a, b) => (a.match.index ?? 0) - (b.match.index ?? 0),
				);
				const first = foundMatches[0];
				const { match, type } = first;
				const index = match.index ?? 0;

				if (index > 0) {
					parts.push(remaining.slice(0, index));
				}

				if (type === "bold") {
					parts.push(
						<strong key={key++} className="font-bold text-white">
							{match[1]}
						</strong>,
					);
				} else {
					parts.push(
						<em key={key++} className="italic text-slate-200">
							{match[1] || match[2]}
						</em>,
					);
				}
				remaining = remaining.slice(index + match[0].length);
			} else {
				parts.push(remaining);
				break;
			}
		}

		return parts;
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, amount: 0.2 }}
			transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5) }}
		>
			<Card className="overflow-hidden border-primary/20 bg-black/40 backdrop-blur-md shadow-lg shadow-primary/5 hover:bg-black/80 transition-colors duration-300 pt-0">
				<CardHeader className="pt-4 border-b border-white/5 bg-white/5 relative z-10 rounded-t-xl">
					<div className="flex items-start justify-between gap-4">
						<div className="flex items-center gap-3">
							<div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
								<Megaphone className="h-5 w-5 text-primary" />
							</div>
							<div>
								<span className="font-bold text-base block leading-none mb-1 text-slate-100">
									{announcement.createdBy}
								</span>
								<div className="flex items-center gap-2 text-xs text-muted-foreground">
									<span>{formattedDate}</span>
								</div>
							</div>
						</div>

						<div className="flex items-center">
							{announcement.targetCountries ? (
								<Popover>
									<PopoverTrigger openOnHover>
										<Badge
											variant="outline"
											className="bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 transition-colors"
										>
											<Users className="h-3 w-3" />
										</Badge>
									</PopoverTrigger>
									<PopoverContent>
										<div className="flex flex-wrap gap-2">
											<span className="text-xs text-muted-foreground self-center mr-1">
												To:
											</span>
											{announcement.targetCountries.map((country) => (
												<Badge
													key={country}
													variant="secondary"
													className="text-xs bg-white/5 hover:bg-white/10 text-slate-300 border-white/5"
												>
													{country}
												</Badge>
											))}
										</div>
									</PopoverContent>
								</Popover>
							) : (
								<Tooltip>
									<TooltipTrigger>
										<Badge
											variant="outline"
											className="bg-emerald-500/5 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10 transition-colors"
										>
											<Globe className="h-3 w-3" />
										</Badge>
									</TooltipTrigger>
									<TooltipContent>Global announcement</TooltipContent>
								</Tooltip>
							)}
						</div>
					</div>
				</CardHeader>
				<CardContent className="relative z-10">
					<div className="prose prose-invert prose-sm max-w-none">
						{renderContent(announcement.content)}
					</div>
				</CardContent>
			</Card>
		</motion.div>
	);
}

function AnnouncementForm({ gameId }: { gameId: number }) {
	const userId = getUserId();
	const queryClient = useQueryClient();
	const [content, setContent] = useState("");
	const [targetCountries, setTargetCountries] = useState<PlayableCountry[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const anchor = useRef(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!userId || !content.trim()) return;

		setIsSubmitting(true);
		setError(null);

		try {
			const response = await api
				.game({ gameId: String(gameId) })
				.announcements.post(
					{
						content: content.trim(),
						targetCountries:
							targetCountries.length > 0 ? targetCountries : undefined,
					},
					{
						query: { authorization: userId },
					},
				);

			if (response.error) {
				const errorValue = response.error.value;
				setError(
					errorValue && "message" in errorValue && errorValue.message
						? errorValue.message
						: "Failed to create announcement",
				);
				return;
			}

			// Reset form
			setContent("");
			setTargetCountries([]);
			queryClient.invalidateQueries({ queryKey: ["announcements"] });
		} catch {
			setError("Failed to create announcement");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Card className="mb-6">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Megaphone className="h-5 w-5" />
					Create Announcement
				</CardTitle>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="content">Message</Label>
						<Textarea
							id="content"
							placeholder="Write your announcement here..."
							value={content}
							onChange={(e) => setContent(e.target.value)}
							className="min-h-37.5 font-mono text-sm"
							required
						/>
						<p className="text-xs text-muted-foreground">
							Supports headings (#, ##, ###), **bold**, and *italic* formatting
						</p>
					</div>

					<div className="space-y-2">
						<Label>Target Countries</Label>
						<Combobox
							multiple
							value={targetCountries}
							onValueChange={setTargetCountries}
							items={PLAYABLE_COUNTRIES}
						>
							<ComboboxChips ref={anchor} className="w-full">
								<ComboboxValue>
									{(values) => (
										<>
											{values.map((value: string) => (
												<ComboboxChip key={value}>{value}</ComboboxChip>
											))}
											<ComboboxChipsInput
												placeholder={
													targetCountries.length === 0 ? "Add a country..." : ""
												}
											/>
										</>
									)}
								</ComboboxValue>
							</ComboboxChips>
							<ComboboxContent anchor={anchor}>
								<ComboboxEmpty>No countries found</ComboboxEmpty>
								<ComboboxList>
									{(item) => (
										<ComboboxItem key={item} value={item}>
											{item}
										</ComboboxItem>
									)}
								</ComboboxList>
							</ComboboxContent>
						</Combobox>
						<p className="text-xs text-muted-foreground">
							Leave empty to send to everyone
						</p>
					</div>

					{error && <p className="text-sm text-destructive">{error}</p>}

					<Button type="submit" disabled={isSubmitting || !content.trim()}>
						<Send className="h-4 w-4 mr-2" />
						{isSubmitting ? "Sending..." : "Send Announcement"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}

export default function AnnouncementsPage() {
	const { gameState, userState, subscribeToMessage } = useGame();
	const userId = getUserId();
	const queryClient = useQueryClient();

	const userCountry =
		userState.status === "authenticated" ? userState.user.country : null;
	const isMod = userCountry === "Mods";

	const { data: announcementsData, isLoading } = useQuery({
		queryKey: ["announcements", gameState],
		queryFn: async () => {
			if (!userId || gameState.status !== "has-game")
				throw new Error("Not ready");
			const response = await api
				.game({ gameId: String(gameState.game.id) })
				.announcements.get({
					query: { authorization: userId },
				});
			if (response.error) throw new Error("Failed to fetch announcements");
			return response.data;
		},
		enabled: !!userId && gameState.status === "has-game",
	});

	// Subscribe to new announcements
	useEffect(() => {
		const unsubscribe = subscribeToMessage("server.announcement", () => {
			queryClient.invalidateQueries({ queryKey: ["announcements"] });
		});
		return unsubscribe;
	}, [subscribeToMessage, queryClient]);

	// Guard: requires active game (mods always have access)
	useGamePageGuard({
		requires: "active-game",
		gameState,
		userState,
	});

	if (gameState.status !== "has-game") return <LoadingSpinner />;

	const announcements =
		announcementsData && !announcementsData.error
			? announcementsData.announcements
			: [];

	return (
		<CountryDashboard tab="Message Board">
			<div className="max-w-3xl mx-auto">
				{isMod && <AnnouncementForm gameId={gameState.game.id} />}

				<div className="space-y-4">
					{isLoading ? (
						<p className="text-muted-foreground text-center py-8">
							Loading announcements...
						</p>
					) : announcements.length === 0 ? (
						<Card className="border-dashed">
							<CardContent className="py-12 text-center">
								<Megaphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
								<p className="text-muted-foreground">No announcements yet</p>
								{isMod && (
									<p className="text-sm text-muted-foreground mt-1">
										Create the first announcement above
									</p>
								)}
							</CardContent>
						</Card>
					) : (
						announcements.map((announcement, index) => (
							<AnnouncementCard
								key={announcement.id}
								announcement={announcement}
								index={index}
							/>
						))
					)}
				</div>
			</div>
		</CountryDashboard>
	);
}
