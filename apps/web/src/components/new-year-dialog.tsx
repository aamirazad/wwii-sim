"use client";
import { Calendar, Droplets, Hammer, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "@/app/game/GameContext";

interface ResourceChange {
	oil: number;
	steel: number;
	population: number;
}

export function NewYearDialog() {
	const { subscribeToMessage, refetchGame } = useGame();
	const [open, setOpen] = useState(false);
	const [newYear, setNewYear] = useState<number | null>(null);
	const [changes, setChanges] = useState<ResourceChange | null>(null);

	// Lock closing for 3 seconds after opening
	const [canClose, setCanClose] = useState(false);
	const closeTimeoutRef = useRef<number | null>(null);

	useEffect(() => {
		const unsubscribe = subscribeToMessage("server.year.changed", (msg) => {
			if (msg.type === "server.year.changed") {
				setNewYear(msg.year);

				setChanges(msg.resourceChanges);
				setOpen(true);
				setCanClose(false);
				// start 3s timer
				if (closeTimeoutRef.current) {
					clearTimeout(closeTimeoutRef.current);
				}
				closeTimeoutRef.current = window.setTimeout(() => {
					setCanClose(true);
					closeTimeoutRef.current = null;
				}, 2000);
			}
		});

		return () => {
			// cleanup subscription and any timeout
			unsubscribe();
			if (closeTimeoutRef.current) {
				clearTimeout(closeTimeoutRef.current);
				closeTimeoutRef.current = null;
			}
		};
	}, [subscribeToMessage]);

	useEffect(() => {
		if (!open) return;

		const onKeyDown = (e: KeyboardEvent) => {
			// only allow Escape to close after the timer
			if (e.key === "Escape" && canClose) {
				setOpen(false);
				refetchGame();
			}
		};

		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [open, canClose, refetchGame]);

	// ensure timer is cleared when dialog closes
	useEffect(() => {
		if (!open) {
			if (closeTimeoutRef.current) {
				clearTimeout(closeTimeoutRef.current);
				closeTimeoutRef.current = null;
			}
			setCanClose(false);
		}
	}, [open]);

	const items = useMemo(() => {
		if (!changes) return [];
		return [
			{
				key: "steel",
				label: "Steel",
				icon: Hammer,
				value: changes.steel,
				accent: "text-zinc-700 dark:text-zinc-200",
				bg: "bg-zinc-50/80 dark:bg-zinc-950/30",
				ring: "ring-zinc-200/70 dark:ring-zinc-800/60",
			},
			{
				key: "oil",
				label: "Oil",
				icon: Droplets,
				value: changes.oil,
				accent: "text-sky-600",
				bg: "bg-sky-50/80 dark:bg-sky-950/30",
				ring: "ring-sky-200/70 dark:ring-sky-900/60",
			},
			{
				key: "population",
				label: "Population",
				icon: Users,
				value: changes.population,
				accent: "text-emerald-700 dark:text-emerald-300",
				bg: "bg-emerald-50/80 dark:bg-emerald-950/30",
				ring: "ring-emerald-200/70 dark:ring-emerald-900/60",
			},
		] as const;
	}, [changes]);

	const formatDelta = (n: number) => (n > 0 ? `+${n}` : `${n}`);
	const deltaTone = (n: number) =>
		n > 0
			? "text-emerald-700 dark:text-emerald-300"
			: n < 0
				? "text-rose-700 dark:text-rose-300"
				: "text-zinc-600 dark:text-zinc-400";

	if (!open || newYear == null || !changes) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="new-year-title"
			aria-describedby="new-year-desc"
		>
			<div
				className="absolute inset-0 bg-black/50 backdrop-blur-sm"
				onMouseDown={() => {
					if (canClose) setOpen(false);
				}}
				aria-hidden="true"
			/>

			<div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl ring-1 ring-black/5 dark:border-white/10 dark:bg-zinc-950">
				<div className="relative overflow-hidden border-b border-zinc-200/70 bg-primary-foreground px-6 py-5 text-white dark:border-white/10">
					<div className="pointer-events-none absolute inset-0 opacity-30">
						<div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/30 blur-3xl" />
						<div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
					</div>
					<div className="relative flex items-center gap-3">
						<div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
							<Calendar className="h-6 w-6" />
						</div>
						<div>
							<h2
								id="new-year-title"
								className="text-lg font-semibold leading-tight"
							>
								New Year!
							</h2>
						</div>
					</div>

					<div className="relative mt-4">
						<div className="inline-flex items-baseline gap-2 rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/20">
							<span className="text-sm text-white/85">Year</span>
							<span className="text-3xl font-extrabold tracking-tight">
								{newYear}
							</span>
						</div>
					</div>
				</div>

				{/* Content */}
				<div className="px-6 pb-6">
					<p className="text-sm italic py-3">
						You level up in every category. As a result, you are given the
						following resources.
					</p>
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
						{items.map((it) => {
							const Icon = it.icon;
							return (
								<div
									key={it.key}
									className={`rounded-xl p-4 ring-1 ${it.bg} ${it.ring}`}
								>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<Icon className={`h-5 w-5 ${it.accent}`} />
											<span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
												{it.label}
											</span>
										</div>
										<span
											className={`text-sm font-semibold tabular-nums ${deltaTone(
												it.value,
											)}`}
										>
											{formatDelta(it.value)}
										</span>
									</div>
								</div>
							);
						})}
					</div>
					<div className="mt-6 flex items-center justify-end gap-3">
						<button
							type="button"
							disabled={!canClose}
							onClick={() => {
								if (canClose) {
									setOpen(false);
									refetchGame();
								}
							}}
							className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-50 disabled:pointer-events-none"
						>
							Continue
						</button>
					</div>
				</div>

				{/* subtle animated shine */}
				<div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/60 to-transparent dark:via-white/30" />
			</div>
		</div>
	);
}
