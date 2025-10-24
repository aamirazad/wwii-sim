"use client";

import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import {
	Authenticated,
	Unauthenticated,
	useMutation,
	useQuery,
} from "convex/react";
import Link from "next/link";
import { api } from "~/convex/_generated/api";

export default function Home() {
	return (
		<div className="flex flex-col gap-6 p-6">
			<div className="flex items-center justify-between">
				<h1 className="font-bold text-2xl text-glow-orange tracking-tight sm:text-3xl">
					Convex + Next.js + Clerk
				</h1>
				<UserButton />
			</div>
			<Authenticated>
				<Content />
			</Authenticated>
			<Unauthenticated>
				<SignInForm />
			</Unauthenticated>
		</div>
	);
}

function SignInForm() {
	return (
		<div className="mx-auto flex w-80 max-w-full flex-col gap-4 text-center">
			<p className="text-slate-300">Log in to see the numbers</p>
			<div className="flex justify-center gap-3">
				<SignInButton mode="modal">
					<button
						type="button"
						className="rounded-2xl bg-orange-600 px-4 py-2 font-semibold text-sm text-white transition-colors hover:bg-orange-500 focus-visible:bg-orange-500"
					>
						Sign in
					</button>
				</SignInButton>
				<SignUpButton mode="modal">
					<button
						type="button"
						className="rounded-2xl border border-orange-900/40 bg-slate-900/60 px-4 py-2 text-slate-200 text-sm transition-colors hover:bg-slate-800/60 focus-visible:bg-slate-800/60"
					>
						Sign up
					</button>
				</SignUpButton>
			</div>
		</div>
	);
}

function Content() {
	const { viewer, numbers } =
		useQuery(api.myFunctions.listNumbers, {
			count: 10,
		}) ?? {};
	const addNumber = useMutation(api.myFunctions.addNumber);

	if (viewer === undefined || numbers === undefined) {
		return (
			<div className="mx-auto w-full max-w-2xl">
				<div className="island animate-pulse rounded-3xl p-6">
					<div className="h-4 w-1/3 rounded bg-neutral-800" />
					<div className="h-3 w-2/3 rounded bg-neutral-800" />
					<div className="h-3 w-1/2 rounded bg-neutral-800" />
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
			<div className="island rounded-3xl p-6">
				<p className="text-zinc-300">Welcome {viewer ?? "Anonymous"}!</p>
				<p className="mt-2 text-sm text-zinc-400">
					Click the button to add a random number. Open this page in another
					window to see live updates from Convex.
				</p>
				<div className="mt-4">
					<button
						type="button"
						className="rounded-2xl bg-orange-600 px-4 py-2 font-semibold text-sm text-white transition-colors hover:bg-orange-500 focus-visible:bg-orange-500"
						onClick={() => {
							void addNumber({ value: Math.floor(Math.random() * 10) });
						}}
					>
						Add a random number
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div className="island rounded-3xl p-6">
					<p className="text-sm text-zinc-400">Numbers</p>
					<p className="mt-2 font-semibold text-lg text-orange-300">
						{numbers?.length === 0 ? "Click the button!" : numbers?.join(", ")}
					</p>
				</div>
				<div className="island rounded-3xl p-6">
					<p className="text-sm text-zinc-400">Shortcuts</p>
					<p className="mt-2 text-zinc-300">
						See the{" "}
						<Link
							href="/server"
							className="underline underline-offset-4 hover:opacity-90"
						>
							/server
						</Link>{" "}
						route for server component data.
					</p>
				</div>
			</div>

			<div className="island rounded-3xl p-6">
				<p className="font-bold text-lg">Useful resources</p>
				<div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
					<ResourceCard
						title="Convex docs"
						description="Read comprehensive documentation for all Convex features."
						href="https://docs.convex.dev/home"
					/>
					<ResourceCard
						title="Templates"
						description="Browse our collection of templates to get started quickly."
						href="https://www.convex.dev/templates"
					/>
					<ResourceCard
						title="Stack articles"
						description="Best practices, use cases, and more from articles and videos."
						href="https://www.typescriptlang.org/docs/handbook/2/basic-types.html"
					/>
					<ResourceCard
						title="Discord"
						description="Join our developer community to share tips and get help."
						href="https://www.convex.dev/community"
					/>
				</div>
			</div>
		</div>
	);
}

function ResourceCard({
	title,
	description,
	href,
}: {
	title: string;
	description: string;
	href: string;
}) {
	return (
		<div className="island flex h-28 flex-col gap-2 overflow-auto rounded-2xl p-4">
			<a
				href={href}
				className="text-orange-300 text-sm underline underline-offset-4 hover:opacity-90"
			>
				{title}
			</a>
			<p className="text-slate-300 text-xs">{description}</p>
		</div>
	);
}
