"use client";

import type { YearSchedule } from "@api/schema";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useGame } from "@/app/game/GameContext";
import CountryDashboard from "@/components/country-dashboard";
import LoadingSpinner from "@/components/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { getUserId } from "@/lib/cookies";

interface ScheduleData {
	currentYear: number;
	schedules: YearSchedule[];
}

function AddScheduleDialog({
	gameId,
	onSuccess,
}: {
	gameId: number;
	onSuccess: () => void;
}) {
	const userId = getUserId();
	const [open, setOpen] = useState(false);
	const [year, setYear] = useState("");
	const [dateTime, setDateTime] = useState(() => {
		const now = new Date();
		now.setMinutes(now.getMinutes() - now.getTimezoneOffset() + 1);
		return now.toISOString().slice(0, 16);
	});
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!userId || !year || !dateTime) return;

		setIsSubmitting(true);
		setError(null);

		try {
			const response = await api
				.game({ gameId: String(gameId) })
				["year-schedules"].post(
					{
						scheduledYear: Number.parseInt(year, 10),
						scheduledTime: new Date(dateTime).toISOString(),
					},
					{
						query: { authorization: userId },
					},
				);

			if (response.error) {
				setError(response.error.value.message || "Failed to add schedule");
				return;
			}

			setYear("");
			setDateTime("");
			setOpen(false);
			onSuccess();
		} catch {
			setError("Failed to add schedule");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={<Button />}>
				<Plus className="mr-2 h-4 w-4" />
				Add Schedule
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add Year Schedule</DialogTitle>
					<DialogDescription>
						Schedule a year change to occur at a specific time.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="year">Year to Change To</Label>
						<Input
							id="year"
							type="number"
							min={1939}
							max={1950}
							placeholder="e.g., 1940"
							value={year}
							onChange={(e) => setYear(e.target.value)}
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="datetime">Scheduled Time</Label>
						<Input
							id="datetime"
							type="datetime-local"
							value={dateTime}
							onChange={(e) => setDateTime(e.target.value)}
							required
						/>
					</div>
					{error && <p className="text-sm text-destructive">{error}</p>}
					<DialogFooter>
						<DialogClose render={<Button type="button" variant="outline" />}>
							Cancel
						</DialogClose>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Adding..." : "Add Schedule"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function EditScheduleDialog({
	schedule,
	gameId,
	onSuccess,
}: {
	schedule: YearSchedule;
	gameId: number;
	onSuccess: () => void;
}) {
	const userId = getUserId();
	const [open, setOpen] = useState(false);
	const [year, setYear] = useState(String(schedule.scheduledYear));
	const [dateTime, setDateTime] = useState(() => {
		const now = new Date(schedule.scheduledTime);
		now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
		return now.toISOString().slice(0, 16);
	});
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!userId) return;

		setIsSubmitting(true);
		setError(null);

		try {
			const response = await api
				.game({ gameId: String(gameId) })
				["year-schedules"]({ scheduleId: String(schedule.id) })
				.patch(
					{
						scheduledYear: Number.parseInt(year, 10),
						scheduledTime: new Date(dateTime).toISOString(),
					},
					{
						query: { authorization: userId },
					},
				);

			if (response.error) {
				setError(response.error.value.message || "Failed to update schedule");
				return;
			}

			setOpen(false);
			onSuccess();
		} catch {
			setError("Failed to update schedule");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger
				render={<Button variant="ghost" size="icon" className="h-8 w-8" />}
			>
				<Pencil className="h-4 w-4" />
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit Year Schedule</DialogTitle>
					<DialogDescription>
						Update the scheduled year change.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="edit-year">Year to Change To</Label>
						<Input
							id="edit-year"
							type="number"
							min={1939}
							max={1950}
							value={year}
							onChange={(e) => setYear(e.target.value)}
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="edit-datetime">Scheduled Time</Label>
						<Input
							id="edit-datetime"
							type="datetime-local"
							value={dateTime}
							onChange={(e) => setDateTime(e.target.value)}
							required
						/>
					</div>
					{error && <p className="text-sm text-destructive">{error}</p>}
					<DialogFooter>
						<DialogClose render={<Button type="button" variant="outline" />}>
							Cancel
						</DialogClose>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Saving..." : "Save Changes"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function ScheduleRow({
	schedule,
	gameId,
	onDelete,
	onUpdate,
}: {
	schedule: YearSchedule;
	gameId: number;
	onDelete: () => void;
	onUpdate: () => void;
}) {
	const userId = getUserId();
	const [isDeleting, setIsDeleting] = useState(false);

	const scheduledTime = new Date(schedule.scheduledTime);
	const isPast = scheduledTime.getTime() < Date.now();

	const handleDelete = async () => {
		if (!userId) return;

		setIsDeleting(true);
		try {
			await api
				.game({ gameId: String(gameId) })
				["year-schedules"]({ scheduleId: String(schedule.id) })
				.delete(undefined, {
					query: { authorization: userId },
				});
			onDelete();
		} catch {
			alert("Failed to delete schedule");
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<tr className={`border-t ${isPast ? "opacity-50" : ""}`}>
			<td className="px-4 py-3 font-mono font-bold text-lg">
				{schedule.scheduledYear}
			</td>
			<td className="px-4 py-3">
				<div className="flex items-center gap-2">
					<Clock className="h-4 w-4 text-muted-foreground" />
					{scheduledTime.toLocaleString()}
				</div>
			</td>
			<td className="px-4 py-3 text-muted-foreground">
				{isPast ? (
					<span className="text-yellow-500">Past</span>
				) : (
					<span className="text-green-500">Scheduled</span>
				)}
			</td>
			<td className="px-4 py-3">
				<div className="flex items-center gap-1">
					<EditScheduleDialog
						schedule={schedule}
						gameId={gameId}
						onSuccess={onUpdate}
					/>
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 text-destructive hover:text-destructive"
						onClick={handleDelete}
						disabled={isDeleting}
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			</td>
		</tr>
	);
}

export default function SchedulePage() {
	const { gameState, userState } = useGame();
	const router = useRouter();
	const userId = getUserId();

	const isAdmin =
		userState.status === "authenticated" && userState.user.role === "admin";
	const isMod =
		userState.status === "authenticated" && userState.user.country === "Mods";
	const gameId = gameState.status === "has-game" && gameState.game.id;

	// Redirect non-admin/mod users
	useEffect(() => {
		if (userState.status === "authenticated" && !isAdmin && !isMod) {
			router.push("/game/resources");
		}
	}, [userState, isAdmin, isMod, router]);

	const {
		data: scheduleData,
		isLoading,
		refetch,
	} = useQuery<ScheduleData>({
		queryKey: ["year-schedules", gameId],
		queryFn: async () => {
			if (!userId || gameState.status !== "has-game")
				throw new Error("Not ready");
			const response = await api
				.game({ gameId: String(gameState.game.id) })
				["year-schedules"].get({
					query: { authorization: userId },
				});
			if (response.error) throw new Error("Failed to fetch schedules");
			return response.data as ScheduleData;
		},
		enabled: !!userId && gameState.status === "has-game" && (isAdmin || isMod),
		refetchInterval: 10000, // Refresh every 10 seconds
	});

	if (gameState.status !== "has-game") return <LoadingSpinner />;
	if (!isAdmin && !isMod) return <LoadingSpinner />;

	const handleRefresh = () => {
		refetch();
	};

	// Sort schedules by time
	const sortedSchedules = scheduleData?.schedules
		? [...scheduleData.schedules].sort(
				(a, b) =>
					new Date(a.scheduledTime).getTime() -
					new Date(b.scheduledTime).getTime(),
			)
		: [];

	return (
		<CountryDashboard tab="Schedule">
			<div className="space-y-6">
				{/* Current Year Card */}
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="flex items-center gap-2 text-muted-foreground">
							<Calendar className="h-5 w-5" />
							Current Year
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-5xl font-bold tracking-tight">
							{scheduleData?.currentYear ?? gameState.game.currentYear}
						</div>
					</CardContent>
				</Card>

				{/* Schedules Card */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between">
						<CardTitle>Scheduled Year Changes</CardTitle>
						<AddScheduleDialog
							gameId={gameState.game.id}
							onSuccess={handleRefresh}
						/>
					</CardHeader>
					<CardContent>
						{isLoading ? (
							<div className="flex justify-center py-8">
								<LoadingSpinner />
							</div>
						) : sortedSchedules.length === 0 ? (
							<p className="text-muted-foreground text-center py-8">
								No year changes scheduled. Add one to get started.
							</p>
						) : (
							<div className="border rounded-lg overflow-hidden">
								<table className="w-full">
									<thead className="bg-muted/50">
										<tr>
											<th className="px-4 py-3 text-left">Year</th>
											<th className="px-4 py-3 text-left">Scheduled Time</th>
											<th className="px-4 py-3 text-left">Status</th>
											<th className="px-4 py-3 text-left">Actions</th>
										</tr>
									</thead>
									<tbody>
										{sortedSchedules.map((schedule) => (
											<ScheduleRow
												key={schedule.id}
												schedule={schedule}
												gameId={gameState.game.id}
												onDelete={handleRefresh}
												onUpdate={handleRefresh}
											/>
										))}
									</tbody>
								</table>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</CountryDashboard>
	);
}
