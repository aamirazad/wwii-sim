import { treaty } from "@elysiajs/eden";
import type { App } from "./index";

const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
export const elysia = treaty<App>(url);
