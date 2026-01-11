"use client";

import type { CountryState, ResourceChangeLog } from "@api/schema";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Droplet, History, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { getUserId } from "@/lib/cookies";
import { useGame } from "../GameContext";

function ResourceCard({
	name,
	value,
	icon,
}: {
	name: string;
	value: number;
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
					{value.toLocaleString()}
				</div>
			</CardContent>
		</Card>
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

	const handleSubmit = async (e: FormEvent) => {
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

		try {
			const response = await api
				.game({ gameId: String(countryState.gameId) })
				.country({ countryId: String(countryState.id) })
				.resources.patch(
					{
						oil: oilDelta !== 0 ? countryState.oil + oilDelta : undefined,
						steel:
							steelDelta !== 0 ? countryState.steel + steelDelta : undefined,
						population:
							populationDelta !== 0
								? countryState.population + populationDelta
								: undefined,
						note: note.trim(),
					},
					{
						query: { authorization: userId },
					},
				);

			if (response.error) {
				setError("Failed to update resources");
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
				<div className="space-y-2">
					<Label htmlFor="steel">Steel Change</Label>
					<Input
						id="steel"
						type="number"
						placeholder="+50 or -10"
						value={steelChange}
						onChange={(e) => {
							setSteelChange(e.target.value);
							setResultingSteel(countryState.steel + Number(e.target.value));
						}}
					/>
					<p className="text-xs truncate text-muted-foreground">
						Result: {resultingSteel.toLocaleString()}
					</p>
				</div>
				<div className="space-y-2">
					<Label htmlFor="oil">Oil Change</Label>
					<Input
						id="oil"
						type="number"
						placeholder="+50 or -10"
						value={oilChange}
						onChange={(e) => {
							setOilChange(e.target.value);
							setResultingOil(countryState.oil + Number(e.target.value));
						}}
					/>
					<p
						className={`text-xs truncate ${resultingOil < 0 ? " text-destructive" : "text-muted-foreground"}`}
					>
						Result: {resultingOil.toLocaleString()}
					</p>
				</div>

				<div className="space-y-2">
					<Label htmlFor="population">Population Change</Label>
					<Input
						id="population"
						type="number"
						placeholder="+50 or -10"
						value={populationChange}
						onChange={(e) => {
							setPopulationChange(e.target.value);
							setResultingPopulation(
								countryState.population + Number(e.target.value),
							);
						}}
					/>
					<p className="text-xs truncate text-muted-foreground">
						Result: {resultingPopulation.toLocaleString()}
					</p>
				</div>
			</div>
			<div className="space-y-2">
				<Label htmlFor="note">Reason for Change *</Label>
				<Textarea
					id="note"
					placeholder="e.g., Built 5 tanks, researched anti-aircraft"
					value={note}
					onChange={(e) => setNote(e.target.value)}
					required
				/>
			</div>
			{error && <p className="text-sm text-destructive">{error}</p>}
			<Button type="submit" disabled={isSubmitting || !note.trim()}>
				{isSubmitting ? "Submitting..." : "Submit Change"}
			</Button>
		</form>
	);
}

function HistoryDialog({ countryState }: { countryState: CountryState }) {
	const userId = getUserId();
	const [open, setOpen] = useState(false);

	const { data: historyData, isLoading } = useQuery({
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
				View History
			</DialogTrigger>
			<DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Resource Change History</DialogTitle>
					<DialogDescription>
						A log of all resource changes for your country.
					</DialogDescription>
				</DialogHeader>

				{isLoading && <p className="text-muted-foreground">Loading...</p>}

				{processedHistory && (
					<div className="space-y-6">
						{(["steel", "oil", "population"] as const).map((resourceType) => {
							const logs = processedHistory[resourceType];
							if (logs.length === 0) return null;

							const startingValue = logs[0].previousValue;

							return (
								<div key={resourceType} className="space-y-2">
									<h3 className="font-semibold capitalize flex items-center gap-2">
										{resourceType === "oil" && <Droplet className="h-4 w-4" />}
										{resourceType === "steel" && (
											<div className="h-4 w-4 bg-zinc-500 rounded-sm" />
										)}
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
														{startingValue.toLocaleString()}
													</td>
													<td className="px-3 py-2 text-muted-foreground italic">
														Starting amount
													</td>
													<td className="px-3 py-2 text-muted-foreground">—</td>
												</tr>
												{logs.map((log) => {
													const change = log.newValue - log.previousValue;
													const isPositive = change > 0;
													return (
														<tr key={log.id} className="border-t">
															<td
																className={`truncate min-w-24 max-w-24 px-3 py-2 font-mono ${isPositive ? "text-green-500" : "text-red-500"}`}
															>
																{isPositive ? "+" : ""}
																{change.toLocaleString()}
															</td>
															<td className="truncate min-w-24 max-w-24 px-3 py-2 font-medium">
																{log.newValue.toLocaleString()}
															</td>
															<td className="px-3 py-2 min-w-50 max-w-50 truncate">
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

export default function GameResources() {
	const { gameState, userState, countryResources, subscribeToMessage } =
		useGame();
	const router = useRouter();
	const userId = getUserId();
	const queryClient = useQueryClient();

	const userCountry =
		userState.status === "authenticated" ? userState.user.country : null;

	// Query for country state (to get countryId)
	const {
		data: countryData,
		isLoading: countryLoading,
		refetch: refetchCountry,
	} = useQuery({
		queryKey: ["country-state", gameState, userCountry],
		queryFn: async () => {
			if (!userId || gameState.status !== "has-game" || !userCountry)
				throw new Error("Not ready");
			const response = await api
				.game({ gameId: String(gameState.game.id) })
				.country.name({ countryName: userCountry })
				.get({
					query: { authorization: userId },
				});
			if (response.error) throw new Error("Failed to fetch country");
			return response.data;
		},
		enabled: !!userId && gameState.status === "has-game" && !!userCountry,
	});

	// Subscribe to websocket resource updates
	useEffect(() => {
		const unsubscribe = subscribeToMessage("server.country.resources", () => {
			// Refetch country state when resources update via websocket
			refetchCountry();
			queryClient.invalidateQueries({ queryKey: ["country-history"] });
		});
		return unsubscribe;
	}, [subscribeToMessage, refetchCountry, queryClient]);

	useEffect(() => {
		if (gameState.status !== "has-game") {
			router.push("/game/join");
		}
	}, [gameState.status, router]);

	if (gameState.status !== "has-game") return <LoadingSpinner />;

	if (countryLoading || !countryResources) {
		return <CountryDashboard tab="Resources">Loading...</CountryDashboard>;
	}

	const countryState =
		countryData && !countryData.error ? countryData.country : null;

	if (!countryState) {
		return (
			<CountryDashboard tab="Resources">
				<p className="text-muted-foreground">Unable to load country data.</p>
			</CountryDashboard>
		);
	}

	const handleChangeSuccess = () => {
		refetchCountry();
		queryClient.invalidateQueries({ queryKey: ["country-history"] });
	};

	return (
		<CountryDashboard tab="Resources">
			<div className="space-y-8">
				{/* Resource Cards */}
				<div className="flex gap-4">
					<ResourceCard
						name="Steel"
						value={countryResources.steel}
						icon={<div className="h-5 w-5 bg-zinc-500 rounded-sm" />}
					/>
					<ResourceCard
						name="Oil"
						value={countryResources.oil}
						icon={<Droplet className="h-5 w-5" />}
					/>
					<ResourceCard
						name="Population"
						value={countryResources.population}
						icon={<Users className="h-5 w-5" />}
					/>
				</div>

				{/* Resource Change Form */}
				<Card>
					<CardHeader>
						<CardTitle className="text-xl">Change Resources</CardTitle>
					</CardHeader>
					<CardContent>
						<ResourceChangeForm
							countryState={countryState}
							onSuccess={handleChangeSuccess}
						/>
					</CardContent>
				</Card>

				{/* History Button */}
				<div className="flex justify-end">
					<HistoryDialog countryState={countryState} />
				</div>
			</div>
		</CountryDashboard>
	);
}
