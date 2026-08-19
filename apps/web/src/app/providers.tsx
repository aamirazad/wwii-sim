"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Suspense, useState } from "react";
import { TutorialProvider } from "@/components/tutorial-provider";

export function Providers({ children }: { children: React.ReactNode }) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 10_000,
						retry: 2,
						refetchOnWindowFocus: false,
					},
				},
			}),
	);

	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="system"
			enableSystem
			disableTransitionOnChange
		>
			<QueryClientProvider client={queryClient}>
				<Suspense fallback={null}>
					<TutorialProvider>{children}</TutorialProvider>
				</Suspense>
			</QueryClientProvider>
		</ThemeProvider>
	);
}
