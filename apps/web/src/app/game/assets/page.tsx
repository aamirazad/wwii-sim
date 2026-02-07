"use client";

import type { Country, CountryState, ResourceChangeLog } from "@api/schema";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowLeft,
	Beaker,
	Droplets,
	Factory,
	Hammer,
	History,
	Pickaxe,
	Users,
} from "lucide-react";
import { type SubmitEvent, useEffect, useState } from "react";
import CountryDashboard from "@/components/country-dashboard";
import LoadingSpinner from "@/components/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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

// Countries that mods can manage (excludes "Mods" itself)
const PLAYABLE_COUNTRIES: Country[] = [
	"Commonwealth",
	"France",
	"Germany",
	"Italy",
	"Japan",
	"Russia",
	"United Kingdom",
	"United States",
];

function ResourceCard({
	name,
	value,
	icon,
}: {
	name: string;
	value: string;
	icon: React.ReactNode;
}) {
	return (
		<Card className="flex-1">
			<CardHeader className="pb-2">
				<CardTitle className="flex items-center gap-2 text-muted-foreground">
					{icon}
					{name}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="text-4xl truncate font-bold tracking-tight">
					{value}
				</div>
			</CardContent>
		</Card>
	);
}

function MenuSelectionCard({
	title,
	description,
	icon,
	onClick,
}: {
	title: string;
	description: string;
	icon: React.ReactNode;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="group flex h-64 flex-col items-center justify-center space-y-4 rounded-xl border-2 border-muted bg-card p-6 text-center transition-all hover:border-primary/50 hover:bg-accent/5 focus:outline-none focus:ring-2 focus:ring-primary"
		>
			<div className="rounded-full bg-primary/10 p-4 text-primary transition-colors group-hover:bg-primary/20">
				{icon}
			</div>
			<div className="space-y-1">
				<h3 className="text-xl font-bold tracking-tight">{title}</h3>
				<p className="max-w-50 text-sm text-muted-foreground">{description}</p>
			</div>
		</button>
	);
}

