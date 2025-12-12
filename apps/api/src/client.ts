import { treaty } from "@elysiajs/eden";
import type { App } from "./index";

// If you are not using Next.js v15^, you may want to set revalidate value to 0 due to default caching mechanics.

// export const elysia = treaty<TElysiaApp>('localhost:3000',{
//     fetch: {
//       next:{revalidate:0}
//     },
//   })
const url = process.env.NEXT_PUBLIC_API_URL ?? "localhost:3001";
export const elysia = treaty<App>(url);
