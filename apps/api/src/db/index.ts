/** biome-ignore-all lint/style/noNonNullAssertion: required env */

import "dotenv/config";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";

const sqlite = new Database(process.env.DB_FILE_NAME!);
sqlite.run("PRAGMA journal_mode = WAL");
sqlite.run("PRAGMA synchronous = NORMAL");
sqlite.run("PRAGMA busy_timeout = 5000");
sqlite.run("PRAGMA cache_size = -20000");
export const db = drizzle({ client: sqlite });
