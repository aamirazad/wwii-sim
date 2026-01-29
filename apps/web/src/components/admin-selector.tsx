"use client";

import { CircleX, ClockArrowUp, ExternalLink, Grip, Users } from "lucide-react";
import Link from "next/link";
import ManageUsers from "@/components/manage-users";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface AdminMenuSelectorProps {
	currentYear: number | null;
	handleTriggerNewYear: () => void;
	handleStopGame: () => void;
}

export default function AdminMenuSelector({
	currentYear,
	handleTriggerNewYear,
	handleStopGame,
}: AdminMenuSelectorProps) {
	const menuItems = [
		{
			id: "new-year",
			icon: ClockArrowUp,
			label: "New Year",
			title: "Manually Trigger New Year?",
			description: `This will immediately change the year to ${currentYear ? currentYear + 1 : ""}`,
			onAction: handleTriggerNewYear,
			isDestructive: false,
		},
		{
			id: "pause-game",
			icon: CircleX,
			label: "Pause Game",
			title: "Pause Game?",
			description:
				"This will pause the game for everyone. They will be locked out of their dashboards until a mod or admin unpauses the game.",
			onAction: handleStopGame,
			isDestructive: false,
		},
		{
			id: "end-game",
			icon: CircleX,
			label: "End Game",
			title: "End Game?",
			description:
				"This will immediately end the game for everyone and show the game summary page.",
			onAction: handleStopGame,
			isDestructive: true,
		},
	];

	return (
		<TooltipProvider>
			<Popover>
				<Tooltip>
					<TooltipTrigger
						render={
							<PopoverTrigger
								render={
									<Button
										variant="ghost"
										size="icon"
										className="size-11 p-0 hover:bg-muted/50 rounded-full"
									/>
								}
							/>
						}
					>
						<Grip className="size-6 text-foreground/70" />
						<span className="sr-only">Admin Menu</span>
					</TooltipTrigger>
					<TooltipContent>
						<p>Admin Menu</p>
					</TooltipContent>
				</Tooltip>
				<PopoverContent className="w-auto p-2" align="end">
					<div className="grid grid-cols-3 gap-1">
						{menuItems.map((item) => (
							<AlertDialog key={item.id}>
								<AlertDialogTrigger
									render={
										<Button className="h-16 w-16 flex flex-col items-center justify-center gap-1.5 p-2 hover:bg-muted/80 bg-transparent border-0 rounded-lg transition-colors" />
									}
								>
									<item.icon
										className="h-5 w-5 text-foreground/70 shrink-0"
										strokeWidth={1.5}
									/>
									<span className="text-[10px] font-medium text-center text-foreground/80 leading-tight">
										{item.label}
									</span>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>{item.title}</AlertDialogTitle>
										<AlertDialogDescription>
											{item.description}
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Cancel</AlertDialogCancel>
										<AlertDialogAction
											variant={item.isDestructive ? "destructive" : "default"}
											onClick={item.onAction}
										>
											{item.label}
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						))}
						<Dialog>
							<DialogTrigger
								render={
									<Button className="h-16 w-16 flex flex-col items-center justify-center gap-1.5 p-2 hover:bg-muted/80 bg-transparent border-0 rounded-lg transition-colors" />
								}
							>
								<Users
									className="h-5 w-5 text-foreground/70 shrink-0"
									strokeWidth={1.5}
								/>
								<span className="text-[10px] font-medium text-center text-foreground/80 leading-tight ">
									Players
								</span>
							</DialogTrigger>
							<DialogContent showCloseButton={false} className="max-w-fit!">
								<ScrollArea className="-mx-4 max-h-[80vh] overflow-y-auto px-4">
									<ManageUsers />
								</ScrollArea>
								<DialogFooter>
									<DialogClose
										render={<Button variant="outline">Cancel</Button>}
									/>
									<Button
										nativeButton={false}
										variant={"secondary"}
										render={
											<Link href="/admin/users" className="no-underline" />
										}
									>
										<ExternalLink /> Open in full page
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					</div>
				</PopoverContent>
			</Popover>
		</TooltipProvider>
	);
}
