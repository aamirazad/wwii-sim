import { treaty } from "@elysiajs/eden";
import type { App } from "./index";

const url = "localhost:3001";
export const elysia = treaty<App>(url);
