"use client";

import { CircleHelp, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const HELP: Record<string, Array<{ title: string; body: string }>> = {
	Assets: [
		{
			title: "Resources and levels",
			body: "Oil moves and maintains forces, steel builds forces and funds research, and population represents the people committed to the war. Every country starts at level 5. When the year advances, levels and the matching production amount update automatically, including morale effects.",
		},
		{
			title: "Building troops",
			body: "Enter the dice you are buying, then allocate every purchased die to a named location. Infantry costs 2 population, 1 oil, and 1 steel. Other costs are shown beside the form. Research can increase the number of dice created; Russia creates twice the purchased amount.",
		},
		{
			title: "Moving forces",
			body: "A moved die normally costs 1 oil regardless of distance. Creating a new destination in the location editor is a movement; existing location names are locked so a force cannot move for free by renaming its position. Foreign occupation also costs oil each year and should be recorded in an operation.",
		},
		{
			title: "Trading",
			body: "Both countries must agree. Every four total resources moving in either direction costs the initiator 1 oil and 1 steel, rounded up. The transfer and fee settle atomically when the recipient accepts.",
		},
	],
	Research: [
		{
			title: "Making a roll",
			body: "Request one level, then tell a moderator high (4–6) or low (1–3) before five d6 are rolled. The number of correct dice required increases with each level you earn. Research a country started with does not make later rolls harder.",
		},
		{
			title: "Costs and failures",
			body: "The full country-specific price is charged on success. A failed roll consumes half of the listed materials, rounded up. A pending request does not reserve resources, so keep enough available for the moderator to resolve it.",
		},
		{
			title: "Unlocks",
			body: "Submarine Warfare level 1 unlocks submarines and Spy Evade level 1 unlocks spies. Nuclear programs are moderator-run and normally limited to the United States, Russia, and Germany.",
		},
	],
	Operations: [
		{
			title: "Battle plans",
			body: "Choose the exact source, target, troop dice, and high-or-low call. Explain routes, timing, supply, support, fallback positions, and the territory you intend to take. Detailed plans can earn moderator bonuses and improve retreat outcomes.",
		},
		{
			title: "Resolving combat",
			body: "Each committed die normally rolls one d6. Correct high-or-low dice are compared. Moderators determine casualties, then surviving forces make a retreat roll so armies do not simply vanish. The moderator records the final territory and survivors.",
		},
		{
			title: "Other dispatches",
			body: "Use movement for unusual relocations or occupation, spy for infiltration and intelligence, conference for face-to-face diplomacy, and general for anything else. The queue order and status are public; private battle prose is only visible to the country and moderators.",
		},
	],
	"Message Board": [
		{
			title: "PSAs and replies",
			body: "Moderators publish global or targeted public-service announcements. Countries can reply directly beneath any PSA they can see, keeping questions and rulings next to the original message.",
		},
		{
			title: "Country announcements",
			body: "Each country may publish up to three global announcements per year. Use them for meaningful declarations, diplomatic positions, or public updates. Private strategy belongs in an operation or in-person conference.",
		},
		{
			title: "Calling a moderator",
			body: "Call a moderator when your table needs an in-person ruling. The request appears in the public Operations queue so every team can see its place.",
		},
	],
	Schedule: [
		{
			title: "Automatic years",
			body: "The schedule persists in the API database and survives restarts. When a year changes, country levels, morale effects, and resource production are processed before the new year is broadcast to players.",
		},
	],
	Briefing: [
		{
			title: "Your national rules",
			body: "This page is the live version of your country statistics sheet. It contains your national objectives, token effect, starting capabilities, and the full production table used when resource levels advance.",
		},
		{
			title: "Objectives",
			body: "Objectives are reviewed by moderators. Their rewards can change levels, morale, resources, or national restrictions. Tell a moderator when your team believes it has completed one.",
		},
		{
			title: "Morale",
			body: "Morale bonuses apply before annual production. At 51–70 gain 1 oil, 1 steel, and 5 population; at 71–80 gain 2 oil, 2 steel, and 5 population; at 81–90 gain 3 oil, 3 steel, and 6 population; at 91–100 gain one extra level of every resource. Low morale carries political consequences determined by moderators.",
		},
		{
			title: "Scrap metal drives",
			body: "A country may hold one drive per year and three in the entire game. The first rolls 4d6 steel, the second 2d6, and the third 1d6. The result is immediately recorded in resources and the audit log.",
		},
	],
};

export function HelpDrawer({ page }: { page: string }) {
	const [open, setOpen] = useState(false);
	const sections = HELP[page] ?? HELP.Assets;
	return (
		<>
			<Button
				variant="ghost"
				size="sm"
				onClick={() => setOpen(true)}
				aria-label={`Help for ${page}`}
			>
				<CircleHelp /> Help
			</Button>
			{open && (
				<div className="fixed inset-0 z-50" role="presentation">
					<button
						type="button"
						className="absolute inset-0 bg-black/55"
						aria-label="Close help"
						onClick={() => setOpen(false)}
					/>
					<aside
						className="absolute right-0 top-0 h-full w-[min(28rem,92vw)] overflow-y-auto border-l bg-background p-6 shadow-2xl"
						aria-label={`${page} help`}
					>
						<div className="flex items-center justify-between border-b pb-4">
							<div>
								<h2 className="font-serif text-2xl font-semibold">
									{page} field manual
								</h2>
								<p className="mt-1 text-sm text-muted-foreground">
									Rules stay here while you play.
								</p>
							</div>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setOpen(false)}
							>
								<X />
								<span className="sr-only">Close help</span>
							</Button>
						</div>
						<div className="divide-y">
							{sections.map((section) => (
								<section key={section.title} className="py-5">
									<h3 className="font-serif text-lg font-semibold">
										{section.title}
									</h3>
									<p className="mt-2 text-sm leading-6 text-muted-foreground">
										{section.body}
									</p>
								</section>
							))}
						</div>
					</aside>
				</div>
			)}
		</>
	);
}
