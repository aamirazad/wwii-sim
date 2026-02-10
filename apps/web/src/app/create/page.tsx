"use client";

import {
	DEFAULT_COUNTRY_STARTING_RESOURCES,
	GAME_YEARS,
	type GameYear,
	type PlayableCountry,
} from "@api/schema";
import { ChevronDownIcon } from "lucide-react";
import { redirect, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Background from "@/components/background";
import Center from "@/components/center";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/lib/api";
import { getUserId } from "@/lib/cookies";

interface CountryConfig {
	oil: number;
	steel: number;
	population: number;
}

type CountriesConfig = Record<PlayableCountry, CountryConfig>;

const DEFAULT_YEAR_DURATION = 46;

export default function CreateGamePage() {
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [open, setOpen] = useState(false);

	// Form state
	const [startDate, setStartDate] = useState<Date | undefined>(undefined);
	const [startTime, setStartTime] = useState<string>("07:37:15");
	const [yearDurations, setYearDurations] = useState(() => {
		const durations: { [key: string]: number } = {};
		for (const year of GAME_YEARS) {
			durations[year] = DEFAULT_YEAR_DURATION;
		}
		return durations;
	});
	const countries = DEFAULT_COUNTRY_STARTING_RESOURCES as CountriesConfig;

	const handleYearDurationChange = (year: GameYear, value: string) => {
		const numValue = Number.parseInt(value, 10) || 0;
		setYearDurations((prev) => ({ ...prev, [year]: numValue }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		setError(null);

		const userId = getUserId();
		if (!userId) {
			window.scrollTo(0, 0);
			setError("You must be logged in to create a game");
			setIsSubmitting(false);
			return;
		}

		if (!startDate) {
			window.scrollTo(0, 0);
			setError("Please select a start date");
			setIsSubmitting(false);
			return;
		}

		const [hours, minutes, seconds] = startTime.split(":").map(Number);
		startDate.setHours(hours, minutes, seconds);

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
				window.scrollTo(0, 0);
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

	useEffect(() => {
		(async () => {
			const userId = getUserId();
			if (!userId) {
				redirect("/");
			}
		})();
	}, []);

	return (
		<Background static={true}>
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
									<div className="flex gap-4">
										<div className="flex flex-col gap-3">
											<Popover open={open} onOpenChange={setOpen}>
												<PopoverTrigger
													render={
														<Button
															variant="outline"
															id="date-picker"
															className="w-32 justify-between font-normal"
														>
															{startDate
																? startDate.toLocaleDateString()
																: "Select date"}
															<ChevronDownIcon />
														</Button>
													}
												></PopoverTrigger>
												<PopoverContent
													className="w-auto overflow-hidden p-0"
													align="start"
												>
													<Calendar
														mode="single"
														selected={startDate}
														captionLayout="dropdown"
														onSelect={(date) => {
															setStartDate(date);
															setOpen(false);
														}}
													/>
												</PopoverContent>
											</Popover>
										</div>
										<div className="flex flex-col gap-3">
											<Input
												onChange={(e) => setStartTime(e.target.value)}
												type="time"
												id="time-picker"
												step="1"
												defaultValue="07:37:15"
												className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
											/>
										</div>
									</div>
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

						{/* Submit Button */}
						<div className="flex justify-end">
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? "Creating..." : "Create Game"}
							</Button>
						</div>
					</form>
				</div>
			</Center>
		</Background>
	);
}
