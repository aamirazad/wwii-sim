"use client";
import { Calendar } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useGame } from "@/app/game/GameContext";

export function NewYearDialog() {
	const { subscribeToMessage, refetchGame } = useGame();
	const [open, setOpen] = useState(false);
	const [newYear, setNewYear] = useState<number | null>(null);

	// Lock closing for 3 seconds after opening
	const [canClose, setCanClose] = useState(false);
	const closeTimeoutRef = useRef<number | null>(null);

	useEffect(() => {
		const unsubscribe = subscribeToMessage("server.year.changed", (msg) => {
			if (msg.type === "server.year.changed") {
				setNewYear(msg.year);

				setOpen(true);
				setCanClose(false);
				// Immediately refetch game state to update year
				refetchGame();
				// start 2s timer before allowing close
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
	}, [subscribeToMessage, refetchGame]);

	useEffect(() => {
		if (!open) return;

		const onKeyDown = (e: KeyboardEvent) => {
			// only allow Escape to close after the timer
			if (e.key === "Escape" && canClose) {
				setOpen(false);
			}
		};

		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [open, canClose]);

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

	if (!open || newYear == null) return null;

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

			<div className="relative w-full max-w-xl overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-2xl ring-1 ring-foreground/5">
				<div className="relative overflow-hidden border-b border-primary/30 bg-primary px-6 py-5 text-primary-foreground">
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
							<span className="text-sm text-primary-foreground/85">Year</span>
							<span className="text-3xl font-extrabold tracking-tight">
								{newYear}
							</span>
						</div>
					</div>
				</div>

				{/* Content */}
				<div className="px-6 pb-6">
					<p className="text-sm italic py-3">
						Make sure to increase your levels and add your resources.
					</p>
					<div className="mt-6 flex items-center justify-end gap-3">
						<button
							type="button"
							disabled={!canClose}
							onClick={() => {
								if (canClose) {
									setOpen(false);
								}
							}}
							className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-50"
						>
							Continue
						</button>
					</div>
				</div>

				{/* subtle animated shine */}
				<div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary-foreground/60 to-transparent" />
			</div>
		</div>
	);
}
