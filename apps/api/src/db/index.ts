/** biome-ignore-all lint/style/noNonNullAssertion: required env */

import "dotenv/config";
import BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

const sqlite = new BetterSqlite3(process.env.DB_FILE_NAME!);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("synchronous = NORMAL");
sqlite.pragma("busy_timeout = 5000");
sqlite.pragma("cache_size = -20000");
export const db = drizzle({ client: sqlite });
