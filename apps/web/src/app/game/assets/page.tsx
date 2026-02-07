"use client";

import type {
	Country,
	CountryState,
	ResourceChangeLog,
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
	Beaker,
	Droplets,
	Factory,
	Hammer,
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
import CountryDashboard from "@/components/country-dashboard";
import GoBack from "@/components/go-back";
import LoadingSpinner from "@/components/loading-spinner";
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
import { useGame } from "../GameContext";

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
}: {
	countryState: CountryState;
	existingLocations: TroopLocation[];
	onSuccess: () => void;
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
		if (!userId) return;
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
}: {
	countryState: CountryState;
	locations: TroopLocation[];
	onSuccess: () => void;
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
		if (!userId) return;
		setIsSubmitting(true);
		setError(null);

		try {
			const response = await api
				.game({ gameId: String(countryState.gameId) })
				.country({ countryId: String(countryState.id) })
				.troops.locations.patch(
					{
						locations: editLocations
							.filter((l) => l.name.trim() !== "")
							.map((l) => ({
								name: l.name.trim(),
								isHome: l.isHome,
								troops: l.troops,
							})),
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

function TroopHistoryDialog({ countryState }: { countryState: CountryState }) {
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
		enabled: open && !!userId,
	});

	const logs =
		troopData && !troopData.error
			? [...troopData.logs].sort(
					(a, b) =>
						new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
				)
			: [];

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={<Button variant="outline" />}>
				<History className="mr-2 h-4 w-4" />
				View Troop History
			</DialogTrigger>
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

function Assets() {
	const { gameState, userState, countryResources, subscribeToMessage } =
		useGame();
	const userId = getUserId();
	const queryClient = useQueryClient();
	const router = useRouter();
	const searchParams = useSearchParams();

	enum Tabs {
		ChangeResources = "change-resources",
		TroopCreation = "troop-creation",
		Research = "research",
		Home = "home",
	}

	const [tab, setTab] = useState<Tabs>(Tabs.Home);

	// Sync tab state with URL query parameter
	useEffect(() => {
		const tabParam = searchParams.get("tab");
		if (tabParam && Object.values(Tabs).includes(tabParam as Tabs)) {
			setTab(tabParam as Tabs);
		} else {
			setTab(Tabs.Home);
		}
	}, [searchParams]);

	const setPageTab = (newTab: Tabs) => {
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
									title="Resources"
									description="Adjust resource amounts."
									icon={<Pickaxe className="h-8 w-8" />}
									onClick={() => setPageTab(Tabs.ChangeResources)}
								/>
								<MenuSelectionCard
									title="Troops"
									description="Build and manage your military force."
									icon={<Factory className="h-8 w-8" />}
									onClick={() => setPageTab(Tabs.TroopCreation)}
								/>
								<MenuSelectionCard
									title="Research"
									description="Develop your country."
									icon={<Beaker className="h-8 w-8" />}
									onClick={() => setPageTab(Tabs.Research)}
								/>
							</div>
						)}

						{/* Resource Change Form */}
						{tab === "change-resources" && (
							<Card>
								<CardHeader>
									<CardTitle className="text-xl">
										<GoBack onClick={() => setPageTab(Tabs.Home)} />
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
								<Card>
									<CardHeader>
										<CardTitle className="text-xl">
											<GoBack onClick={() => setPageTab(Tabs.Home)} />
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

								<Card>
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

						{tab === "research" && (
							<Card>
								<CardHeader>
									<CardTitle className="text-xl">
										<GoBack onClick={() => setPageTab(Tabs.Home)} />
										Research
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="flex h-40 items-center justify-center text-muted-foreground">
										Work in progress
									</div>
								</CardContent>
							</Card>
						)}

						{/* History Buttons */}
						<div className="flex justify-end gap-2">
							{tab === "troop-creation" && (
								<TroopHistoryDialog countryState={countryState} />
							)}
							{tab === "change-resources" && (
								<HistoryDialog countryState={countryState} />
							)}
						</div>
					</>
				)}
			</div>
		</CountryDashboard>
	);
}

export default function App() {
	return (
		<Suspense>
			<Assets />
		</Suspense>
	);
}