function ResourceChangeForm({
	countryState,
	onSuccess,
}: {
	countryState: CountryState;
	onSuccess: () => void;
}) {
	const userId = getUserId();
	const [oilChange, setOilChange] = useState("");
	const [resultingOil, setResultingOil] = useState(countryState.oil);
	const [steelChange, setSteelChange] = useState("");
	const [resultingSteel, setResultingSteel] = useState(countryState.steel);
	const [populationChange, setPopulationChange] = useState("");
	const [resultingPopulation, setResultingPopulation] = useState(
		countryState.population,
	);
	const [note, setNote] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const anyNegative =
		resultingOil < 0 || resultingSteel < 0 || resultingPopulation < 0;

	const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!userId || !note.trim()) return;

		setIsSubmitting(true);
		setError(null);

		const oilDelta = oilChange ? Number.parseInt(oilChange, 10) : 0;
		const steelDelta = steelChange ? Number.parseInt(steelChange, 10) : 0;
		const populationDelta = populationChange
			? Number.parseInt(populationChange, 10)
			: 0;

		if (oilDelta === 0 && steelDelta === 0 && populationDelta === 0) {
			setError("Please enter at least one resource change");
			setIsSubmitting(false);
			return;
		}

		if (anyNegative) {
			setError("Resulting resources cannot be negative");
			setIsSubmitting(false);
			return;
		}

		try {
			const response = await api
				.game({ gameId: String(countryState.gameId) })
				.country({ countryId: String(countryState.id) })
				.resources.patch(
					{
						oilDelta: oilDelta !== 0 ? oilDelta : undefined,
						steelDelta: steelDelta !== 0 ? steelDelta : undefined,
						populationDelta:
							populationDelta !== 0 ? populationDelta : undefined,
						note: note.trim(),
					},
					{
						query: { authorization: userId },
					},
				);

			if (response.error) {
				if (response.error.value.message) {
					setError(response.error.value.message);
				} else {
					setError("Failed to update resources");
				}
				setOilChange("");
				setSteelChange("");
				setPopulationChange("");
				return;
			}

			// Reset form
			setOilChange("");
			setSteelChange("");
			setPopulationChange("");
			setNote("");
			onSuccess();
		} catch {
			setError("Failed to update resources");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="grid grid-cols-3 gap-4">
				{[
					{
						id: "steel",
						label: "Steel",
						value: steelChange,
						setValue: setSteelChange,
						resulting: resultingSteel,
						setResulting: setResultingSteel,
						base: countryState.steel,
					},
					{
						id: "oil",
						label: "Oil",
						value: oilChange,
						setValue: setOilChange,
						resulting: resultingOil,
						setResulting: setResultingOil,
						base: countryState.oil,
					},
					{
						id: "population",
						label: "Population",
						value: populationChange,
						setValue: setPopulationChange,
						resulting: resultingPopulation,
						setResulting: setResultingPopulation,
						base: countryState.population,
					},
				].map(
					({ id, label, value, setValue, resulting, setResulting, base }) => (
						<div key={id} className="space-y-2">
							<Label htmlFor={id}>{label} Change</Label>
							<Input
								id={id}
								type="number"
								min={-999999}
								max={999999}
								placeholder="+50 or -10"
								value={value}
								className={`transition-all  duration-200 ${Number(value) < 0 ? "text-rose-300" : "text-emerald-300"}`}
								onChange={(e) => {
									const v = e.target.value;
									setValue(v);
									if (countryState.name !== "United States" || id !== "oil") {
										setResulting(base + Number(v));
									}
								}}
							/>
							{value && (
								<p
									className={`text-xs transition-all truncate ${resulting < 0 ? "text-destructive font-bold" : "text-muted-foreground font-normal"}`}
								>
									Result:{" "}
									{countryState.name === "United States" && id === "oil"
										? "∞"
										: resulting.toLocaleString()}
								</p>
							)}
						</div>
					),
				)}
			</div>
			<div className="space-y-2">
				<Label htmlFor="note">Reason for Change *</Label>
				<Textarea
					id="note"
					placeholder="e.g., Built 5 tanks, researched anti-aircraft"
					value={note}
					onChange={(e) => setNote(e.target.value)}
					required
					onKeyDown={(event) => {
						if (event.key === "Enter" && event.ctrlKey) {
							event.preventDefault();
							event.currentTarget.form?.requestSubmit();
						}
					}}
				/>
			</div>
			{error && <p className="text-sm text-destructive">{error}</p>}
			<Tooltip>
				<TooltipTrigger
					render={
						<Button type="submit">
							{isSubmitting ? "Submitting..." : "Submit Change"}
						</Button>
					}
				></TooltipTrigger>
				<TooltipContent side="bottom">
					<KbdGroup>
						<Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd>
					</KbdGroup>
				</TooltipContent>
			</Tooltip>
		</form>
	);
}

