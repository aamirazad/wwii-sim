/**
 * Cookie utilities for client-side cookie management
 *
 * Note: Direct document.cookie assignment is the standard browser API.
 * We centralize cookie operations here for consistency.
 */

const ONE_YEAR_IN_SECONDS = 31536000;

/**
 * Get a cookie value by name
 */
export function getCookie(name: string): string | null {
	if (typeof document === "undefined") return null;
	const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
	return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Set a cookie with the given name and value
 */
export function setCookie(
	name: string,
	value: string,
	options: {
		maxAge?: number;
		path?: string;
	} = {},
): void {
	const { maxAge = ONE_YEAR_IN_SECONDS, path = "/" } = options;
	// biome-ignore lint/suspicious/noDocumentCookie: This is a cookie utility
	document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=${path}`;
}

/**
 * Delete a cookie by name
 */
export function deleteCookie(name: string, path = "/"): void {
	// biome-ignore lint/suspicious/noDocumentCookie: This is a cookie utility
	document.cookie = `${name}=; max-age=0; path=${path}`;
}

/**
 * Get the userId from the cookie
 */
export function getUserId(): string | null {
	return getCookie("userId");
}

/**
 * Set the userId cookie
 */
export function setUserId(userId: string): void {
	setCookie("userId", userId);
}

/**
 * Clear the userId cookie (logout)
 */
export function clearUserId(): void {
	deleteCookie("userId");
}
