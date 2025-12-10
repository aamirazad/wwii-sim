import { elysia } from "@api/src/client";

export default async function Home() {
	const data = await elysia.get();

	return <div className="">Hello there from next. {data.data}</div>;
}
