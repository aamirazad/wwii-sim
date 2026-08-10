"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Background from "@/components/background";
import LoadingSpinner from "@/components/loading-spinner";
import { clearUserId } from "@/lib/cookies";

/**
 * Logout page that removes the userId cookie using the Cookie Store API
 * and redirects the user back to the homepage.
 */
export default function LogoutPage() {
	const router = useRouter();

	useEffect(() => {
		clearUserId();
		router.replace("/");
	}, [router]);

	return (
		<Background>
			<LoadingSpinner />
		</Background>
	);
}
