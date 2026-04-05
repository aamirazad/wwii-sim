"use client";

import type {
	Country,
	CountryState,
	ResourceChangeLog,
	TradeRequest,
	TroopChangeLog,
	TroopCounts,
	TroopLocation,
	TroopType,
} from "@api/schema";
import {
	TROOP_COSTS,
	TROOP_LABELS,
	TROOP_TYPES,
	ZERO_TROOPS,
} from "@api/schema";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Droplets,
	Factory,
	Hammer,
	Handshake,
	History,
	MapPin,
	Minus,
	Pickaxe,
	Plus,
	Trash2,
	Users,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { type SubmitEvent, Suspense, useEffect, useState } from "react";
import { useGame } from "@/app/game/GameContext";
import CountryDashboard from "@/components/country-dashboard";
import GoBack from "@/components/go-back";
import LoadingSpinner from "@/components/loading-spinner";
import { useTutorial } from "@/components/tutorial-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
	loadTutorialDemoState,
	saveTutorialDemoState,
} from "@/lib/tutorial-demo-state";

// Countries that mods can manage
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
			className="cursor-pointer group flex h-64 flex-col items-center justify-center space-y-4 rounded-xl border-2 border-muted bg-card p-6 text-center transition-all hover:border-primary/50 hover:bg-accent/5 focus:outline-none focus:ring-2 focus:ring-primary"
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
	onDemoSubmit,
	showInfiniteUsOil = true,
}: {
	countryState: CountryState;
	onSuccess: () => void;
	onDemoSubmit?: (payload: {
		oilDelta: number;
		steelDelta: number;
		populationDelta: number;
		note: string;
	}) => Promise<string | null | undefined> | string | null | undefined;
	showInfiniteUsOil?: boolean;
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
	const usesInfiniteUsOil =
		showInfiniteUsOil && countryState.name === "United States";

	const anyNegative =
		resultingOil < 0 || resultingSteel < 0 || resultingPopulation < 0;

	const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!note.trim()) {
			setError("Please enter a reason for the change");
			return;
		}

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

		if (onDemoSubmit) {
			const result = await onDemoSubmit({
				oilDelta,
				steelDelta,
				populationDelta,
				note: note.trim(),
			});
			if (typeof result === "string" && result.length > 0) {
				setError(result);
				setIsSubmitting(false);
				return;
			}
			setOilChange("");
			setSteelChange("");
			setPopulationChange("");
			setNote("");
			onSuccess();
			setIsSubmitting(false);
			return;
		}

		if (!userId) {
			setError("You must be logged in to submit resource changes");
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
									if (!(usesInfiniteUsOil && id === "oil")) {
										setResulting(base + Number(v));
									}
								}}
							/>
							{value && (
								<p
									className={`text-xs transition-all truncate ${resulting < 0 ? "text-destructive font-bold" : "text-muted-foreground font-normal"}`}
								>
									Result:{" "}
									{usesInfiniteUsOil && id === "oil"
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

function HistoryDialog({
	countryState,
	demoLogs,
	tutorialTargetId,
	autoOpen,
	showInfiniteUsOil = true,
}: {
	countryState: CountryState;
	demoLogs?: ResourceChangeLog[];
	tutorialTargetId?: string;
	autoOpen?: boolean;
	showInfiniteUsOil?: boolean;
}) {
	const userId = getUserId();
	const [open, setOpen] = useState(false);
	const usesInfiniteUsOil =
		showInfiniteUsOil && countryState.name === "United States";

	useEffect(() => {
		if (autoOpen) setOpen(true);
	}, [autoOpen]);

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
		enabled: open && !!userId && !demoLogs,
	});

	// Group logs by resource type and compute running totals
	const processedHistory = (() => {
		const logs =
			demoLogs ??
			(historyData && !historyData.error ? historyData.logs : undefined);
		if (!logs) return null;
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
			<DialogTrigger
				render={
					<Button variant="outline">
						<History className="mr-2 h-4 w-4" />
						View Resource Change History
					</Button>
				}
			></DialogTrigger>
			<DialogContent
				data-tutorial={tutorialTargetId}
				className="sm:max-w-2xl max-h-[80vh] overflow-y-auto"
			>
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
														{usesInfiniteUsOil && resourceType === "oil"
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
																{usesInfiniteUsOil && log.resourceType === "oil"
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

function TradingForm({
	countryState,
	isMod,
	onSuccess,
}: {
	countryState: CountryState;
	isMod: boolean;
	onSuccess: () => void;
}) {
	const userId = getUserId();
	const [recipientCountryName, setRecipientCountryName] = useState<
		Country | ""
	>("");
	const [initiatorOil, setInitiatorOil] = useState("");
	const [initiatorSteel, setInitiatorSteel] = useState("");
	const [recipientOil, setRecipientOil] = useState("");
	const [recipientSteel, setRecipientSteel] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const { data: tradeData, refetch } = useQuery({
		queryKey: ["trades", countryState.id],
		queryFn: async () => {
			if (!userId) throw new Error("Unauthenticated");
			const response = await api
				.game({ gameId: String(countryState.gameId) })
				.country({ countryId: String(countryState.id) })
				.trades.get({ query: { authorization: userId } });
			if (response.error) throw new Error("Failed to fetch trades");
			return response.data;
		},
		enabled: !!userId,
		staleTime: 10000,
	});

	const initiatorOilValue = initiatorOil
		? Number.parseInt(initiatorOil, 10)
		: 0;
	const initiatorSteelValue = initiatorSteel
		? Number.parseInt(initiatorSteel, 10)
		: 0;
	const recipientOilValue = recipientOil
		? Number.parseInt(recipientOil, 10)
		: 0;
	const recipientSteelValue = recipientSteel
		? Number.parseInt(recipientSteel, 10)
		: 0;
	const totalResources =
		initiatorOilValue +
		initiatorSteelValue +
		recipientOilValue +
		recipientSteelValue;
	const tradeCost = Math.ceil(totalResources / 4);

	const handleCreateTrade = async (e: SubmitEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!userId || !recipientCountryName) return;
		if (recipientCountryName === "Mods") {
			setError("Cannot trade with Mods");
			return;
		}
		if (recipientCountryName && recipientCountryName !== countryState.name) {
			// Valid country selected
		} else {
			setError("Please select a valid recipient country");
			return;
		}
		if (
			initiatorOilValue < 0 ||
			initiatorSteelValue < 0 ||
			recipientOilValue < 0 ||
			recipientSteelValue < 0
		) {
			setError("Trade amounts cannot be negative");
			return;
		}
		if (totalResources <= 0) {
			setError("Trade must include at least one resource");
			return;
		}

		setIsSubmitting(true);
		setError(null);
		try {
			const response = await api
				.game({ gameId: String(countryState.gameId) })
				.country({ countryId: String(countryState.id) })
				.trades.post(
					{
						recipientCountryName,
						initiatorResources: {
							oil: initiatorOilValue,
							steel: initiatorSteelValue,
						},
						recipientResources: {
							oil: recipientOilValue,
							steel: recipientSteelValue,
						},
					},
					{ query: { authorization: userId } },
				);
			if (response.error) {
				setError(response.error.value.message ?? "Failed to create trade");
				return;
			}
			setRecipientCountryName("");
			setInitiatorOil("");
			setInitiatorSteel("");
			setRecipientOil("");
			setRecipientSteel("");
			refetch();
			onSuccess();
		} catch {
			setError("Failed to create trade");
		} finally {
			setIsSubmitting(false);
		}
	};

	const respondToTrade = async (
		tradeId: number,
		action: "accept" | "reject",
	) => {
		if (!userId) return;
		setError(null);
		const request =
			action === "accept"
				? api
						.game({ gameId: String(countryState.gameId) })
						.country({ countryId: String(countryState.id) })
						.trades.accept.post(
							{ tradeId },
							{ query: { authorization: userId } },
						)
				: api
						.game({ gameId: String(countryState.gameId) })
						.country({ countryId: String(countryState.id) })
						.trades.reject.post(
							{ tradeId },
							{ query: { authorization: userId } },
						);
		const response = await request;
		if (response.error) {
			setError(response.error.value.message ?? `Failed to ${action} trade`);
			return;
		}
		refetch();
		onSuccess();
	};

	const incoming = tradeData && !tradeData.error ? tradeData.incoming : [];
	const outgoing = tradeData && !tradeData.error ? tradeData.outgoing : [];
	const recipientOptions = PLAYABLE_COUNTRIES.filter(
		(country) => country !== countryState.name,
	);

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">
						Create Trade Request{isMod ? ` for ${countryState.name}` : ""}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleCreateTrade} className="space-y-4">
						<div className="space-y-2">
							<Label>Trade With</Label>
							<Select
								value={recipientCountryName}
								onValueChange={(value) =>
									setRecipientCountryName(value as Country)
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select recipient country" />
								</SelectTrigger>
								<SelectContent>
									{recipientOptions.map((country) => (
										<SelectItem key={country} value={country}>
											{country}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>Oil you send</Label>
								<Input
									type="number"
									min={0}
									value={initiatorOil}
									onChange={(e) => setInitiatorOil(e.target.value)}
								/>
							</div>
							<div className="space-y-2">
								<Label>Steel you send</Label>
								<Input
									type="number"
									min={0}
									value={initiatorSteel}
									onChange={(e) => setInitiatorSteel(e.target.value)}
								/>
							</div>
							<div className="space-y-2">
								<Label>Oil you receive</Label>
								<Input
									type="number"
									min={0}
									value={recipientOil}
									onChange={(e) => setRecipientOil(e.target.value)}
								/>
							</div>
							<div className="space-y-2">
								<Label>Steel you receive</Label>
								<Input
									type="number"
									min={0}
									value={recipientSteel}
									onChange={(e) => setRecipientSteel(e.target.value)}
								/>
							</div>
						</div>
						<p className="text-sm text-muted-foreground">
							Trade fee: {tradeCost} oil (paid by initiator on acceptance).
							Steel requirement to initiate: {tradeCost}.
						</p>
						{error && <p className="text-sm text-destructive">{error}</p>}
						<Button
							type="submit"
							disabled={
								!recipientCountryName || totalResources <= 0 || isSubmitting
							}
						>
							{isSubmitting ? "Submitting..." : "Send Trade Request"}
						</Button>
					</form>
				</CardContent>
			</Card>

			<div className="grid gap-6 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Incoming Requests</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{incoming.length === 0 && (
							<p className="text-sm text-muted-foreground">
								No incoming requests.
							</p>
						)}
						{incoming.map((trade) => (
							<TradeRequestCard
								key={trade.id}
								trade={trade}
								actionLabel="Accept"
								onPrimaryAction={() => respondToTrade(trade.id, "accept")}
								onSecondaryAction={() => respondToTrade(trade.id, "reject")}
							/>
						))}
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Outgoing Requests</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{outgoing.length === 0 && (
							<p className="text-sm text-muted-foreground">
								No outgoing requests.
							</p>
						)}
						{outgoing.map((trade) => (
							<TradeRequestCard key={trade.id} trade={trade} />
						))}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

function TradeRequestCard({
	trade,
	actionLabel,
	onPrimaryAction,
	onSecondaryAction,
}: {
	trade: TradeRequest;
	actionLabel?: string;
	onPrimaryAction?: () => void;
	onSecondaryAction?: () => void;
}) {
	return (
		<div className="rounded-lg border p-3 space-y-2">
			<div className="text-sm font-medium">
				{trade.initiatorCountryName} → {trade.recipientCountryName}
			</div>
			<div className="text-xs text-muted-foreground">
				Sends: {trade.initiatorResources.steel} steel,{" "}
				{trade.initiatorResources.oil} oil
			</div>
			<div className="text-xs text-muted-foreground">
				Receives: {trade.recipientResources.steel} steel,{" "}
				{trade.recipientResources.oil} oil
			</div>
			<div className="text-xs text-muted-foreground">
				Fee: {trade.oilCost} oil, Steel requirement: {trade.steelRequirement}
			</div>
			{onPrimaryAction && onSecondaryAction && (
				<div className="flex gap-2 pt-1">
					<Button size="sm" onClick={onPrimaryAction}>
						{actionLabel ?? "Accept"}
					</Button>
					<Button size="sm" variant="outline" onClick={onSecondaryAction}>
						Reject
					</Button>
				</div>
			)}
		</div>
	);
}

// --- Troop Management Components ---

interface PurchaseAllocation {
	location: string;
	isHome: boolean;
	troops: TroopCounts;
}

function TroopCostSummary({ quantities }: { quantities: TroopCounts }) {
	let totalOil = 0;
	let totalSteel = 0;
	let totalPopulation = 0;
	for (const tt of TROOP_TYPES) {
		const qty = quantities[tt];
		if (qty > 0) {
			totalOil += TROOP_COSTS[tt].oil * qty;
			totalSteel += TROOP_COSTS[tt].steel * qty;
			totalPopulation += TROOP_COSTS[tt].population * qty;
		}
	}
	if (totalOil === 0 && totalSteel === 0 && totalPopulation === 0) return null;

	return (
		<div className="flex gap-4 rounded-lg border bg-muted/30 p-3 text-sm">
			<span className="font-medium">Total Cost:</span>
			<span className="flex items-center gap-1">
				<Hammer className="h-3.5 w-3.5" /> {totalSteel} steel
			</span>
			<span className="flex items-center gap-1">
				<Droplets className="h-3.5 w-3.5" /> {totalOil} oil
			</span>
			<span className="flex items-center gap-1">
				<Users className="h-3.5 w-3.5" /> {totalPopulation} pop
			</span>
		</div>
	);
}

function TroopPurchaseForm({
	countryState,
	existingLocations,
	onSuccess,
	onDemoSubmit,
}: {
	countryState: CountryState;
	existingLocations: TroopLocation[];
	onSuccess: () => void;
	onDemoSubmit?: (payload: {
		quantities: TroopCounts;
		allocations: PurchaseAllocation[];
	}) => Promise<string | null | undefined> | string | null | undefined;
}) {
	const userId = getUserId();
	const [quantities, setQuantities] = useState<TroopCounts>({ ...ZERO_TROOPS });
	const [allocations, setAllocations] = useState<PurchaseAllocation[]>([
		{ location: "", isHome: true, troops: { ...ZERO_TROOPS } },
	]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const totalPurchased = TROOP_TYPES.reduce(
		(sum, tt) => sum + quantities[tt],
		0,
	);

	const updateQuantity = (tt: TroopType, value: number) => {
		setQuantities((prev) => ({ ...prev, [tt]: Math.max(0, value) }));
	};

	const updateAllocation = (
		index: number,
		field: string,
		value: string | boolean | number,
	) => {
		setAllocations((prev) => {
			const next = [...prev];
			if (field === "location") {
				next[index] = { ...next[index], location: value as string };
				// Auto-set isHome from existing location
				const existing = existingLocations.find(
					(l) => l.name === (value as string),
				);
				if (existing) {
					next[index].isHome = existing.isHome;
				}
			} else if (field === "isHome") {
				next[index] = { ...next[index], isHome: value as boolean };
			} else {
				next[index] = {
					...next[index],
					troops: {
						...next[index].troops,
						[field]: Math.max(0, value as number),
					},
				};
			}
			return next;
		});
	};

	const addAllocation = () => {
		setAllocations((prev) => [
			...prev,
			{ location: "", isHome: true, troops: { ...ZERO_TROOPS } },
		]);
	};

	const removeAllocation = (index: number) => {
		setAllocations((prev) => prev.filter((_, i) => i !== index));
	};

	// Check if allocations match purchase quantities
	const allocationErrors: string[] = [];
	for (const tt of TROOP_TYPES) {
		const allocated = allocations.reduce((sum, a) => sum + a.troops[tt], 0);
		if (allocated !== quantities[tt] && quantities[tt] > 0) {
			allocationErrors.push(
				`${TROOP_LABELS[tt]}: allocated ${allocated} of ${quantities[tt]}`,
			);
		}
	}

	const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
		e.preventDefault();
		setIsSubmitting(true);
		setError(null);

		const validAllocations = allocations.filter(
			(a) =>
				a.location.trim() !== "" && TROOP_TYPES.some((tt) => a.troops[tt] > 0),
		);
		if (validAllocations.length === 0) {
			setError("Please allocate troops to at least one location");
			setIsSubmitting(false);
			return;
		}

		if (onDemoSubmit) {
			const result = await onDemoSubmit({
				quantities,
				allocations: validAllocations,
			});
			if (typeof result === "string" && result.length > 0) {
				setError(result);
				setIsSubmitting(false);
				return;
			}
			setQuantities({ ...ZERO_TROOPS });
			setAllocations([
				{ location: "", isHome: true, troops: { ...ZERO_TROOPS } },
			]);
			onSuccess();
			setIsSubmitting(false);
			return;
		}

		if (!userId) {
			setError("You must be logged in to purchase troops");
			setIsSubmitting(false);
			return;
		}

		try {
			const response = await api
				.game({ gameId: String(countryState.gameId) })
				.country({ countryId: String(countryState.id) })
				.troops.purchase.post(
					{
						quantities,
						allocations: validAllocations.map((a) => ({
							location: a.location.trim(),
							isHome: a.isHome,
							troops: a.troops,
						})),
					},
					{ query: { authorization: userId } },
				);

			if (response.error) {
				setError(response.error.value.message ?? "Failed to purchase troops");
				return;
			}

			setQuantities({ ...ZERO_TROOPS });
			setAllocations([
				{ location: "", isHome: true, troops: { ...ZERO_TROOPS } },
			]);
			onSuccess();
		} catch {
			setError("Failed to purchase troops");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Purchase quantities */}
			<div>
				<h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
					Purchase Troops
				</h3>
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
					{TROOP_TYPES.map((tt) => (
						<div
							key={tt}
							className="flex flex-col rounded-lg border bg-card p-3"
						>
							<Label className="mb-1 text-xs">{TROOP_LABELS[tt]}</Label>
							<div className="flex items-center gap-1">
								<Button
									type="button"
									variant="outline"
									size="icon"
									className="h-7 w-7"
									onClick={() => updateQuantity(tt, quantities[tt] - 1)}
									disabled={quantities[tt] <= 0}
								>
									<Minus className="h-3 w-3" />
								</Button>
								<Input
									type="number"
									min={0}
									className="h-7 w-14 text-center text-sm"
									value={quantities[tt]}
									onChange={(e) =>
										updateQuantity(tt, Number(e.target.value) || 0)
									}
								/>
								<Button
									type="button"
									variant="outline"
									size="icon"
									className="h-7 w-7"
									onClick={() => updateQuantity(tt, quantities[tt] + 1)}
								>
									<Plus className="h-3 w-3" />
								</Button>
							</div>
							<p className="mt-1 text-xs text-muted-foreground">
								{TROOP_COSTS[tt].steel} steel · {TROOP_COSTS[tt].oil} oil ·{" "}
								{TROOP_COSTS[tt].population} pop
							</p>
						</div>
					))}
				</div>
			</div>

			<TroopCostSummary quantities={quantities} />

			{/* Allocations */}
			{totalPurchased > 0 && (
				<div>
					<div className="mb-3 flex items-center justify-between">
						<h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
							Place Troops at Locations
						</h3>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={addAllocation}
						>
							<Plus className="mr-1 h-3 w-3" /> Add Location
						</Button>
					</div>
					<div className="space-y-4">
						{allocations.map((alloc, idx) => (
							<div
								key={idx}
								className="rounded-lg border bg-card/50 p-4 space-y-3"
							>
								<div className="flex items-center gap-3">
									<div className="flex-1">
										<Label className="text-xs">Location Name</Label>
										<Input
											placeholder="e.g., Berlin, Pacific Fleet"
											value={alloc.location}
											onChange={(e) =>
												updateAllocation(idx, "location", e.target.value)
											}
											list="existing-locations"
										/>
									</div>
									<div className="flex items-center gap-2 pt-4">
										<Checkbox
											id={`home-territory-${idx}`}
											checked={alloc.isHome}
											onCheckedChange={(checked) =>
												updateAllocation(idx, "isHome", checked)
											}
											className="rounded"
										/>
										Home territory
										{allocations.length > 1 && (
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="h-7 w-7 text-destructive"
												onClick={() => removeAllocation(idx)}
											>
												<Trash2 className="h-3.5 w-3.5" />
											</Button>
										)}
									</div>
								</div>
								<div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
									{TROOP_TYPES.map((tt) =>
										quantities[tt] > 0 ? (
											<div key={tt}>
												<Label className="text-xs">{TROOP_LABELS[tt]}</Label>
												<Input
													type="number"
													min={0}
													className="h-7 text-sm"
													value={alloc.troops[tt] === 0 ? "" : alloc.troops[tt]}
													onChange={(e) =>
														updateAllocation(
															idx,
															tt,
															e.target.value === ""
																? 0
																: Number(e.target.value),
														)
													}
												/>
											</div>
										) : null,
									)}
								</div>
							</div>
						))}
					</div>

					{/* Datalist for existing location names */}
					<datalist id="existing-locations">
						{existingLocations.map((l) => (
							<option key={l.id} value={l.name} />
						))}
					</datalist>

					{allocationErrors.length > 0 && (
						<div className="mt-2 text-sm text-amber-400">
							Unallocated: {allocationErrors.join(", ")}
						</div>
					)}
				</div>
			)}

			{error && <p className="text-sm text-destructive">{error}</p>}

			<Button
				type="submit"
				disabled={
					totalPurchased === 0 || allocationErrors.length > 0 || isSubmitting
				}
			>
				{isSubmitting ? "Purchasing..." : "Purchase Troops"}
			</Button>
		</form>
	);
}

function TroopLocationEditor({
	countryState,
	locations,
	onSuccess,
	onDemoSubmit,
}: {
	countryState: CountryState;
	locations: TroopLocation[];
	onSuccess: () => void;
	onDemoSubmit?: (payload: {
		locations: {
			name: string;
			isHome: boolean;
			troops: TroopCounts;
		}[];
		movementCost: number;
	}) => Promise<string | null | undefined> | string | null | undefined;
}) {
	const userId = getUserId();

	type EditableLocation = {
		name: string;
		isHome: boolean;
		troops: TroopCounts;
	};
	const [editLocations, setEditLocations] = useState<EditableLocation[]>(
		locations.map((l) => ({
			name: l.name,
			isHome: l.isHome,
			troops: Object.fromEntries(
				TROOP_TYPES.map((tt) => [tt, l[tt]]),
			) as TroopCounts,
		})),
	);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Sync when locations prop changes
	useEffect(() => {
		setEditLocations(
			locations.map((l) => ({
				name: l.name,
				isHome: l.isHome,
				troops: Object.fromEntries(
					TROOP_TYPES.map((tt) => [tt, l[tt]]),
				) as TroopCounts,
			})),
		);
	}, [locations]);

	const originalTotals: Record<string, number> = {};
	for (const tt of TROOP_TYPES) {
		originalTotals[tt] = locations.reduce((sum, l) => sum + l[tt], 0);
	}

	const currentTotals: Record<string, number> = {};
	for (const tt of TROOP_TYPES) {
		currentTotals[tt] = editLocations.reduce((sum, l) => sum + l.troops[tt], 0);
	}

	// Compute movement cost (only count actual moves, not losses)
	const locationByName = new Map(locations.map((l) => [l.name, l]));

	// First calculate losses per troop type
	const lossesPerType: Record<string, number> = {};
	for (const tt of TROOP_TYPES) {
		const totalLoss = originalTotals[tt] - currentTotals[tt];
		lossesPerType[tt] = totalLoss > 0 ? totalLoss : 0;
	}

	// Then calculate movement cost (decreases minus losses)
	let movementCost = 0;
	for (const tt of TROOP_TYPES) {
		let decreases = 0;
		for (const loc of editLocations) {
			const existing = locationByName.get(loc.name);
			if (existing) {
				const diff = existing[tt] - loc.troops[tt];
				if (diff > 0) decreases += diff;
			}
		}
		// Subtract losses from decreases to get actual movement
		const actualMoves = Math.max(0, decreases - lossesPerType[tt]);
		movementCost += actualMoves;
	}

	const totalsMatch = TROOP_TYPES.every(
		(tt) => currentTotals[tt] <= originalTotals[tt],
	);
	const hasChanges =
		movementCost > 0 ||
		editLocations.length !== locations.length ||
		editLocations.some((loc) => {
			const orig = locationByName.get(loc.name);
			if (!orig) return true;
			return TROOP_TYPES.some((tt) => loc.troops[tt] !== orig[tt]);
		});

	const updateLocation = (
		index: number,
		field: string,
		value: string | boolean | number,
	) => {
		setEditLocations((prev) => {
			const next = [...prev];
			if (field === "name") {
				next[index] = { ...next[index], name: value as string };
			} else if (field === "isHome") {
				next[index] = { ...next[index], isHome: value as boolean };
			} else {
				next[index] = {
					...next[index],
					troops: {
						...next[index].troops,
						[field]: Math.max(0, value as number),
					},
				};
			}
			return next;
		});
	};

	const addLocation = () => {
		setEditLocations((prev) => [
			...prev,
			{ name: "", isHome: true, troops: { ...ZERO_TROOPS } },
		]);
	};

	const removeLocation = (index: number) => {
		setEditLocations((prev) => prev.filter((_, i) => i !== index));
	};

	const handleSubmit = async () => {
		setIsSubmitting(true);
		setError(null);

		const nextLocations = editLocations
			.filter((l) => l.name.trim() !== "")
			.map((l) => ({
				name: l.name.trim(),
				isHome: l.isHome,
				troops: l.troops,
			}));

		if (onDemoSubmit) {
			const result = await onDemoSubmit({
				locations: nextLocations,
				movementCost,
			});
			if (typeof result === "string" && result.length > 0) {
				setError(result);
				setIsSubmitting(false);
				return;
			}
			onSuccess();
			setIsSubmitting(false);
			return;
		}

		if (!userId) {
			setError("You must be logged in to update troop locations");
			setIsSubmitting(false);
			return;
		}

		try {
			const response = await api
				.game({ gameId: String(countryState.gameId) })
				.country({ countryId: String(countryState.id) })
				.troops.locations.patch(
					{
						locations: nextLocations,
					},
					{ query: { authorization: userId } },
				);

			if (response.error) {
				setError(response.error.value.message ?? "Failed to update locations");
				return;
			}

			onSuccess();
		} catch {
			setError("Failed to update locations");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (locations.length === 0 && editLocations.length === 0) {
		return (
			<p className="text-sm text-muted-foreground">
				No troops deployed yet. Purchase troops first to assign them to
				locations.
			</p>
		);
	}

	const hasTroops = TROOP_TYPES.some((tt) => originalTotals[tt] > 0);

	return (
		<div className="space-y-4">
			{/* Totals summary */}
			{hasTroops && (
				<div className="flex flex-wrap gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
					<span className="font-medium">Totals:</span>
					{TROOP_TYPES.filter((tt) => originalTotals[tt] > 0).map((tt) => (
						<span
							key={tt}
							className={
								currentTotals[tt] !== originalTotals[tt]
									? "text-destructive font-medium"
									: ""
							}
						>
							{TROOP_LABELS[tt]}: {currentTotals[tt]}/{originalTotals[tt]}
						</span>
					))}
				</div>
			)}

			{/* Location rows */}
			<div className="space-y-3">
				{editLocations.map((loc, idx) => {
					const isEmpty = TROOP_TYPES.every((tt) => loc.troops[tt] === 0);
					return (
						<div
							key={idx}
							className="rounded-lg border bg-card/50 p-4 space-y-3"
						>
							<div className="flex items-center gap-3">
								<div className="flex items-center gap-1.5 text-sm">
									<MapPin className="h-4 w-4 text-muted-foreground" />
								</div>
								<div className="flex-1">
									<Input
										placeholder="Location name"
										value={loc.name}
										onChange={(e) =>
											updateLocation(idx, "name", e.target.value)
										}
									/>
								</div>
								<div className="flex items-center gap-1.5 text-sm">
									<Checkbox
										id={`home-location-${idx}`}
										checked={loc.isHome}
										onCheckedChange={(checked) =>
											updateLocation(idx, "isHome", checked)
										}
										disabled={!isEmpty}
										className="rounded"
									/>
									<Label
										htmlFor={`home-location-${idx}`}
										className="cursor-pointer"
									>
										Home
									</Label>
								</div>
								{isEmpty && (
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="h-7 w-7 text-destructive"
										onClick={() => removeLocation(idx)}
									>
										<Trash2 className="h-3.5 w-3.5" />
									</Button>
								)}
							</div>
							<div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
								{TROOP_TYPES.filter((tt) => originalTotals[tt] > 0).map(
									(tt) => (
										<div key={tt}>
											<Label className="text-xs">{TROOP_LABELS[tt]}</Label>
											<Input
												type="number"
												min={0}
												className="h-7 text-sm"
												value={loc.troops[tt]}
												onChange={(e) =>
													updateLocation(idx, tt, Number(e.target.value) || 0)
												}
											/>
										</div>
									),
								)}
							</div>
						</div>
					);
				})}
			</div>

			<div className="flex items-center justify-between">
				<Button type="button" variant="outline" size="sm" onClick={addLocation}>
					<Plus className="mr-1 h-3 w-3" /> Add Location
				</Button>
				<div className="flex items-center gap-3">
					{movementCost > 0 && (
						<span className="text-sm text-muted-foreground">
							Movement cost: {movementCost} oil
						</span>
					)}
					<Button
						onClick={handleSubmit}
						disabled={!hasChanges || !totalsMatch || isSubmitting}
					>
						{isSubmitting ? "Saving..." : "Save Locations"}
					</Button>
				</div>
			</div>
			{!totalsMatch && (
				<p className="text-sm text-destructive">
					Troop totals cannot increase. You can only move troops to different
					locations or reduce totals (losses).
				</p>
			)}
			{error && <p className="text-sm text-destructive">{error}</p>}
		</div>
	);
}

function TroopHistoryDialog({
	countryState,
	demoLogs,
	tutorialTargetId,
}: {
	countryState: CountryState;
	demoLogs?: TroopChangeLog[];
	tutorialTargetId?: string;
}) {
	const userId = getUserId();
	const [open, setOpen] = useState(false);

	const { data: troopData } = useQuery({
		queryKey: ["troop-history", countryState.id],
		queryFn: async () => {
			if (!userId) throw new Error("Unauthenticated");
			const response = await api
				.game({ gameId: String(countryState.gameId) })
				.country({ countryId: String(countryState.id) })
				.troops.get({ query: { authorization: userId } });
			if (response.error) throw new Error("Failed to fetch troop history");
			return response.data;
		},
		enabled: open && !!userId && !demoLogs,
	});

	const logs = demoLogs
		? [...demoLogs].sort(
				(a, b) =>
					new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
			)
		: troopData && !troopData.error
			? [...troopData.logs].sort(
					(a, b) =>
						new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
				)
			: [];

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger
				render={
					<Button variant="outline" data-tutorial={tutorialTargetId}>
						<History className="mr-2 h-4 w-4" />
						View Troop History
					</Button>
				}
			></DialogTrigger>
			<DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Troop History</DialogTitle>
					<DialogDescription>
						A log of all troop purchases and movements.
					</DialogDescription>
				</DialogHeader>

				{logs.length === 0 ? (
					<p className="text-sm text-muted-foreground py-4">
						No troop activity yet.
					</p>
				) : (
					<div className="space-y-3">
						{logs.map((log) => (
							<div
								key={log.id}
								className="rounded-lg border p-3 space-y-2 text-sm"
							>
								<div className="flex items-center justify-between">
									<span
										className={`font-medium ${
											log.actionType === "purchase"
												? "text-emerald-400"
												: log.actionType === "movement"
													? "text-blue-400"
													: "text-red-400"
										}`}
									>
										{log.actionType === "purchase"
											? "Purchase"
											: log.actionType === "movement"
												? "Movement"
												: "Loss"}
									</span>
									<span className="text-xs text-muted-foreground">
										{new Date(log.createdAt).toLocaleString()} · by{" "}
										{log.changedBy}
									</span>
								</div>
								<div className="flex flex-wrap gap-2">
									{TROOP_TYPES.filter((tt) => log[tt] > 0).map((tt) => (
										<span
											key={tt}
											className="rounded bg-muted px-2 py-0.5 text-xs"
										>
											{log[tt]} {TROOP_LABELS[tt]}
										</span>
									))}
								</div>
								{log.actionType === "purchase" && (
									<div className="text-xs text-muted-foreground">
										Cost: {log.steelCost} steel · {log.oilCost} oil ·{" "}
										{log.populationCost} pop
									</div>
								)}
								{log.actionType === "movement" && log.oilCost > 0 && (
									<div className="text-xs text-muted-foreground">
										Movement cost: {log.oilCost} oil
									</div>
								)}
							</div>
						))}
					</div>
				)}

				<DialogFooter showCloseButton />
			</DialogContent>
		</Dialog>
	);
}

function LiveAssets() {
	const { isActive, currentStepId } = useTutorial();
	const { gameState, userState, countryResources, subscribeToMessage } =
		useGame();
	const userId = getUserId();
	const queryClient = useQueryClient();
	const router = useRouter();
	const searchParams = useSearchParams();

	const [tab, setTab] = useState<string>("home");

	// Sync tab state with URL query parameter
	useEffect(() => {
		const tabParam = searchParams.get("tab");
		if (tabParam) {
			setTab(tabParam);
		} else {
			setTab("home");
		}
	}, [searchParams]);

	const setPageTab = (newTab: string) => {
		router.push(`/game/assets?tab=${newTab}`);
	};

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
			queryClient.invalidateQueries({ queryKey: ["troops"] });
			queryClient.invalidateQueries({ queryKey: ["troop-history"] });
			queryClient.invalidateQueries({ queryKey: ["trades"] });
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

	// Derive countryState before hooks that depend on it
	const countryState =
		countryData && !countryData.error ? countryData.country : null;

	// Troop data query (must be before any early returns)
	const { data: troopData, refetch: refetchTroops } = useQuery({
		queryKey: ["troops", countryState?.id],
		queryFn: async () => {
			if (!userId || !countryState || gameState.status !== "has-game")
				throw new Error("Not ready");
			const response = await api
				.game({ gameId: String(countryState.gameId) })
				.country({ countryId: String(countryState.id) })
				.troops.get({ query: { authorization: userId } });
			if (response.error) throw new Error("Failed to fetch troops");
			return response.data;
		},
		enabled: !!userId && !!countryState && gameState.status === "has-game",
		staleTime: 10000,
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
		queryClient.invalidateQueries({ queryKey: ["trades"] });
	};

	const troopLocations =
		troopData && !troopData.error ? troopData.locations : [];

	const handleTroopSuccess = () => {
		refetchCountry();
		refetchTroops();
		queryClient.invalidateQueries({ queryKey: ["country-history"] });
		queryClient.invalidateQueries({ queryKey: ["troop-history"] });
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
						<div className="flex gap-4" data-tutorial="assets-overview">
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
									title="Resources"
									description="Adjust resource amounts."
									icon={<Pickaxe className="h-8 w-8" />}
									onClick={() => setPageTab("change-resources")}
								/>
								<MenuSelectionCard
									title="Troops"
									description="Build and manage your military force."
									icon={<Factory className="h-8 w-8" />}
									onClick={() => setPageTab("troop-creation")}
								/>
								<MenuSelectionCard
									title="Trading"
									description="Trade oil and steel with other countries."
									icon={<Handshake className="h-8 w-8" />}
									onClick={() => setPageTab("trading")}
								/>
							</div>
						)}

						{/* Resource Change Form */}
						{tab === "change-resources" && (
							<Card>
								<CardHeader>
									<CardTitle className="text-xl">
										<GoBack onClick={() => setPageTab("home")} />
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

						{tab === "troop-creation" && countryState && (
							<div className="space-y-6">
								<Card data-tutorial="troop-purchase-card">
									<CardHeader>
										<CardTitle className="text-xl">
											<GoBack onClick={() => setPageTab("home")} />
											Purchase Troops
											{isMod ? ` for ${countryState.name}` : ""}
										</CardTitle>
									</CardHeader>
									<CardContent>
										<TroopPurchaseForm
											countryState={countryState}
											existingLocations={troopLocations}
											onSuccess={handleTroopSuccess}
										/>
									</CardContent>
								</Card>

								<Card data-tutorial="troop-location-card">
									<CardHeader>
										<CardTitle className="text-lg">
											<MapPin className="mr-2 inline h-5 w-5" />
											Troop Locations
										</CardTitle>
									</CardHeader>
									<CardContent>
										<TroopLocationEditor
											countryState={countryState}
											locations={troopLocations}
											onSuccess={handleTroopSuccess}
										/>
									</CardContent>
								</Card>
							</div>
						)}

						{tab === "trading" && (
							<Card>
								<CardHeader>
									<CardTitle className="text-xl">
										<GoBack onClick={() => setPageTab("home")} />
										Trading
									</CardTitle>
								</CardHeader>
								<CardContent>
									<TradingForm
										countryState={countryState}
										isMod={isMod}
										onSuccess={handleChangeSuccess}
									/>
								</CardContent>
							</Card>
						)}

						{/* History Buttons */}
						<div className="flex justify-end gap-2">
							{tab === "troop-creation" && (
								<TroopHistoryDialog
									countryState={countryState}
									tutorialTargetId="troop-history-trigger"
								/>
							)}
							{tab === "change-resources" && (
								<HistoryDialog
									countryState={countryState}
									tutorialTargetId="resource-history-trigger"
									autoOpen={isActive && currentStepId === "resource-logs"}
								/>
							)}
						</div>
					</>
				)}
			</div>
		</CountryDashboard>
	);
}

function DemoAssets() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { currentStepId, demoCountry, isActive } = useTutorial();
	const [demoState, setDemoState] = useState(() =>
		loadTutorialDemoState(demoCountry),
	);
	const [tab, setTab] = useState<string>("home");

	useEffect(() => {
		setDemoState(loadTutorialDemoState(demoCountry));
	}, [demoCountry]);

	useEffect(() => {
		if (demoState.country !== demoCountry) {
			return;
		}
		saveTutorialDemoState(demoCountry, demoState);
	}, [demoCountry, demoState]);

	useEffect(() => {
		const tabParam = searchParams.get("tab");
		setTab(tabParam ?? "home");
	}, [searchParams]);

	const setPageTab = (newTab: string) => {
		router.push(`/game/assets?tab=${newTab}&tutorial=1`);
	};

	const handleDemoResourceChange = ({
		note,
		oilDelta,
		populationDelta,
		steelDelta,
	}: {
		oilDelta: number;
		steelDelta: number;
		populationDelta: number;
		note: string;
	}) => {
		let submissionError: string | null = null;
		setDemoState((prev) => {
			if (
				prev.countryState.oil + oilDelta < 0 ||
				prev.countryState.steel + steelDelta < 0 ||
				prev.countryState.population + populationDelta < 0
			) {
				submissionError = "Resulting resources cannot be negative.";
				return prev;
			}
			const nextCountryState = {
				...prev.countryState,
				oil: prev.countryState.oil + oilDelta,
				steel: prev.countryState.steel + steelDelta,
				population: prev.countryState.population + populationDelta,
				updatedAt: new Date(),
			};
			const nextResourceLogs = [...prev.resourceLogs];
			let nextLogId =
				nextResourceLogs.length > 0
					? Math.max(...nextResourceLogs.map((log) => log.id)) + 1
					: 1;
			const changes: Array<["oil" | "steel" | "population", number]> = [
				["oil", oilDelta],
				["steel", steelDelta],
				["population", populationDelta],
			];

			for (const [resourceType, delta] of changes) {
				if (delta === 0) continue;
				const previousValue = prev.countryState[resourceType];
				nextResourceLogs.push({
					id: nextLogId++,
					countryStateId: prev.countryState.id,
					gameId: prev.countryState.gameId,
					resourceType,
					previousValue,
					newValue: previousValue + delta,
					note,
					changedBy: "Demo Commander",
					createdAt: new Date(),
				});
			}

			return {
				...prev,
				resources: {
					oil: nextCountryState.oil,
					steel: nextCountryState.steel,
					population: nextCountryState.population,
				},
				countryState: nextCountryState,
				resourceLogs: nextResourceLogs,
			};
		});
		return submissionError ?? undefined;
	};

	const handleDemoTroopPurchase = ({
		allocations,
		quantities,
	}: {
		quantities: TroopCounts;
		allocations: PurchaseAllocation[];
	}) => {
		let submissionError: string | null = null;
		setDemoState((prev) => {
			let totalOilCost = 0;
			let totalSteelCost = 0;
			let totalPopulationCost = 0;
			for (const troopType of TROOP_TYPES) {
				const quantity = quantities[troopType];
				totalOilCost += TROOP_COSTS[troopType].oil * quantity;
				totalSteelCost += TROOP_COSTS[troopType].steel * quantity;
				totalPopulationCost += TROOP_COSTS[troopType].population * quantity;
			}

			if (
				prev.countryState.oil < totalOilCost ||
				prev.countryState.steel < totalSteelCost ||
				prev.countryState.population < totalPopulationCost
			) {
				submissionError =
					"Not enough resources for this purchase in demo mode.";
				return prev;
			}

			const locationByName = new Map(
				prev.troopLocations.map((location) => [
					location.name.toLowerCase(),
					{ ...location },
				]),
			);
			let nextLocationId =
				prev.troopLocations.length > 0
					? Math.max(...prev.troopLocations.map((location) => location.id)) + 1
					: 1;
			for (const allocation of allocations) {
				const normalizedName = allocation.location.trim().toLowerCase();
				if (!normalizedName) continue;
				const existing = locationByName.get(normalizedName);
				if (existing) {
					existing.isHome = allocation.isHome;
					for (const troopType of TROOP_TYPES) {
						existing[troopType] += allocation.troops[troopType];
					}
					existing.updatedAt = new Date();
					continue;
				}

				locationByName.set(normalizedName, {
					id: nextLocationId++,
					countryStateId: prev.countryState.id,
					gameId: prev.countryState.gameId,
					name: allocation.location.trim(),
					isHome: allocation.isHome,
					createdAt: new Date(),
					updatedAt: new Date(),
					...allocation.troops,
				});
			}

			const nextCountryState = {
				...prev.countryState,
				oil: prev.countryState.oil - totalOilCost,
				steel: prev.countryState.steel - totalSteelCost,
				population: prev.countryState.population - totalPopulationCost,
				updatedAt: new Date(),
			};

			let nextResourceLogId =
				prev.resourceLogs.length > 0
					? Math.max(...prev.resourceLogs.map((log) => log.id)) + 1
					: 1;
			const nextResourceLogs = [...prev.resourceLogs];
			const resourceCosts: Array<["oil" | "steel" | "population", number]> = [
				["oil", totalOilCost],
				["steel", totalSteelCost],
				["population", totalPopulationCost],
			];
			for (const [resourceType, cost] of resourceCosts) {
				if (cost <= 0) continue;
				const previousValue = prev.countryState[resourceType];
				nextResourceLogs.push({
					id: nextResourceLogId++,
					countryStateId: prev.countryState.id,
					gameId: prev.countryState.gameId,
					resourceType,
					previousValue,
					newValue: previousValue - cost,
					note: "Troop purchase",
					changedBy: "Demo Commander",
					createdAt: new Date(),
				});
			}

			const nextTroopLogId =
				prev.troopLogs.length > 0
					? Math.max(...prev.troopLogs.map((log) => log.id)) + 1
					: 1;
			return {
				...prev,
				resources: {
					oil: nextCountryState.oil,
					steel: nextCountryState.steel,
					population: nextCountryState.population,
				},
				countryState: nextCountryState,
				troopLocations: Array.from(locationByName.values()),
				resourceLogs: nextResourceLogs,
				troopLogs: [
					...prev.troopLogs,
					{
						id: nextTroopLogId,
						countryStateId: prev.countryState.id,
						gameId: prev.countryState.gameId,
						actionType: "purchase",
						...quantities,
						details: "Demo troop purchase",
						oilCost: totalOilCost,
						populationCost: totalPopulationCost,
						steelCost: totalSteelCost,
						changedBy: "Demo Commander",
						createdAt: new Date(),
					},
				],
			};
		});
		return submissionError;
	};

	const handleDemoLocationSave = ({
		locations,
		movementCost,
	}: {
		locations: {
			name: string;
			isHome: boolean;
			troops: TroopCounts;
		}[];
		movementCost: number;
	}) => {
		let submissionError: string | null = null;
		setDemoState((prev) => {
			if (prev.countryState.oil < movementCost) {
				submissionError = "Not enough oil for movement cost in demo mode.";
				return prev;
			}
			const previousByName = new Map(
				prev.troopLocations.map((location) => [
					location.name.toLowerCase(),
					location,
				]),
			);
			let nextLocationId =
				prev.troopLocations.length > 0
					? Math.max(...prev.troopLocations.map((location) => location.id)) + 1
					: 1;
			const nextLocations = locations.map((location) => {
				const existing = previousByName.get(location.name.toLowerCase());
				return {
					id: existing?.id ?? nextLocationId++,
					countryStateId: prev.countryState.id,
					gameId: prev.countryState.gameId,
					name: location.name,
					isHome: location.isHome,
					...location.troops,
					createdAt: existing?.createdAt ?? new Date(),
					updatedAt: new Date(),
				};
			});

			if (movementCost <= 0) {
				return {
					...prev,
					troopLocations: nextLocations,
				};
			}

			const nextCountryState = {
				...prev.countryState,
				oil: prev.countryState.oil - movementCost,
				updatedAt: new Date(),
			};
			const nextResourceLogId =
				prev.resourceLogs.length > 0
					? Math.max(...prev.resourceLogs.map((log) => log.id)) + 1
					: 1;
			return {
				...prev,
				resources: {
					...prev.resources,
					oil: nextCountryState.oil,
				},
				countryState: nextCountryState,
				troopLocations: nextLocations,
				resourceLogs: [
					...prev.resourceLogs,
					{
						id: nextResourceLogId,
						countryStateId: prev.countryState.id,
						gameId: prev.countryState.gameId,
						resourceType: "oil",
						previousValue: prev.countryState.oil,
						newValue: nextCountryState.oil,
						note: "Troop movement cost",
						changedBy: "Demo Commander",
						createdAt: new Date(),
					},
				],
			};
		});
		return submissionError;
	};

	return (
		<CountryDashboard tab="Assets">
			<div className="space-y-8">
				<Card className="border-primary/30 bg-primary/5">
					<CardHeader>
						<CardTitle>Tutorial Demo Mode</CardTitle>
					</CardHeader>
					<CardContent className="text-sm text-muted-foreground">
						You are viewing local demo data for {demoCountry}. Resource and
						troop changes are saved locally in your browser.
					</CardContent>
				</Card>

				<div className="flex gap-4" data-tutorial="assets-overview">
					<ResourceCard
						name="Steel"
						value={demoState.resources.steel.toLocaleString()}
						icon={<Hammer className="h-5 w-5" />}
					/>
					<ResourceCard
						name="Oil"
						value={demoState.resources.oil.toLocaleString()}
						icon={<Droplets className="h-5 w-5" />}
					/>
					<ResourceCard
						name="Population"
						value={demoState.resources.population.toLocaleString()}
						icon={<Users className="h-5 w-5" />}
					/>
				</div>

				{tab === "home" && (
					<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
						<MenuSelectionCard
							title="Resources"
							description="Review and simulate resource changes."
							icon={<Pickaxe className="h-8 w-8" />}
							onClick={() => setPageTab("change-resources")}
						/>
						<MenuSelectionCard
							title="Troops"
							description="Walk through troop purchase and location flow."
							icon={<Factory className="h-8 w-8" />}
							onClick={() => setPageTab("troop-creation")}
						/>
						<MenuSelectionCard
							title="Trading"
							description="Preview diplomacy tooling in safe mode."
							icon={<Handshake className="h-8 w-8" />}
							onClick={() => setPageTab("trading")}
						/>
					</div>
				)}

				{tab === "change-resources" && (
					<Card>
						<CardHeader>
							<CardTitle className="text-xl">
								<GoBack onClick={() => setPageTab("home")} />
								Change Resources
							</CardTitle>
						</CardHeader>
						<CardContent>
							<ResourceChangeForm
								countryState={demoState.countryState}
								onSuccess={() => {}}
								onDemoSubmit={handleDemoResourceChange}
								showInfiniteUsOil={false}
							/>
						</CardContent>
					</Card>
				)}

				{tab === "troop-creation" && (
					<div className="space-y-6">
						<Card data-tutorial="troop-purchase-card">
							<CardHeader>
								<CardTitle className="text-xl">
									<GoBack onClick={() => setPageTab("home")} />
									Purchase Troops
								</CardTitle>
							</CardHeader>
							<CardContent>
								<TroopPurchaseForm
									countryState={demoState.countryState}
									existingLocations={demoState.troopLocations}
									onSuccess={() => {}}
									onDemoSubmit={handleDemoTroopPurchase}
								/>
							</CardContent>
						</Card>

						<Card data-tutorial="troop-location-card">
							<CardHeader>
								<CardTitle className="text-lg">
									<MapPin className="mr-2 inline h-5 w-5" />
									Troop Locations
								</CardTitle>
							</CardHeader>
							<CardContent>
								<TroopLocationEditor
									countryState={demoState.countryState}
									locations={demoState.troopLocations}
									onSuccess={() => {}}
									onDemoSubmit={handleDemoLocationSave}
								/>
							</CardContent>
						</Card>
					</div>
				)}

				{tab === "trading" && (
					<Card>
						<CardHeader>
							<CardTitle className="text-xl">
								<GoBack onClick={() => setPageTab("home")} />
								Trading
							</CardTitle>
						</CardHeader>
						<CardContent className="text-sm text-muted-foreground">
							Trading requests are disabled in tutorial mode, but this is where
							countries create and respond to trade offers in live sessions.
						</CardContent>
					</Card>
				)}

				<div className="flex justify-end gap-2">
					{tab === "troop-creation" && (
						<TroopHistoryDialog
							countryState={demoState.countryState}
							demoLogs={demoState.troopLogs}
							tutorialTargetId="troop-history-trigger"
						/>
					)}
					{tab === "change-resources" && (
						<HistoryDialog
							countryState={demoState.countryState}
							demoLogs={demoState.resourceLogs}
							tutorialTargetId="resource-history-trigger"
							autoOpen={isActive && currentStepId === "resource-logs"}
							showInfiniteUsOil={false}
						/>
					)}
				</div>
			</div>
		</CountryDashboard>
	);
}

function Assets() {
	const { isDemoMode } = useTutorial();
	return isDemoMode ? <DemoAssets /> : <LiveAssets />;
}

export default function App() {
	return (
		<Suspense>
			<Assets />
		</Suspense>
	);
}
