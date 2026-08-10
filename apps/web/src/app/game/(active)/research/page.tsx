"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Check, FlaskConical, X } from "lucide-react";
import { useMemo, useState } from "react";
import CountryDashboard from "@/components/country-dashboard";
import LoadingSpinner from "@/components/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useGamePageGuard } from "@/hooks/useGamePageGuard";
import { api } from "@/lib/api";
import { getUserId } from "@/lib/cookies";
import { useGame } from "../../GameContext";

export default function ResearchPage() {
	const { gameState, userState } = useGame();
	const userId = getUserId();
	const queryClient = useQueryClient();
	const [selectedCountryId, setSelectedCountryId] = useState<number | null>(
		null,
	);
	const [selectedResearch, setSelectedResearch] = useState<string | null>(null);
	const [plan, setPlan] = useState("");
	const [error, setError] = useState<string | null>(null);

	useGamePageGuard({ requires: "active-game", gameState, userState });

	const isMod =
		userState.status === "authenticated" &&
		(userState.user.country === "Mods" || userState.user.role === "admin");
	const gameId = gameState.status === "has-game" ? gameState.game.id : null;
	const userCountry =
		userState.status === "authenticated" ? userState.user.country : null;

	const { data: countriesData } = useQuery({
		queryKey: ["countries", gameId],
		queryFn: async () => {
			if (!userId || !gameId) throw new Error("Not ready");
			const response = await api
				.game({ gameId: String(gameId) })
				.countries.get({
					query: { authorization: userId },
				});
			if (response.error) throw new Error("Failed to load countries");
			return response.data;
		},
		enabled: !!userId && !!gameId,
	});

	const countries =
		countriesData && !countriesData.error ? countriesData.countries : [];
	const country = useMemo(() => {
		if (isMod) {
			return (
				countries.find((item) => item.id === selectedCountryId) ?? countries[0]
			);
		}
		return countries.find((item) => item.name === userCountry);
	}, [countries, isMod, selectedCountryId, userCountry]);

	const { data: researchData, isLoading } = useQuery({
		queryKey: ["research", gameId, country?.id],
		queryFn: async () => {
			if (!userId || !gameId || !country) throw new Error("Not ready");
			const response = await api
				.game({ gameId: String(gameId) })
				.country({ countryId: String(country.id) })
				.research.get({ query: { authorization: userId } });
			if (
				response.error ||
				!response.data ||
				response.data.error !== false ||
				!("states" in response.data)
			) {
				throw new Error("Failed to load research");
			}
			return response.data;
		},
		enabled: !!userId && !!gameId && !!country,
	});

	const refresh = () => {
		queryClient.invalidateQueries({
			queryKey: ["research", gameId, country?.id],
		});
		queryClient.invalidateQueries({ queryKey: ["countries", gameId] });
	};

	const submitResearch = async (researchType: string) => {
		if (!userId || !gameId || !country) return;
		setError(null);
		const response = await api
			.game({ gameId: String(gameId) })
			.country({ countryId: String(country.id) })
			.research.post(
				{ researchType: researchType as never, plan: plan.trim() || undefined },
				{ query: { authorization: userId } },
			);
		if (response.error) {
			setError(response.error.value.message ?? "Could not submit research");
			return;
		}
		setSelectedResearch(null);
		setPlan("");
		refresh();
	};

	const resolveResearch = async (
		requestId: number,
		status: "succeeded" | "failed",
	) => {
		if (!userId || !gameId || !country) return;
		const response = await api
			.game({ gameId: String(gameId) })
			.country({ countryId: String(country.id) })
			.research({ requestId: String(requestId) })
			.patch({ status }, { query: { authorization: userId } });
		if (response.error) {
			setError(response.error.value.message ?? "Could not resolve research");
			return;
		}
		refresh();
	};

	if (
		gameState.status !== "has-game" ||
		!country ||
		isLoading ||
		!researchData
	) {
		return <LoadingSpinner />;
	}

	const stateByType = new Map(
		researchData.states.map((state) => [state.researchType, state]),
	);
	const pendingByType = new Map(
		researchData.requests
			.filter((request) => request.status === "pending")
			.map((request) => [request.researchType, request]),
	);

	return (
		<CountryDashboard tab="Research">
			<div className="mx-auto w-full max-w-5xl space-y-6">
				<div className="flex flex-wrap items-end justify-between gap-4">
					<div>
						<h2 className="font-serif text-3xl font-semibold">
							Research bureau
						</h2>
						<p className="mt-1 max-w-2xl text-sm text-muted-foreground">
							Submit one level at a time. A moderator rolls five dice after your
							high-or-low call; unsuccessful research returns half the
							materials.
						</p>
					</div>
					{isMod && (
						<div className="w-64 space-y-2">
							<Label>Review country</Label>
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

				{error && (
					<p className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
						{error}
					</p>
				)}

				<div className="grid gap-4 md:grid-cols-2">
					{researchData.rules.map((rule) => {
						const state = stateByType.get(rule.researchType);
						const pending = pendingByType.get(rule.researchType);
						const level = state?.level ?? 0;
						const correctDiceNeeded = state
							? state.level - state.startingLevel + 1
							: 1;
						const atMax = level >= rule.maxLevel;
						return (
							<Card
								key={rule.researchType}
								className="border-l-4 border-l-primary/50"
							>
								<CardHeader className="pb-3">
									<div className="flex items-start justify-between gap-3">
										<CardTitle className="flex items-center gap-2 text-lg">
											<FlaskConical className="size-4" /> {rule.label}
										</CardTitle>
										<Badge variant="outline">
											Level {level}/{rule.maxLevel}
										</Badge>
									</div>
								</CardHeader>
								<CardContent className="space-y-3">
									<p className="text-sm text-muted-foreground">{rule.effect}</p>
									<div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
										<span>{rule.cost.steel} steel</span>
										<span>{rule.cost.population} population</span>
										{!atMax && (
											<span>{correctDiceNeeded} correct dice needed</span>
										)}
									</div>
									{pending ? (
										<div className="rounded-md border p-3 text-sm">
											<p>
												Awaiting a moderator roll for level{" "}
												{pending.targetLevel}.
											</p>
											{isMod && (
												<div className="mt-3 flex gap-2">
													<Button
														size="sm"
														onClick={() =>
															resolveResearch(pending.id, "succeeded")
														}
													>
														<Check /> Success
													</Button>
													<Button
														size="sm"
														variant="outline"
														onClick={() =>
															resolveResearch(pending.id, "failed")
														}
													>
														<X /> Failure
													</Button>
												</div>
											)}
										</div>
									) : selectedResearch === rule.researchType ? (
										<div className="space-y-2">
											<Textarea
												value={plan}
												onChange={(event) => setPlan(event.target.value)}
												placeholder="Optional plan or historical rationale for the moderators"
											/>
											<div className="flex gap-2">
												<Button
													size="sm"
													onClick={() => submitResearch(rule.researchType)}
												>
													Submit request
												</Button>
												<Button
													size="sm"
													variant="ghost"
													onClick={() => setSelectedResearch(null)}
												>
													Cancel
												</Button>
											</div>
										</div>
									) : (
										<Button
											size="sm"
											variant="outline"
											disabled={atMax}
											onClick={() => setSelectedResearch(rule.researchType)}
										>
											<BookOpen /> {atMax ? "Complete" : "Request next level"}
										</Button>
									)}
								</CardContent>
							</Card>
						);
					})}
				</div>
			</div>
		</CountryDashboard>
	);
}
