import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CountryDashboardProps {
	country: string | null;
	resources: {
		oil: number;
		steel: number;
		population: number;
	};
	onUpdateResource: (resource: string, value: number) => void;
}

export default function CountryDashboard({
	country,
	resources,
	onUpdateResource,
}: CountryDashboardProps) {
	const [activeTab, setActiveTab] = useState<
		"resources" | "troops" | "research" | "info"
	>("resources");

	if (!country) {
		return <div>No country selected</div>;
	}

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h2 className="text-2xl font-bold">{country} Dashboard</h2>
			</div>

			<div className="flex space-x-2">
				<Button
					variant={activeTab === "resources" ? "default" : "outline"}
					onClick={() => setActiveTab("resources")}
				>
					Resources
				</Button>
				<Button
					variant={activeTab === "troops" ? "default" : "outline"}
					disabled
					title="Not available yet"
				>
					Troops
				</Button>
				<Button
					variant={activeTab === "research" ? "default" : "outline"}
					disabled
					title="Not available yet"
				>
					Research
				</Button>
				<Button
					variant={activeTab === "info" ? "default" : "outline"}
					disabled
					title="Not available yet"
				>
					Game Info
				</Button>
			</div>

			{activeTab === "resources" && (
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<ResourceCard
						name="Oil"
						value={resources.oil}
						onChange={(val) => onUpdateResource("oil", val)}
					/>
					<ResourceCard
						name="Steel"
						value={resources.steel}
						onChange={(val) => onUpdateResource("steel", val)}
					/>
					<ResourceCard
						name="Population"
						value={resources.population}
						onChange={(val) => onUpdateResource("population", val)}
					/>
				</div>
			)}
		</div>
	);
}

function ResourceCard({
	name,
	value,
	onChange,
}: {
	name: string;
	value: number;
	onChange: (val: number) => void;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{name}</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="flex flex-col space-y-2">
					<div className="text-3xl font-bold">{value}</div>
					<div className="flex items-center space-x-2">
						<Label htmlFor={`resource-${name}`} className="sr-only">
							Update {name}
						</Label>
						<Input
							id={`resource-${name}`}
							type="number"
							placeholder="New value"
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									const val = parseInt(e.currentTarget.value, 10);
									if (!Number.isNaN(val)) {
										onChange(val);
										e.currentTarget.value = "";
									}
								}
							}}
						/>
						<Button
							size="sm"
							onClick={(e) => {
								const input = e.currentTarget
									.previousElementSibling as HTMLInputElement;
								const val = parseInt(input.value, 10);
								if (!Number.isNaN(val)) {
									onChange(val);
									input.value = "";
								}
							}}
						>
							Update
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
