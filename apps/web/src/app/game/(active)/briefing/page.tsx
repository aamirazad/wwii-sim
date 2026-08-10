"use client";

import { useQuery } from "@tanstack/react-query";
import { Flag, Gauge, ScrollText } from "lucide-react";
import { useMemo, useState } from "react";
import CountryDashboard from "@/components/country-dashboard";
import LoadingSpinner from "@/components/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useGamePageGuard } from "@/hooks/useGamePageGuard";
import { api } from "@/lib/api";
import { getUserId } from "@/lib/cookies";
import { useGame } from "../../GameContext";

const titleCase = (value: string) =>
	value
		.replace(/([A-Z])/g, " $1")
		.replace(/^./, (letter) => letter.toUpperCase());

export default function BriefingPage() {
	const { gameState, userState } = useGame();
	const userId = getUserId();
	const [selectedCountryId, setSelectedCountryId] = useState<number | null>(
		null,
	);
	useGamePageGuard({ requires: "active-game", gameState, userState });

	const gameId = gameState.status === "has-game" ? gameState.game.id : null;
	const userCountry =
		userState.status === "authenticated" ? userState.user.country : null;
	const isMod =
		userState.status === "authenticated" &&
		(userState.user.country === "Mods" || userState.user.role === "admin");

	const { data: countriesData } = useQuery({
		queryKey: ["countries", gameId],
		queryFn: async () => {
			if (!userId || !gameId) throw new Error("Not ready");
			const response = await api
				.game({ gameId: String(gameId) })
				.countries.get({ query: { authorization: userId } });
			if (response.error || !response.data || response.data.error)
				throw new Error("Failed to load countries");
			return response.data.countries;
		},
		enabled: !!userId && !!gameId,
	});

	const countries = useMemo(
		() => (countriesData ?? []).filter((item) => item.name !== "Mods"),
		[countriesData],
	);
	const country = useMemo(() => {
		if (isMod)
			return (
				countries.find((item) => item.id === selectedCountryId) ?? countries[0]
			);
		return countries.find((item) => item.name === userCountry);
	}, [countries, isMod, selectedCountryId, userCountry]);

	const { data, isLoading } = useQuery({
		queryKey: ["country-rules", gameId, country?.id],
		queryFn: async () => {
			if (!userId || !gameId || !country) throw new Error("Not ready");
			const response = await api
				.game({ gameId: String(gameId) })
				.country({ countryId: String(country.id) })
				.rules.get({ query: { authorization: userId } });
			if (
				response.error ||
				!response.data ||
				response.data.error !== false ||
				!("rules" in response.data)
			)
				throw new Error("Failed to load country rules");
			return response.data;
		},
		enabled: !!userId && !!gameId && !!country,
	});

	if (gameState.status !== "has-game" || !country || !data || isLoading)
		return <LoadingSpinner />;
	const { rules } = data;
	const currentLevels = {
		oil: country.oilLevel,
		steel: country.steelLevel,
		population: country.populationLevel,
	};

	return (
		<CountryDashboard tab="Briefing">
			<div className="mx-auto w-full max-w-6xl space-y-8">
				<div className="flex flex-wrap items-end justify-between gap-4 border-b pb-6">
					<div>
						<h2 className="flex items-center gap-3 font-serif text-3xl font-semibold">
							<ScrollText className="size-6 text-primary" /> {country.name}{" "}
							field briefing
						</h2>
						<p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
							Your national statistics sheet remains available here throughout
							the simulation.
						</p>
					</div>
					{isMod && (
						<div className="w-64 space-y-2">
							<Label>Inspect country</Label>
							<Select
								value={String(country.id)}
								onValueChange={(value) => setSelectedCountryId(Number(value))}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{countries.map((item) => (
										<SelectItem key={item.id} value={String(item.id)}>
											{item.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}
				</div>

				<section>
					<h3 className="flex items-center gap-2 font-serif text-xl font-semibold">
						<Gauge className="size-5 text-primary" /> National status
					</h3>
					<div className="mt-4 grid gap-px border bg-border sm:grid-cols-3 lg:grid-cols-6">
						{[
							["Oil", country.oil, `Level ${country.oilLevel}`],
							["Steel", country.steel, `Level ${country.steelLevel}`],
							[
								"Population",
								country.population,
								`Level ${country.populationLevel}`,
							],
							[
								"Morale",
								country.morale,
								country.morale === 0
									? "Defeated"
									: country.morale < 20
										? "−25% production"
										: country.morale < 40
											? "−10% production"
											: "Stable",
							],
							["Tokens", country.tokens, "Available"],
							[
								"Last year processed",
								country.lastProcessedYear,
								"Automatic production",
							],
						].map(([label, value, detail]) => (
							<div key={label} className="bg-card p-4">
								<p className="text-xs font-semibold text-muted-foreground">
									{label}
								</p>
								<p className="mt-1 font-mono text-2xl font-bold">{value}</p>
								<p className="mt-1 text-xs text-muted-foreground">{detail}</p>
							</div>
						))}
					</div>
					<div className="mt-3 border-l-2 border-primary px-4 py-2 text-sm leading-6">
						<span className="font-semibold">National token:</span>{" "}
						{rules.tokenEffect}
					</div>
				</section>

				<section>
					<h3 className="flex items-center gap-2 font-serif text-xl font-semibold">
						<Flag className="size-5 text-primary" /> National objectives
					</h3>
					<div className="mt-4 divide-y border">
						{rules.objectives.map((objective, index) => (
							<div
								key={objective.objective}
								className="grid gap-2 bg-card/60 p-4 sm:grid-cols-[2rem_1fr_0.8fr]"
							>
								<span className="font-mono text-muted-foreground">
									{index + 1}
								</span>
								<p>{objective.objective}</p>
								<p className="text-sm text-primary">{objective.reward}</p>
							</div>
						))}
					</div>
				</section>

				<section>
					<h3 className="font-serif text-xl font-semibold">
						Starting capabilities
					</h3>
					<div className="mt-4 flex flex-wrap gap-2">
						{Object.entries(rules.startingResearch).length > 0 ? (
							Object.entries(rules.startingResearch).map(([name, level]) => (
								<Badge key={name} variant="outline">
									{titleCase(name)} · level {level}
								</Badge>
							))
						) : (
							<p className="text-sm text-muted-foreground">
								No starting research.
							</p>
						)}
					</div>
				</section>

				<section>
					<h3 className="font-serif text-xl font-semibold">
						Annual production by level
					</h3>
					<p className="mt-2 text-sm text-muted-foreground">
						When a year advances, every resource level rises by one and the
						corresponding row is added automatically. Morale reductions are
						applied afterward.
					</p>
					<div className="mt-4 overflow-x-auto border">
						<table className="w-full min-w-xl text-sm">
							<thead className="bg-muted">
								<tr>
									<th className="p-3 text-left">Level</th>
									<th className="p-3 text-right">Oil</th>
									<th className="p-3 text-right">Steel</th>
									<th className="p-3 text-right">Population</th>
								</tr>
							</thead>
							<tbody className="divide-y">
								{rules.production.map((row, index) => {
									const level = index + 1;
									const isCurrent =
										Object.values(currentLevels).includes(level);
									return (
										<tr
											key={level}
											className={isCurrent ? "bg-primary/10" : "bg-card/40"}
										>
											<td className="p-3 font-mono">
												{level}
												{isCurrent && (
													<span className="ml-2 text-xs text-primary">
														current
													</span>
												)}
											</td>
											<td className="p-3 text-right font-mono">{row.oil}</td>
											<td className="p-3 text-right font-mono">{row.steel}</td>
											<td className="p-3 text-right font-mono">
												{row.population}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</section>
			</div>
		</CountryDashboard>
	);
}
