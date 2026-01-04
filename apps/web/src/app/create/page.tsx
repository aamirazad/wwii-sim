"use client";

import { redirect, useRouter } from "next/navigation";
import { useState } from "react";
import Center from "@/components/center";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { getUserId } from "@/lib/cookies";

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
	oil: number;
	steel: number;
	population: number;
}

type CountriesConfig = Record<Country, CountryConfig>;

interface YearDurations {
	[key: string]: number;
}

const DEFAULT_COUNTRY_CONFIG: CountryConfig = {
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

	const userId = getUserId();
	if (!userId) {
		redirect("/login");
	}

	return (
		<Center>
			<div className="w-full max-w-4xl p-4">
				<form onSubmit={handleSubmit} className="space-y-8">
					{error && (
						<Alert variant="destructive">
							<AlertTitle>{error}</AlertTitle>
						</Alert>
					)}

					{/* Game Settings */}
					<Card>
						<CardHeader>
							<CardTitle>Game Settings</CardTitle>
							<CardDescription>
								Set the start date and year durations for the game
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="space-y-2">
								<Label htmlFor="startDate">Start Date</Label>
								<Input
									id="startDate"
									type="datetime-local"
									value={startDate}
									onChange={(e) => setStartDate(e.target.value)}
									required
								/>
							</div>

							<div className="space-y-2">
								<Label>Year Durations (minutes per game year)</Label>
								<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
								Set initial resources for each country. Players can be assigned
								separately after game creation.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							{COUNTRIES.map((country) => (
								<div
									key={country}
									className="border-b pb-4 last:border-b-0 last:pb-0"
								>
									<h3 className="mb-3 font-semibold">{country}</h3>
									<div className="grid gap-4 sm:grid-cols-3">
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
