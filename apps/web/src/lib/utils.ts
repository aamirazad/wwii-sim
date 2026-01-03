import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// Cookie utilities
export function setCookie(name: string, value: string, maxAgeSeconds: number) {
	const encodedValue = encodeURIComponent(value);
	// biome-ignore lint: Safe usage for auth token storage
	document.cookie = `${name}=${encodedValue}; max-age=${maxAgeSeconds}; path=/`;
}

export function getCookie(name: string): string | null {
	if (typeof document === "undefined") return null;
	const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
	return match ? decodeURIComponent(match[1]) : null;
}

export function deleteCookie(name: string) {
	// biome-ignore lint: Safe usage for auth token storage
	document.cookie = `${name}=; max-age=0; path=/`;
}
