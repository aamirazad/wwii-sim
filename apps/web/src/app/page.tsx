"use client";

import type { ClientMessage, ServerMessage } from "@api/ws-events";
import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import CountryDashboard from "@/components/CountryDashboard";
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
import packageJson from "../../package.json";

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
	const [joined, setJoined] = useState(false);
	const [resources, setResources] = useState({
		oil: 0,
		steel: 0,
		population: 0,
	});
	const [apiVersion, setApiVersion] = useState<string | null>(null);
	const [open, setOpen] = useState(false);

	const wsUrl = process.env.NEXT_PUBLIC_API_WS_URL || "ws://localhost:3001/ws";

	const { sendJsonMessage, readyState } = useWebSocket(wsUrl, {
		shouldReconnect: () => true,
		onMessage: (event) => {
			try {
				const msg = JSON.parse(event.data) as ServerMessage;
				switch (msg.type) {
					case "server.connected":
						setApiVersion(msg.apiVersion);
						break;
					case "server.country_state":
						if (msg.country === selectedCountry) {
							setResources(msg.resources);
						}
						break;
					case "server.resource_updated":
						if (msg.country === selectedCountry) {
							setResources((prev) => ({
								...prev,
								[msg.resource]: msg.value,
							}));
						}
						break;
				}
			} catch (e) {
				console.error("Failed to parse WS message", e);
			}
		},
	});

	const handleJoin = () => {
		if (username && selectedCountry) {
			const msg: ClientMessage = {
				type: "client.join_country",
				country: selectedCountry,
				username,
			};
			sendJsonMessage(msg);
			setJoined(true);
		}
	};

	const handleUpdateResource = (resource: string, value: number) => {
		if (selectedCountry) {
			const msg: ClientMessage = {
				type: "client.update_resource",
				country: selectedCountry,
				resource,
				value,
			};
			sendJsonMessage(msg);
		}
	};

	if (readyState !== ReadyState.OPEN) {
		return (
			<div className="min-h-screen flex items-center justify-center p-8 font-sans">
				<Card className="w-full max-w-md">
					<CardContent>
						<p className="text-center text-red-600 font-bold">
							The server is off right now. If you think this is a mistake,
							contact Aamir
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<main className="min-h-screen p-8 font-sans">
			<div className="mb-6 flex justify-between items-start">
				<h1 className="text-3xl font-bold">
					HASD History Club’s WWII Simulation
				</h1>
				<div className="text-xs text-gray-500 text-right">
					<div>
						WS Status:{" "}
						{readyState === ReadyState.OPEN ? "Connected" : "Disconnected"}
					</div>
					<div>Web Version: {packageJson.version}</div>
					<div>API Version: {apiVersion || "..."}</div>
					{apiVersion && apiVersion !== packageJson.version && (
						<div className="text-red-500 font-bold">Version Mismatch!</div>
					)}
				</div>
			</div>

			{!joined ? (
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
						<div className="space-y-2">
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
								<PopoverContent className="w-[200px] p-0">
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
							onClick={handleJoin}
							disabled={!username || !selectedCountry}
						>
							Join Game
						</Button>
					</CardContent>
				</Card>
			) : (
				<CountryDashboard
					country={selectedCountry}
					resources={resources}
					onUpdateResource={handleUpdateResource}
				/>
			)}
		</main>
	);
}
