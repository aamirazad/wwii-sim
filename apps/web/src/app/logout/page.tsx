"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LoadingSpinner from "@/components/loading-spinner";

/**
 * Logout page that removes the userId cookie using the Cookie Store API
 * and redirects the user back to the homepage.
 */
export default function LogoutPage() {
	const router = useRouter();

	useEffect(() => {
		const performLogout = async () => {
			try {
				// Remove the login cookie
				await cookieStore.delete("userId");
			} catch (error) {
				console.error("Failed to clear cookie:", error);
			} finally {
				// Redirect to home
				router.push("/");
			}
		};

		performLogout();
	}, [router]);

	return <LoadingSpinner />;
}