function HistoryDialog({ countryState }: { countryState: CountryState }) {
	const userId = getUserId();
	const [open, setOpen] = useState(false);

	const { data: historyData } = useQuery({
		queryKey: ["country-history", countryState.id],
		queryFn: async () => {
			if (!userId) throw new Error("Unauthenticated");
			const response = await api
				.game({ gameId: String(countryState.gameId) })
				.country({ countryId: String(countryState.id) })
				.history.get({
					query: { authorization: userId },
				});
			if (response.error) throw new Error("Failed to fetch history");
			return response.data;
		},
		enabled: open && !!userId,
	});

	// Group logs by resource type and compute running totals
	const processedHistory = (() => {
		if (!historyData || historyData.error) return null;

		const logs = historyData.logs;
		if (logs.length === 0) return { oil: [], steel: [], population: [] };

		// Group by resource type
		const grouped: Record<string, ResourceChangeLog[]> = {
			steel: [],
			oil: [],
			population: [],
		};

		for (const log of logs) {
			grouped[log.resourceType].push(log);
		}

		// Sort each group by createdAt
		for (const key of Object.keys(grouped)) {
			grouped[key].sort(
				(a, b) =>
					new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
			);
		}

		return grouped;
	})();

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={<Button variant="outline" />}>
				<History className="mr-2 h-4 w-4" />
				View Resource Change History
			</DialogTrigger>
			<DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Resource Change History</DialogTitle>
					<DialogDescription>
						A log of all resource changes for your country.
					</DialogDescription>
				</DialogHeader>

				{processedHistory && (
					<div className="space-y-6">
						{(["steel", "oil", "population"] as const).map((resourceType) => {
							const logs = processedHistory[resourceType];
							if (logs.length === 0) return null;

							const startingValue = logs[0].newValue;

							return (
								<div key={resourceType} className="space-y-2">
									<h3 className="font-semibold capitalize flex items-center gap-2">
										{resourceType === "oil" && <Droplets className="h-4 w-4" />}
										{resourceType === "steel" && <Hammer className="h-4 w-4" />}
										{resourceType === "population" && (
											<Users className="h-4 w-4" />
										)}
										{resourceType}
									</h3>
									<div className="border rounded-lg overflow-hidden">
										<table className="w-full text-sm">
											<thead className="bg-muted/50">
												<tr>
													<th className="px-3 py-2 text-left">Change</th>
													<th className="px-3 py-2 text-left">Total</th>
													<th className="px-3 py-2 text-left">Note</th>
													<th className="px-3 py-2 text-left">Time</th>
												</tr>
											</thead>
											<tbody>
												<tr className="border-t bg-muted/20">
													<td className="px-3 py-2 text-muted-foreground">—</td>
													<td className="px-3 py-2 font-medium">
														{countryState.name === "United States" &&
														resourceType === "oil"
															? "∞"
															: startingValue.toLocaleString()}
													</td>
													<td className="px-3 py-2 text-muted-foreground italic">
														Starting amount
													</td>
													<td className="px-3 py-2 text-muted-foreground">—</td>
												</tr>
												{logs.slice(1).map((log) => {
													const change = log.newValue - log.previousValue;
													const isPositive = change > 0;
													return (
														<tr key={log.id} className="border-t">
															<td
																title={`Changed by ${log.changedBy}`}
																className={`truncate min-w-24 max-w-24 px-3 py-2 font-mono ${isPositive ? "text-emerald-300" : "text-rose-300"}`}
															>
																{isPositive ? "+" : ""}
																{change.toLocaleString()}
															</td>
															<td className="truncate min-w-24 max-w-24 px-3 py-2 font-medium">
																{countryState.name === "United States" &&
																log.resourceType === "oil"
																	? "∞"
																	: log.newValue.toLocaleString()}
															</td>
															<td className="px-3 py-2 min-w-50 max-w-50">
																{log.note}
															</td>
															<td className="px-3 py-2  text-muted-foreground">
																{new Date(log.createdAt).toLocaleTimeString()}
															</td>
														</tr>
													);
												})}
											</tbody>
										</table>
									</div>
								</div>
							);
						})}
					</div>
				)}

				<DialogFooter showCloseButton />
			</DialogContent>
		</Dialog>
	);
}

