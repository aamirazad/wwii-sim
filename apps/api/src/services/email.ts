import { and, eq, isNotNull, ne } from "drizzle-orm";
import nodemailer from "nodemailer";
import { db } from "../db";
import { usersTable } from "../db/schema";

const htmlEscape = (value: string) =>
	value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");

function createTransport() {
	const user = process.env.SMTP_USER;
	const pass = process.env.SMTP_PASSWORD;
	if (!user || !pass) return null;
	return nodemailer.createTransport({
		pool: true,
		host: process.env.SMTP_HOST || "smtp.mailgun.org",
		port: Number(process.env.SMTP_PORT || 587),
		secure: Number(process.env.SMTP_PORT || 587) === 465,
		auth: { user, pass },
		maxConnections: 2,
		maxMessages: 50,
		connectionTimeout: 10_000,
		greetingTimeout: 10_000,
		socketTimeout: 20_000,
	});
}

export async function sendGameInvitations(gameId: number) {
	const transport = createTransport();
	if (!transport) {
		console.warn("SMTP is not configured; game invitations were not sent");
		return { sent: 0, failed: 0 };
	}
	const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(
		/\/$/,
		"",
	);
	const from = process.env.SMTP_FROM || process.env.SMTP_USER || "WWII Sim";
	const players = await db
		.select()
		.from(usersTable)
		.where(
			and(
				eq(usersTable.role, "player"),
				isNotNull(usersTable.country),
				ne(usersTable.country, "Mods"),
			),
		);

	const outcomes = await Promise.allSettled(
		players.map((player) => {
			const country = player.country ?? "your assigned country";
			const loginUrl = `${appUrl}/login?id=${encodeURIComponent(player.id)}`;
			return transport.sendMail({
				from,
				to: player.email,
				subject: `Your WWII Simulation link — ${country}`,
				text: `Hello ${player.name},\n\nYou have been assigned to ${country} for WWII Simulation game ${gameId}. Use this personal link to enter the game:\n\n${loginUrl}\n\nKeep this link private. You can use it again if you change devices.`,
				html: `<p>Hello ${htmlEscape(player.name)},</p><p>You have been assigned to <strong>${htmlEscape(country)}</strong> for WWII Simulation game ${gameId}.</p><p><a href="${loginUrl}">Enter the simulation</a></p><p>Keep this personal link private. You can use it again if you change devices.</p>`,
			});
		}),
	);
	transport.close();
	const sent = outcomes.filter(
		(outcome) => outcome.status === "fulfilled",
	).length;
	const failed = outcomes.length - sent;
	if (failed > 0)
		console.error(
			`Failed to send ${failed} of ${outcomes.length} game invitations`,
		);
	return { sent, failed };
}

export function queueGameInvitations(gameId: number) {
	void sendGameInvitations(gameId).catch((error) => {
		console.error("Failed to send game invitations", error);
	});
}
