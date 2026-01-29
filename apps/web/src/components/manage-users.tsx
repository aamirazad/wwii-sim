"use client";

import type { Country, User } from "@api/schema";
import { COUNTRIES } from "@api/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Copy, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import LoadingSpinner from "@/components/loading-spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { getUserId } from "@/lib/cookies";
import { cn } from "@/lib/utils";

export default function ManageUsers() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const userId = getUserId();
	const [mounted, setMounted] = useState(false);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [createFormData, setCreateFormData] = useState({
		username: "",
		name: "",
		email: "",
		role: "player" as "admin" | "player" | "spectator",
	});
	const [error, setError] = useState<string | null>(null);

	// Check if user is authenticated and is admin
	const { data: userData, isLoading: userLoading } = useQuery({
		queryKey: ["user", userId],
		queryFn: async () => {
			if (!userId) throw new Error("Unauthenticated");
			const response = await api.user({ id: userId }).get();
			if (response.error) throw new Error("Failed to fetch user");
			return response.data;
		},
		enabled: !!userId,
	});

	// Fetch all users
	const { data: users, isLoading: usersLoading } = useQuery({
		queryKey: ["users"],
		queryFn: async () => {
			if (!userId) throw new Error("Unauthenticated");
			const response = await api.users.get({
				query: { authorization: userId },
			});
			if (response.error) throw new Error("Failed to fetch users");
			return response.data;
		},
		enabled: !!userId,
	});

	// Create user mutation
	const createUserMutation = useMutation({
		mutationFn: async (data: typeof createFormData) => {
			if (!userId) throw new Error("Unauthenticated");
			const response = await api.users.post(data, {
				query: { authorization: userId },
			});
			if (response.error) throw new Error("Failed to create user");
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["users"] });
			setIsCreateDialogOpen(false);
			setCreateFormData({
				username: "",
				name: "",
				email: "",
				role: "player",
			});
			setError(null);
		},
		onError: (err: Error) => {
			setError(err.message);
		},
	});

	// Assign country mutation
	const assignCountryMutation = useMutation({
		mutationFn: async ({
			userId,
			country,
		}: {
			userId: string;
			country: Country | undefined;
		}) => {
			const authUserId = getUserId();
			if (!authUserId) throw new Error("Unauthenticated");
			const response = await api.user({ id: userId }).country.patch(
				{ country },
				{
					query: { authorization: authUserId },
				},
			);
			if (response.error) throw new Error("Failed to assign country");
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["users"] });
		},
	});

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) return null;

	if (!userId) {
		router.push("/login");
		return null;
	}

	if (userLoading) {
		return <LoadingSpinner />;
	}

	if (userData?.error || !userData?.user || userData.user.role !== "admin") {
		return (
			<div className="flex items-center justify-center h-screen">
				<Alert variant="destructive" className="max-w-md">
					<AlertTitle>Access Denied</AlertTitle>
					<AlertDescription>
						You must be an admin to access this page.
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	const handleCreateUser = () => {
		setError(null);
		createUserMutation.mutate(createFormData);
	};

	return (
		<>
			<div className="flex justify-between items-center mb-6">
				<div>
					<h1 className="text-3xl font-bold">User Management</h1>
					<p className="text-muted-foreground">
						Create users and assign them to countries
					</p>
				</div>
				<Button onClick={() => setIsCreateDialogOpen(true)}>
					<UserPlus className="mr-2 h-4 w-4" />
					Create User
				</Button>
			</div>

			{usersLoading ? (
				<div className="flex items-center justify-center h-64">
					<p>Loading users...</p>
				</div>
			) : (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{users?.map((user) => (
						<UserCard
							key={user.id}
							user={user}
							onAssignCountry={(country) =>
								assignCountryMutation.mutate({ userId: user.id, country })
							}
						/>
					))}
				</div>
			)}

			{/* Create User Dialog */}
			<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create New User</DialogTitle>
						<DialogDescription>
							Add a new user to the system. You can assign them to a country
							later.
						</DialogDescription>
					</DialogHeader>

					{error && (
						<Alert variant="destructive">
							<AlertTitle>Error</AlertTitle>
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="username">Username</Label>
							<Input
								id="username"
								value={createFormData.username}
								onChange={(e) =>
									setCreateFormData((prev) => ({
										...prev,
										username: e.target.value,
									}))
								}
								placeholder="johndoe"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="name">Full Name</Label>
							<Input
								id="name"
								value={createFormData.name}
								onChange={(e) =>
									setCreateFormData((prev) => ({
										...prev,
										name: e.target.value,
									}))
								}
								placeholder="John Doe"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								value={createFormData.email}
								onChange={(e) =>
									setCreateFormData((prev) => ({
										...prev,
										email: e.target.value,
									}))
								}
								placeholder="john@example.com"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="role">Role</Label>
							<Select
								value={createFormData.role}
								onValueChange={(value) =>
									setCreateFormData((prev) => ({
										...prev,
										role: value as "admin" | "player" | "spectator",
									}))
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="player">Player</SelectItem>
									<SelectItem value="admin">Admin</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsCreateDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={handleCreateUser}
							disabled={createUserMutation.isPending}
						>
							{createUserMutation.isPending ? "Creating..." : "Create User"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

function UserCard({
	user,
	onAssignCountry,
}: {
	user: User;
	onAssignCountry: (country: Country | undefined) => void;
}) {
	const [open, setOpen] = useState(false);
	const [copy, setCopy] = useState(false);

	const copyLoginLink = () => {
		const link = `${window.location.origin}/login?id=${user.id}`;
		navigator.clipboard.writeText(link);
		setCopy(true);
		setTimeout(() => setCopy(false), 1000);
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center justify-between">
					<span>{user.name}</span>
					<Badge variant={user.role === "admin" ? "default" : "secondary"}>
						{user.role}
					</Badge>
				</CardTitle>
				<CardDescription>@{user.username}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				<Button variant="outline" size="sm" onClick={copyLoginLink}>
					{copy ? <Check /> : <Copy className="mr-2 h-4 w-4" />}
					Copy login link
				</Button>

				<div className="space-y-2">
					<Label className="text-xs">Country Assignment</Label>
					<Popover open={open} onOpenChange={setOpen}>
						<PopoverTrigger
							render={
								<Button
									variant="outline"
									role="combobox"
									aria-expanded={open}
									className="w-full justify-between"
								>
									{user.country || "Not assigned"}
									<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
								</Button>
							}
						></PopoverTrigger>
						<PopoverContent className="w-full p-0">
							<Command>
								<CommandInput placeholder="Search country..." />
								<CommandList>
									<CommandEmpty>No country found.</CommandEmpty>
									<CommandGroup>
										<CommandItem
											onSelect={() => {
												onAssignCountry(undefined);
												setOpen(false);
											}}
										>
											<Check
												className={cn(
													"mr-2 h-4 w-4",
													!user.country ? "opacity-100" : "opacity-0",
												)}
											/>
											None
										</CommandItem>
										{COUNTRIES.map((country) => (
											<CommandItem
												key={country}
												value={country}
												onSelect={() => {
													onAssignCountry(country);
													setOpen(false);
												}}
											>
												<Check
													className={cn(
														"mr-2 h-4 w-4",
														user.country === country
															? "opacity-100"
															: "opacity-0",
													)}
												/>
												{country}
											</CommandItem>
										))}
									</CommandGroup>
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
				</div>
			</CardContent>
		</Card>
	);
}
