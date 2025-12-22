"use client";

import type { ServerMessage } from "@api/ws-events";
import { Check, ChevronsUpDown, Unplug } from "lucide-react";
import { useEffect, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
];

export default function Home() {
	const [username, setUsername] = useState("");
	const [selectedCountry, setSelectedCountry] = useState<string | null>("");
	const [apiVersion, setApiVersion] = useState<string | null>(null);
	const [open, setOpen] = useState(false);

	const wsUrl = process.env.NEXT_PUBLIC_API_WS_URL || "ws://localhost:3001/ws";

	const { lastJsonMessage, readyState } = useWebSocket(wsUrl);

	useEffect(() => {
		if (lastJsonMessage) {
			try {
				const msg = lastJsonMessage as ServerMessage;
				switch (msg.type) {
					case "server.connected":
						setApiVersion(msg.apiVersion);
						break;
				}
			} catch (e) {
				console.error("Failed to parse WS message", e);
			}
		}
	}, [lastJsonMessage]);

	return (
		<main className="min-h-screen p-8 font-sans">
			<div className="mb-6 flex justify-between items-start">
				<h1 className="text-3xl font-bold">
					HASD History Club's WWII Simulation
				</h1>
				<div className="text-xs text-gray-500 text-right">
					<div>
						WS Status:{" "}
						{readyState === ReadyState.CONNECTING
							? "Connecting"
							: readyState === ReadyState.OPEN
								? "Connected"
								: "Disconnected"}
					</div>
					<div>API Version: {apiVersion || "..."}</div>
				</div>
			</div>
			<Card className="max-w-md mx-auto">
				<CardHeader>
					<CardTitle>Join Simulation</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="username">Your Name</Label>
						<Input
							id="username"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							placeholder="Enter your name"
						/>
					</div>
					<div className="">
						<Popover open={open} onOpenChange={setOpen}>
							<PopoverTrigger
								render={
									<Button
										variant="outline"
										aria-expanded={open}
										className="w-full justify-between"
									>
										{selectedCountry || "Select your country"}
										<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
									</Button>
								}
							></PopoverTrigger>
							<PopoverContent className="w-50 p-0">
								<Command>
									<CommandInput
										placeholder="Search framework..."
										className="h-9"
									/>
									<CommandList>
										<CommandEmpty>No framework found.</CommandEmpty>
										<CommandGroup>
											{COUNTRIES.map((country) => (
												<CommandItem
													key={country}
													value={country}
													onSelect={(selected) => {
														setSelectedCountry(selected);
														setOpen(false);
													}}
												>
													{country}
													<Check
														className={cn(
															"ml-auto",
															selectedCountry === country
																? "opacity-100"
																: "opacity-0",
														)}
													/>
												</CommandItem>
											))}
										</CommandGroup>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>
					</div>
					<Button
						className="w-full"
						disabled={
							!username || !selectedCountry || readyState !== ReadyState.OPEN
						}
					>
						Join Game
					</Button>
					{readyState === ReadyState.CLOSED && (
						<Alert className="bg-red-950">
							<Unplug />
							<AlertTitle>Unable to Connect!</AlertTitle>
							<AlertDescription>
								We were unable to connect to the server. This could be because
								the server is off right now.{" "}
								<a href="mailto:aamirmazad@gmail.com">Contact Aamir</a> if you
								think this is a mistake.
							</AlertDescription>
						</Alert>
					)}
				</CardContent>
			</Card>
		</main>
	);
}
