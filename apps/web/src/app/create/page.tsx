"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { redirect, useRouter } from "next/navigation";
import { useState } from "react";
import Center from "@/components/center";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/lib/api";
import { getUserId } from "@/lib/cookies";
import { cn } from "@/lib/utils";

const COUNTRIES = [
	"Commonwealth",
	"France",
	"Germany",
	"Italy",
	"Japan",
	"Russia",
	"UK",
	"USA",
] as const;

const GAME_YEARS = [
	"1938",
	"1939",
	"1940",
	"1941",
	"1942",
	"1943",
	"1944",
] as const;

type Country = (typeof COUNTRIES)[number];
type GameYear = (typeof GAME_YEARS)[number];

interface CountryConfig {
	players: string[];
	oil: number;
	steel: number;
	population: number;
}

type CountriesConfig = Record<Country, CountryConfig>;

interface YearDurations {
	[key: string]: number;
}

const DEFAULT_COUNTRY_CONFIG: CountryConfig = {
	players: [],
	oil: 0,
	steel: 0,
	population: 0,
};

const DEFAULT_YEAR_DURATION = 46;

export default function CreateGamePage() {
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Form state
	const [startDate, setStartDate] = useState("");
	const [yearDurations, setYearDurations] = useState<YearDurations>(() => {
		const durations: YearDurations = {};
		for (const year of GAME_YEARS) {
			durations[year] = DEFAULT_YEAR_DURATION;
		}
		return durations;
	});
	const [countries, setCountries] = useState<CountriesConfig>(() => {
		const config = {} as CountriesConfig;
		for (const country of COUNTRIES) {
			config[country] = { ...DEFAULT_COUNTRY_CONFIG };
		}
		return config;
	});

	const handleYearDurationChange = (year: GameYear, value: string) => {
		const numValue = Number.parseInt(value, 10) || 0;
		setYearDurations((prev) => ({ ...prev, [year]: numValue }));
	};

	const handleCountryResourceChange = (
		country: Country,
		resource: "oil" | "steel" | "population",
		value: string,
	) => {
		const numValue = Number.parseInt(value, 10) || 0;
		setCountries((prev) => ({
			...prev,
			[country]: { ...prev[country], [resource]: numValue },
		}));
	};

	const handleAddPlayer = (country: Country, userId: string) => {
		setCountries((prev) => {
			const currentPlayers = prev[country].players;
			if (currentPlayers.includes(userId)) {
				return prev;
			}
			return {
				...prev,
				[country]: {
					...prev[country],
					players: [...currentPlayers, userId],
				},
			};
		});
	};

	const handleRemovePlayer = (country: Country, userId: string) => {
		setCountries((prev) => ({
			...prev,
			[country]: {
				...prev[country],
				players: prev[country].players.filter((id) => id !== userId),
			},
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		setError(null);

		const userId = getUserId();
		if (!userId) {
			setError("You must be logged in to create a game");
			setIsSubmitting(false);
			return;
		}

		if (!startDate) {
			setError("Please select a start date");
			setIsSubmitting(false);
			return;
		}

		try {
			const response = await api.game.create.post(
				{
					startDate: new Date(startDate).toISOString(),
					yearDurations: yearDurations as Record<GameYear, number>,
					countries,
				},
				{
					query: { authorization: userId },
				},
			);

			if (response.error) {
				const errData = response.error as { value?: { message?: string } };
				setError(errData.value?.message || "Failed to create game");
				return;
			}

			router.push("/game/join");
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setIsSubmitting(false);
		}
	};

	const { data: users } = useQuery({
		queryKey: ["users"],
		queryFn: async () => {
			const userId = await cookieStore.get("userId");
			if (!userId?.value) {
				redirect("/");
			}
			const response = await api.users.get({
				query: { authorization: userId.value },
			});
			if (response.error) throw new Error("Failed to fetch");
			return response.data;
		},
	});

	return (
		<Center>
			<div className="w-full max-w-4xl space-y-6 p-4">
				<h1 className="text-2xl font-bold">Create New Game</h1>

				{error && (
					<Alert variant="destructive" className="text-center">
						<AlertTitle>{error}</AlertTitle>
					</Alert>
				)}

				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Game Settings */}
					<Card>
						<CardHeader>
							<CardTitle>Game Settings</CardTitle>
							<CardDescription>
								Configure the game start date and year durations
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="startDate">Game Start Date</Label>
								<Input
									id="startDate"
									type="datetime-local"
									value={startDate}
									onChange={(e) => setStartDate(e.target.value)}
									required
								/>
							</div>

							<div className="space-y-2">
								<Label>Year Durations (minutes per year)</Label>
								<div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-7">
									{GAME_YEARS.map((year) => (
										<div key={year} className="space-y-1">
											<Label htmlFor={`year-${year}`} className="text-xs">
												{year}
											</Label>
											<Input
												id={`year-${year}`}
												type="number"
												min={1}
												value={yearDurations[year]}
												onChange={(e) =>
													handleYearDurationChange(year, e.target.value)
												}
												required
											/>
										</div>
									))}
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Country Configurations */}
					<Card>
						<CardHeader>
							<CardTitle>Country Configurations</CardTitle>
							<CardDescription>
								Set initial resources and assign players for each country
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							{COUNTRIES.map((country) => (
								<div
									key={country}
									className="border-b pb-4 last:border-b-0 last:pb-0"
								>
									<h3 className="mb-3 font-semibold">{country}</h3>
									<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
										<div className="space-y-1">
											<Label htmlFor={`${country}-players`} className="text-xs">
												Players
											</Label>
											<Popover>
												<PopoverTrigger
													render={
														<Button
															variant="outline"
															role="combobox"
															className="w-full justify-between"
															disabled={!users}
														>
															{countries[country].players.length > 0
																? `${countries[country].players.length} selected`
																: "Select players..."}
															<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
														</Button>
													}
												></PopoverTrigger>
												<PopoverContent className="w-full p-0">
													<Command>
														<CommandInput placeholder="Search users..." />
														<CommandList>
															<CommandEmpty>No users found.</CommandEmpty>
															<CommandGroup>
																{users?.map((user) => (
																	<CommandItem
																		key={user.id}
																		onSelect={() => {
																			if (
																				countries[country].players.includes(
																					user.id,
																				)
																			) {
																				handleRemovePlayer(country, user.id);
																			} else {
																				handleAddPlayer(country, user.id);
																			}
																		}}
																	>
																		<Check
																			className={cn(
																				"mr-2 h-4 w-4",
																				countries[country].players.includes(
																					user.id,
																				)
																					? "opacity-100"
																					: "opacity-0",
																			)}
																		/>
																		{user.name}
																	</CommandItem>
																))}
															</CommandGroup>
														</CommandList>
													</Command>
												</PopoverContent>
											</Popover>
											{countries[country].players.length > 0 && (
												<div className="flex flex-wrap gap-1 mt-2">
													{countries[country].players.map((playerId) => {
														const user = users?.find((u) => u.id === playerId);
														return (
															<Badge key={playerId} variant="secondary">
																{user?.name || playerId}
																<button
																	type="button"
																	onClick={() =>
																		handleRemovePlayer(country, playerId)
																	}
																	className="ml-1 hover:text-destructive"
																>
																	<X className="h-3 w-3" />
																</button>
															</Badge>
														);
													})}
												</div>
											)}
										</div>
										<div className="space-y-1">
											<Label htmlFor={`${country}-oil`} className="text-xs">
												Oil
											</Label>
											<Input
												id={`${country}-oil`}
												type="number"
												min={0}
												value={countries[country].oil}
												onChange={(e) =>
													handleCountryResourceChange(
														country,
														"oil",
														e.target.value,
													)
												}
												required
											/>
										</div>
										<div className="space-y-1">
											<Label htmlFor={`${country}-steel`} className="text-xs">
												Steel
											</Label>
											<Input
												id={`${country}-steel`}
												type="number"
												min={0}
												value={countries[country].steel}
												onChange={(e) =>
													handleCountryResourceChange(
														country,
														"steel",
														e.target.value,
													)
												}
												required
											/>
										</div>
										<div className="space-y-1">
											<Label
												htmlFor={`${country}-population`}
												className="text-xs"
											>
												Population
											</Label>
											<Input
												id={`${country}-population`}
												type="number"
												min={0}
												value={countries[country].population}
												onChange={(e) =>
													handleCountryResourceChange(
														country,
														"population",
														e.target.value,
													)
												}
												required
											/>
										</div>
									</div>
								</div>
							))}
						</CardContent>
					</Card>

					{/* Submit Button */}
					<div className="flex justify-end">
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Creating..." : "Create Game"}
						</Button>
					</div>
				</form>
			</div>
		</Center>
	);
}