export default function Assets() {
	const { gameState, userState, countryResources, subscribeToMessage } =
		useGame();
	const userId = getUserId();
	const queryClient = useQueryClient();

	const [tab, setTab] = useState<
		"change-resources" | "troop-creation" | "research" | "home"
	>("home");

	const userCountry =
		userState.status === "authenticated" ? userState.user.country : null;
	const isMod = userCountry === "Mods";

	// For mods: track selected country
	const [selectedCountry, setSelectedCountry] = useState<Country>(
		PLAYABLE_COUNTRIES[0],
	);

	// The country to fetch data for - either user's country or mod's selected country
	const targetCountry = isMod ? selectedCountry : userCountry;

	// Query for country state (to get countryId and initial data)
	const {
		data: countryData,
		isLoading: countryLoading,
		refetch: refetchCountry,
	} = useQuery({
		queryKey: ["country-state", gameState, targetCountry],
		queryFn: async () => {
			if (!userId || gameState.status !== "has-game" || !targetCountry)
				throw new Error("Not ready");
			const response = await api
				.game({ gameId: String(gameState.game.id) })
				.country.name({ countryName: targetCountry })
				.get({
					query: { authorization: userId },
				});
			if (response.error) throw new Error("Failed to fetch country");
			return response.data;
		},
		enabled: !!userId && gameState.status === "has-game" && !!targetCountry,
		staleTime: 30000, // 30s - rely on WS updates for freshness
	});

	// Subscribe to websocket resource updates
	useEffect(() => {
		const unsubscribe = subscribeToMessage("server.country.resources", () => {
			// Only invalidate history - resource values come from WS via GameContext
			queryClient.invalidateQueries({ queryKey: ["country-history"] });
			// For mods viewing a different country, we need to refetch since they don't get WS updates for that country
			if (isMod) {
				refetchCountry();
			}
		});
		return unsubscribe;
	}, [subscribeToMessage, queryClient, isMod, refetchCountry]);

	// Guard: requires active game (mods always have access)
	useGamePageGuard({
		requires: "active-game",
		gameState,
		userState,
	});

	if (gameState.status !== "has-game") return <LoadingSpinner />;

	// For mods, we don't use countryResources from context (which would be empty for "Mods")
	// Instead we use the countryData from the query
	const displayResources = isMod
		? countryData && !countryData.error
			? {
					oil: countryData.country.oil,
					steel: countryData.country.steel,
					population: countryData.country.population,
				}
			: null
		: countryResources;

	const countryState =
		countryData && !countryData.error ? countryData.country : null;

	if (!countryState && !countryLoading) {
		return (
			<CountryDashboard tab="Assets">
				<p className="text-muted-foreground">Unable to load country data.</p>
			</CountryDashboard>
		);
	}

	const handleChangeSuccess = () => {
		refetchCountry();
		queryClient.invalidateQueries({ queryKey: ["country-history"] });
	};

	return (
		<CountryDashboard tab="Assets">
			<div className="space-y-8">
				{/* Country Selector for Mods */}
				{isMod && (
					<div className="flex items-center gap-4">
						<Label htmlFor="country-select" className="text-lg font-semibold">
							Select Country:
						</Label>
						<Select
							value={selectedCountry}
							onValueChange={(value) => setSelectedCountry(value as Country)}
						>
							<SelectTrigger className="w-50">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{PLAYABLE_COUNTRIES.map((country) => (
									<SelectItem key={country} value={country}>
										{country}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				)}

				{/* Resource Cards */}
				{displayResources && countryState && (
					<>
						<div className="flex gap-4">
							<ResourceCard
								name="Steel"
								value={displayResources.steel.toLocaleString()}
								icon={<Hammer className="h-5 w-5" />}
							/>
							<ResourceCard
								name="Oil"
								value={
									countryState.name === "United States"
										? "∞"
										: displayResources.oil.toLocaleString()
								}
								icon={<Droplets className="h-5 w-5" />}
							/>
							<ResourceCard
								name="Population"
								value={displayResources.population.toLocaleString()}
								icon={<Users className="h-5 w-5" />}
							/>
						</div>

						{tab === "home" && (
							<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
								<MenuSelectionCard
									title="Manage Resources"
									description="Adjust resource amounts."
									icon={<Pickaxe className="h-8 w-8" />}
									onClick={() => setTab("change-resources")}
								/>
								<MenuSelectionCard
									title="Troop Creation"
									description="Build and manage your military force."
									icon={<Factory className="h-8 w-8" />}
									onClick={() => setTab("troop-creation")}
								/>
								<MenuSelectionCard
									title="Research"
									description="Develop your country."
									icon={<Beaker className="h-8 w-8" />}
									onClick={() => setTab("research")}
								/>
							</div>
						)}

						{/* Resource Change Form */}
						{tab === "change-resources" && (
							<Card>
								<CardHeader>
									<CardTitle className="text-xl">
										<Tooltip>
											<TooltipTrigger
												render={
													<Button
														className="mr-2"
														onClick={() => setTab("home")}
														size="icon"
													>
														<ArrowLeft />
													</Button>
												}
											/>

											<TooltipContent>Go Back</TooltipContent>
										</Tooltip>
										Change Resources{isMod ? ` for ${countryState.name}` : ""}
									</CardTitle>
								</CardHeader>
								<CardContent>
									<ResourceChangeForm
										countryState={countryState}
										onSuccess={handleChangeSuccess}
									/>
								</CardContent>
							</Card>
						)}

						{(tab === "troop-creation" || tab === "research") && (
							<Card>
								<CardHeader>
									<CardTitle className="text-xl">
										<Tooltip>
											<TooltipTrigger
												render={
													<Button
														className="mr-2"
														onClick={() => setTab("home")}
														size="icon"
													>
														<ArrowLeft />
													</Button>
												}
											/>
											<TooltipContent>Go Back</TooltipContent>
										</Tooltip>
										{tab === "troop-creation" ? "Troop Creation" : "Research"}
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="flex h-40 items-center justify-center text-muted-foreground">
										Work in progress
									</div>
								</CardContent>
							</Card>
						)}

						{/* History Button */}
						<div className="flex justify-end">
							<HistoryDialog countryState={countryState} />
						</div>
					</>
				)}
			</div>
		</CountryDashboard>
	);
}
