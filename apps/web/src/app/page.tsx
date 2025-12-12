import packageJson from "../../package.json";
import WsPanel from "./WsPanel";

export default async function Home() {
	return (
		<main className="min-h-screen p-8 font-sans">
			<h1 className="text-3xl font-bold mb-6">WW2 Simulation Alpha</h1>
			<WsPanel webVersion={packageJson.version} />
		</main>
	);
}
