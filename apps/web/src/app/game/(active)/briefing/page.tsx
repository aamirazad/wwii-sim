"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dices, Flag, Gauge, ScrollText } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import CountryDashboard from "@/components/country-dashboard";
import DataErrorState from "@/components/data-error-state";
import LoadingSpinner from "@/components/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
	const queryClient = useQueryClient();
	const searchParams = useSearchParams();
	const [stats, setStats] = useState<Record<string, string>>({});
	const [savingStats, setSavingStats] = useState(false);
	const [statsMessage, setStatsMessage] = useState<string | null>(null);
	const [scrapResult, setScrapResult] = useState<string | null>(null);
	const [rollingScrap, setRollingScrap] = useState(false);
	useGamePageGuard({ requires: "active-game", gameState, userState });

	const gameId = gameState.status === "has-game" ? gameState.game.id : null;
	const userCountry =
		userState.status === "authenticated" ? userState.user.country : null;
	const isMod =
		userState.status === "authenticated" &&
		(userState.user.country === "Mods" || userState.user.role === "admin");

	const {
		data: countriesData,
		isLoading: countriesLoading,
		isError: countriesError,
		refetch: refetchCountries,
	} = useQuery({
		queryKey: ["countries", gameId],
		queryFn: async () => {
			if (!userId || !gameId) throw new Error("Not ready");
			const response = await api
				.game({ gameId: String(gameId) })
				.countries.get({ query: { authorization: userId } });
			if (response.error || !response.data || response.data.error)
				throw new Error("Failed to load countries");
			return response.data;
		},
		enabled: !!userId && !!gameId,
	});

	const countries =
		countriesData && !countriesData.error ? countriesData.countries : [];
	const selectedCountry = searchParams.get("country");
	const country = useMemo(() => {
		if (isMod)
			return (
				countries.find((item) => item.name === selectedCountry) ?? countries[0]
			);
		return countries.find((item) => item.name === userCountry);
	}, [countries, isMod, selectedCountry, userCountry]);

	const {
		data,
		isLoading,
		isError,
		refetch: refetchRules,
	} = useQuery({
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

	useEffect(() => {
		if (country?.id === undefined) return;
		setStats({});
		setStatsMessage(null);
		setScrapResult(null);
	}, [country?.id]);

	if (
		gameState.status === "loading" ||
		userState.status === "loading" ||
		gameState.status === "no-game" ||
		countriesLoading
	) {
		return <LoadingSpinner />;
	}

	if (gameState.status === "error" || userState.status === "error") {
		return (
			<DataErrorState
				title="Unable to load the briefing"
				message={
					gameState.status === "error"
						? gameState.message
						: userState.status === "error"
							? userState.message
							: undefined
				}
			/>
		);
	}

	if (gameState.status !== "has-game") return <LoadingSpinner />;

	if (countriesError || (!countriesLoading && !country)) {
		return (
			<CountryDashboard tab="Briefing">
				<DataErrorState
					title="Country briefing is unavailable"
					message="Your assigned country was not initialized for this game. Try again or ask an administrator to recreate the game."
					onRetry={() => refetchCountries()}
				/>
			</CountryDashboard>
		);
	}

	if (isError) {
		return (
			<CountryDashboard tab="Briefing">
				<DataErrorState
					title="Unable to load country rules"
					message="The briefing data could not be loaded from the server."
					onRetry={() => {
						void Promise.all([refetchCountries(), refetchRules()]);
					}}
				/>
			</CountryDashboard>
		);
	}

	if (!country || !data || isLoading) return <LoadingSpinner />;
	const { rules } = data;
	const currentLevels = {
		oil: country.oilLevel,
		steel: country.steelLevel,
		population: country.populationLevel,
	};
	const statValue = (name: string, fallback: number) =>
		stats[name] ?? String(fallback);
	const saveStats = async () => {
		if (!userId || !gameId) return;
		setSavingStats(true);
		setStatsMessage(null);
		const response = await api
			.game({ gameId: String(gameId) })
			.country({ countryId: String(country.id) })
			.stats.patch(
				{
					morale: Number(statValue("morale", country.morale)),
					tokens: Number(statValue("tokens", country.tokens)),
					oilLevel: Number(statValue("oilLevel", country.oilLevel)),
					steelLevel: Number(statValue("steelLevel", country.steelLevel)),
					populationLevel: Number(
						statValue("populationLevel", country.populationLevel),
					),
				},
				{ query: { authorization: userId } },
			);
		setSavingStats(false);
		if (response.error) {
			setStatsMessage(response.error.value.message ?? "Could not save stats");
			return;
		}
		setStats({});
		setStatsMessage("National stats updated.");
		await queryClient.invalidateQueries({ queryKey: ["countries", gameId] });
	};
	const runScrapDrive = async () => {
		if (!userId || !gameId) return;
		setRollingScrap(true);
		setScrapResult(null);
		const response = await api
			.game({ gameId: String(gameId) })
			.country({ countryId: String(country.id) })
			["scrap-drive"].post({}, { query: { authorization: userId } });
		setRollingScrap(false);
		if (
			response.error ||
			!response.data ||
			response.data.error !== false ||
			!("rolls" in response.data)
		) {
			setScrapResult(
				response.error?.value.message ?? "Could not run scrap metal drive",
			);
			return;
		}
		setScrapResult(
			`Rolled ${response.data.rolls.join(" + ")} and gained ${response.data.steelGained} steel.`,
		);
		await queryClient.invalidateQueries({ queryKey: ["countries", gameId] });
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
								country.morale <= 10
									? "Overthrow risk"
									: country.morale <= 20
										? "Widespread riots"
										: country.morale <= 30
											? "Peaceful protests"
											: country.morale <= 50
												? "No annual bonus"
												: country.morale <= 70
													? "+1 oil/steel, +5 population"
													: country.morale <= 80
														? "+2 oil/steel, +5 population"
														: country.morale <= 90
															? "+3 oil/steel, +6 population"
															: "+1 extra level",
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

				<section className="border p-4">
					<h3 className="flex items-center gap-2 font-serif text-xl font-semibold">
						<Dices className="size-5 text-primary" /> Scrap metal drive
					</h3>
					<p className="mt-2 text-sm leading-6 text-muted-foreground">
						Used {country.scrapDrivesUsed} of 3. The first drive rolls 4d6, the
						second 2d6, and the third 1d6. Only one may be held each year.
					</p>
					<div className="mt-4 flex flex-wrap items-center gap-3">
						<Button
							onClick={runScrapDrive}
							disabled={
								rollingScrap ||
								country.scrapDrivesUsed >= 3 ||
								country.lastScrapDriveYear === gameState.game.currentYear
							}
						>
							<Dices /> {rollingScrap ? "Rolling…" : "Run this year's drive"}
						</Button>
						{country.lastScrapDriveYear === gameState.game.currentYear && (
							<p className="text-sm text-muted-foreground">
								Already used in {gameState.game.currentYear}.
							</p>
						)}
						{scrapResult && <p className="text-sm">{scrapResult}</p>}
					</div>
				</section>

				{isMod && (
					<section className="border p-4">
						<h3 className="font-serif text-xl font-semibold">
							Moderator national controls
						</h3>
						<p className="mt-1 text-sm text-muted-foreground">
							Apply objective rewards, penalties, morale changes, and spent
							tokens here. Levels are limited to 1–20 and morale to 0–100.
						</p>
						<div className="mt-4 grid gap-3 sm:grid-cols-5">
							{[
								["oilLevel", "Oil level", country.oilLevel],
								["steelLevel", "Steel level", country.steelLevel],
								[
									"populationLevel",
									"Population level",
									country.populationLevel,
								],
								["morale", "Morale", country.morale],
								["tokens", "Tokens", country.tokens],
							].map(([name, label, fallback]) => (
								<div key={name} className="space-y-1.5">
									<Label htmlFor={`stat-${name}`}>{label}</Label>
									<Input
										id={`stat-${name}`}
										type="number"
										value={statValue(String(name), Number(fallback))}
										onChange={(event) =>
											setStats((current) => ({
												...current,
												[String(name)]: event.target.value,
											}))
										}
									/>
								</div>
							))}
						</div>
						<div className="mt-4 flex items-center gap-3">
							<Button onClick={saveStats} disabled={savingStats}>
								{savingStats ? "Saving…" : "Save national stats"}
							</Button>
							{statsMessage && (
								<p className="text-sm text-muted-foreground">{statsMessage}</p>
							)}
						</div>
					</section>
				)}

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
						corresponding row is added automatically. Morale bonuses are applied
						as part of the same annual update.
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
