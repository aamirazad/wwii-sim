import { eq } from "drizzle-orm";
import { db } from "../db";
import { usersTable } from "../db/schema";

type UserRecord = typeof usersTable.$inferSelect;
const userCache = new Map<string, { user: UserRecord; expiresAt: number }>();
const CACHE_TTL_MS = 30_000;

export async function getCachedUser(userId: string) {
	const cached = userCache.get(userId);
	if (cached && cached.expiresAt > Date.now()) return cached.user;
	const [user] = await db
		.select()
		.from(usersTable)
		.where(eq(usersTable.id, userId));
	if (user) {
		userCache.set(userId, { user, expiresAt: Date.now() + CACHE_TTL_MS });
	} else {
		userCache.delete(userId);
	}
	return user;
}

export function cacheUser(user: UserRecord) {
	userCache.set(user.id, { user, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function invalidateCachedUser(userId: string) {
	userCache.delete(userId);
}
