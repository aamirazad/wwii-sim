import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { GameState, UserState } from "@/app/game/GameContext";

/**
 * Page access requirements
 */
export type PageRequirement = "active-game" | "paused-game" | "waiting-game";

interface UseGamePageGuardOptions {
	/**
	 * The game status required for this page
	 * - "active-game": Page requires an active game (mods always have access)
	 * - "paused-game": Page requires a paused game (redirects active games away)
	 * - "waiting-game": Page requires a waiting game (redirects active/paused games away)
	 */
	requires: PageRequirement;
	gameState: GameState;
	userState: UserState;
}

/**
 * Custom hook to handle game page access control and redirects.
 *
 * Rules:
 * - Mods (country === "Mods") always have access to active/paused game pages
 * - Pages requiring "active-game" redirect to /game/join if no game or game not active
 * - Pages requiring "paused-game" redirect to /game/assets if game is active
 * - Pages requiring "waiting-game" redirect based on game status
 *
 * @example
 * // In a page that requires an active game:
 * useGamePageGuard({
 *   requires: "active-game",
 *   gameState,
 *   userState
 * });
 *
 * @example
 * // In the paused page:
 * useGamePageGuard({
 *   requires: "paused-game",
 *   gameState,
 *   userState
 * });
 */
export function useGamePageGuard({
	requires,
	gameState,
	userState,
}: UseGamePageGuardOptions) {
	const router = useRouter();

	useEffect(() => {
		// Don't redirect while still loading
		if (gameState.status === "loading" || userState.status === "loading") {
			return;
		}

		const isMod =
			userState.status === "authenticated" && userState.user.country === "Mods";

		if (userState.status === "error") {
			router.push("/error?e=invalid-session");
			return;
		}

		// Handle pages that require an active game
		if (requires === "active-game") {
			// No game exists
			if (gameState.status === "no-game") {
				router.push("/game/join");
				return;
			}

			// Game exists but not active
			if (gameState.status === "has-game") {
				const gameStatus = gameState.game.status;

				// Redirect based on game status
				if (gameStatus === "waiting") {
					router.push("/game/join");
					return;
				}

				// Mods bypass pause
				if (isMod) {
					return;
				}

				if (gameStatus === "paused") {
					router.push("/game/paused");
					return;
				}
			}
		}

		// Handle the paused page
		if (requires === "paused-game") {
			// No game or game is not paused
			if (gameState.status === "no-game") {
				router.replace("/game/join");
				return;
			}

			if (gameState.status === "has-game") {
				const gameStatus = gameState.game.status;

				if (gameStatus === "waiting") {
					router.replace("/game/join");
					return;
				}

				if (gameStatus === "active") {
					router.replace("/game/assets");
					return;
				}
			}
		}

		// Handle the waiting/join page
		if (requires === "waiting-game") {
			if (gameState.status === "has-game") {
				const gameStatus = gameState.game.status;

				// Active game: go to resources
				if (gameStatus === "active") {
					router.replace("/game/assets");
					return;
				}

				// Paused game: go to paused page
				if (gameStatus === "paused") {
					router.replace("/game/paused");
					return;
				}
			}
		}
	}, [gameState, userState, requires, router]);
}
