"use client";

import {
	PLAYABLE_COUNTRIES,
	TROOP_LABELS,
	TROOP_TYPES,
	ZERO_TROOPS,
} from "@api/schema";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Crosshair, MapPin, Send } from "lucide-react";
import { useMemo, useState } from "react";
import CountryDashboard from "@/components/country-dashboard";
import { InlineHelp } from "@/components/inline-help";
import LoadingSpinner from "@/components/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

type ActionType = "battle" | "movement" | "spy" | "conference" | "general";
type ActionStatus =
	| "pending"
	| "in_progress"
	| "approved"
	| "denied"
	| "resolved";

export default function OperationsPage() {
	const { gameState, userState } = useGame();
	const userId = getUserId();
	const queryClient = useQueryClient();
	const [type, setType] = useState<ActionType>("battle");
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [sourceLocationId, setSourceLocationId] = useState("");
	const [targetCountry, setTargetCountry] = useState("");
	const [targetLocation, setTargetLocation] = useState("");
	const [highLow, setHighLow] = useState<"high" | "low">("high");
	const [troops, setTroops] = useState({ ...ZERO_TROOPS });
	const [plan, setPlan] = useState("");
	const [error, setError] = useState<string | null>(null);

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
			if (response.error) throw new Error("Failed to load countries");
			return response.data;
		},
		enabled: !!userId && !!gameId,
	});
	const countries =
		countriesData && !countriesData.error ? countriesData.countries : [];
	const country = useMemo(
		() => countries.find((item) => item.name === userCountry),
		[countries, userCountry],
	);

	const { data: troopData } = useQuery({
		queryKey: ["troops", country?.id],
		queryFn: async () => {
			if (!userId || !gameId || !country) throw new Error("Not ready");
			const response = await api
				.game({ gameId: String(gameId) })
				.country({ countryId: String(country.id) })
				.troops.get({ query: { authorization: userId } });
			if (response.error) throw new Error("Failed to load troops");
			return response.data;
		},
		enabled: !!userId && !!gameId && !!country,
	});

	const { data: actionData, isLoading } = useQuery({
		queryKey: ["actions", gameId],
		queryFn: async () => {
			if (!userId || !gameId) throw new Error("Not ready");
			const response = await api
				.game({ gameId: String(gameId) })
				.actions.get({ query: { authorization: userId } });
			if (
				response.error ||
				!response.data ||
				response.data.error !== false ||
				!("actions" in response.data)
			) {
				throw new Error("Failed to load queue");
			}
			return response.data;
		},
		enabled: !!userId && !!gameId,
		refetchInterval: 10000,
	});

	const refresh = () =>
		queryClient.invalidateQueries({ queryKey: ["actions", gameId] });
	const submit = async () => {
		if (!userId || !gameId || !country) return;
		setError(null);
		const response = await api
			.game({ gameId: String(gameId) })
			.country({ countryId: String(country.id) })
			.actions.post(
				{
					type,
					title:
						title.trim() ||
						(type === "battle"
							? `Attack on ${targetLocation}`
							: "General dispatch"),
					description: description.trim() || plan.trim(),
					sourceLocationId: sourceLocationId
						? Number(sourceLocationId)
						: undefined,
					targetCountry: targetCountry ? (targetCountry as never) : undefined,
					targetLocation: targetLocation.trim() || undefined,
					highLow: type === "battle" ? highLow : undefined,
					troops: type === "battle" ? troops : undefined,
					plan: plan.trim() || undefined,
				},
				{ query: { authorization: userId } },
			);
		if (response.error) {
			setError(response.error.value.message ?? "Could not submit request");
			return;
		}
		setTitle("");
		setDescription("");
		setTargetLocation("");
		setPlan("");
		setTroops({ ...ZERO_TROOPS });
		refresh();
	};

	const updateStatus = async (actionId: number, status: ActionStatus) => {
		if (!userId || !gameId) return;
		await api
			.game({ gameId: String(gameId) })
			.actions({ actionId: String(actionId) })
			.patch({ status }, { query: { authorization: userId } });
		refresh();
	};

	if (gameState.status !== "has-game" || isLoading) return <LoadingSpinner />;
	const actions = actionData?.actions ?? [];

	return (
		<CountryDashboard tab="Operations">
			<div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
				{!isMod && country && (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Crosshair className="size-5" /> Submit an operation
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label>Request type</Label>
								<Select
									value={type}
									onValueChange={(value) => setType(value as ActionType)}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="battle">Battle plan</SelectItem>
										<SelectItem value="movement">Troop movement</SelectItem>
										<SelectItem value="spy">Spy operation</SelectItem>
										<SelectItem value="conference">
											Conference request
										</SelectItem>
										<SelectItem value="general">General dispatch</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label>Title</Label>
								<Input
									value={title}
									onChange={(event) => setTitle(event.target.value)}
									placeholder="Short public summary"
								/>
							</div>
							{type === "battle" && (
								<>
									<div className="grid gap-4 sm:grid-cols-2">
										<div className="space-y-2">
											<Label>Troops leave from</Label>
											<Select
												value={sourceLocationId}
												onValueChange={(value) =>
													setSourceLocationId(value ?? "")
												}
											>
												<SelectTrigger>
													<SelectValue placeholder="Choose location" />
												</SelectTrigger>
												<SelectContent>
													{troopData &&
														!troopData.error &&
														troopData.locations.map((location) => (
															<SelectItem
																key={location.id}
																value={String(location.id)}
															>
																{location.name}
															</SelectItem>
														))}
												</SelectContent>
											</Select>
										</div>
										<div className="space-y-2">
											<Label>Target country</Label>
											<Select
												value={targetCountry}
												onValueChange={(value) => setTargetCountry(value ?? "")}
											>
												<SelectTrigger>
													<SelectValue placeholder="Choose country" />
												</SelectTrigger>
												<SelectContent>
													{PLAYABLE_COUNTRIES.filter(
														(item) => item !== country.name,
													).map((item) => (
														<SelectItem key={item} value={item}>
															{item}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div className="space-y-2">
											<Label>Exact target</Label>
											<Input
												value={targetLocation}
												onChange={(event) =>
													setTargetLocation(event.target.value)
												}
												placeholder="City, region, coastline, or base"
											/>
										</div>
										<div className="space-y-2">
											<Label>Call before the roll</Label>
											<Select
												value={highLow}
												onValueChange={(value) =>
													setHighLow(value as "high" | "low")
												}
											>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="high">High (4–6)</SelectItem>
													<SelectItem value="low">Low (1–3)</SelectItem>
												</SelectContent>
											</Select>
										</div>
									</div>
									<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
										{TROOP_TYPES.map((troopType) => (
											<div key={troopType} className="space-y-1">
												<Label className="text-xs">
													{TROOP_LABELS[troopType]}
												</Label>
												<Input
													type="number"
													min={0}
													value={troops[troopType] || ""}
													onChange={(event) =>
														setTroops((current) => ({
															...current,
															[troopType]: Math.max(
																0,
																Number(event.target.value) || 0,
															),
														}))
													}
												/>
											</div>
										))}
									</div>
									<div className="space-y-2">
										<Label className="flex items-center gap-1.5">
											Detailed battle plan{" "}
											<InlineHelp text="Name routes, timing, supplies, support, fallback positions, and the exact territory you intend to hold. Moderators may award a planning bonus." />
										</Label>
										<Textarea
											className="min-h-40"
											value={plan}
											onChange={(event) => setPlan(event.target.value)}
											placeholder="Describe routes, timing, supply, air or naval support, fallback positions, and the intended territorial outcome."
										/>
									</div>
								</>
							)}
							{type !== "battle" && (
								<div className="space-y-2">
									<Label>Details</Label>
									<Textarea
										className="min-h-40"
										value={description}
										onChange={(event) => setDescription(event.target.value)}
										placeholder="Include who, what, where, costs, and the outcome you want from the moderators."
									/>
								</div>
							)}
							{error && <p className="text-sm text-destructive">{error}</p>}
							<Button onClick={submit}>
								<Send /> Submit to queue
							</Button>
						</CardContent>
					</Card>
				)}

				<Card className={isMod ? "lg:col-span-2" : ""}>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<ClipboardList className="size-5" /> Public moderator queue{" "}
							<InlineHelp text="Everyone can see the request order and status. Full battle plans remain private to their country and the moderators." />
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<p className="text-sm text-muted-foreground">
							Every country can see the queue and its progress. Private
							battle-plan prose is visible only to that country and moderators.
						</p>
						{actions.length === 0 ? (
							<p className="py-8 text-center text-sm text-muted-foreground">
								The queue is clear.
							</p>
						) : (
							actions.map((action, index) => (
								<div key={action.id} className="rounded-md border p-4">
									<div className="flex flex-wrap items-start justify-between gap-3">
										<div>
											<p className="font-medium">
												{index + 1}. {action.title}
											</p>
											<p className="mt-1 text-sm text-muted-foreground">
												{action.countryName} · {action.type}
											</p>
										</div>
										<Badge variant="outline">
											{action.status.replace("_", " ")}
										</Badge>
									</div>
									<p className="mt-3 text-sm">{action.description}</p>
									{typeof action.payload?.targetLocation === "string" && (
										<p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
											<MapPin className="size-3" /> Target:{" "}
											{String(action.payload.targetLocation)}
										</p>
									)}
									{action.response && (
										<p className="mt-3 border-l-2 border-primary pl-3 text-sm">
											Moderator: {action.response}
										</p>
									)}
									{isMod && (
										<div className="mt-3 flex flex-wrap gap-2">
											<Button
												size="sm"
												variant="outline"
												onClick={() => updateStatus(action.id, "in_progress")}
											>
												Start
											</Button>
											<Button
												size="sm"
												variant="outline"
												onClick={() => updateStatus(action.id, "approved")}
											>
												Approve
											</Button>
											<Button
												size="sm"
												onClick={() => updateStatus(action.id, "resolved")}
											>
												Resolve
											</Button>
											<Button
												size="sm"
												variant="destructive"
												onClick={() => updateStatus(action.id, "denied")}
											>
												Deny
											</Button>
										</div>
									)}
								</div>
							))
						)}
					</CardContent>
				</Card>
			</div>
		</CountryDashboard>
	);
}
