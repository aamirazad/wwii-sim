import { eq } from "drizzle-orm";
import nodemailer from "nodemailer";
import { db } from "../db";
import { usersTable } from "../db/schema";

export class EmailConfigurationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "EmailConfigurationError";
	}
}

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
	if (!user || !pass) {
		throw new EmailConfigurationError(
			"Email delivery is not configured. Set SMTP_USER and SMTP_PASSWORD.",
		);
	}

	const port = Number(process.env.SMTP_PORT || 587);
	if (!Number.isInteger(port) || port <= 0) {
		throw new EmailConfigurationError("SMTP_PORT must be a valid port number.");
	}

	return nodemailer.createTransport({
		pool: true,
		host: process.env.SMTP_HOST || "smtp.mailgun.org",
		port,
		secure: port === 465,
		auth: { user, pass },
		maxConnections: 2,
		maxMessages: 50,
		connectionTimeout: 10_000,
		greetingTimeout: 10_000,
		socketTimeout: 20_000,
	});
}

function formatGameStart(startDate: Date) {
	const timeZone = process.env.GAME_TIME_ZONE || "America/New_York";

	try {
		return new Intl.DateTimeFormat("en-US", {
			dateStyle: "full",
			timeStyle: "long",
			timeZone,
		}).format(startDate);
	} catch {
		throw new EmailConfigurationError(
			`GAME_TIME_ZONE is not a valid IANA time zone: ${timeZone}`,
		);
	}
}

export async function sendGameLoginEmails({
	gameId,
	startDate,
}: {
	gameId: number;
	startDate: Date;
}) {
	const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(
		/\/$/,
		"",
	);
	const from = process.env.SMTP_FROM || process.env.SMTP_USER;
	if (!from) {
		throw new EmailConfigurationError(
			"Email delivery is not configured. Set SMTP_FROM or SMTP_USER.",
		);
	}

	const scheduledStart = formatGameStart(startDate);
	const players = await db
		.select()
		.from(usersTable)
		.where(eq(usersTable.role, "player"));
	const eligiblePlayers = players.filter(
		(player) =>
			player.country !== null &&
			player.country !== "Mods" &&
			player.email.trim().length > 0,
	);
	const transport = createTransport();

	let outcomes: PromiseSettledResult<unknown>[];
	try {
		outcomes = await Promise.allSettled(
			eligiblePlayers.map(async (player) => {
				const country = player.country;
				if (!country || country === "Mods") return;
				const loginUrl = `${appUrl}/login?id=${encodeURIComponent(player.id)}`;
				const delivery = await transport.sendMail({
					from,
					to: player.email.trim(),
					subject: `WWII Simulation login — ${country}`,
					text: `Hello ${player.name},\n\nYou are playing ${country} in WWII Simulation game ${gameId}.\n\nThe game is scheduled to start ${scheduledStart}.\n\nLog in to your dashboard using this personal link:\n${loginUrl}\n\nKeep this link private. You can use it again if you change devices.`,
					html: `<p>Hello ${htmlEscape(player.name)},</p><p>You are playing <strong>${htmlEscape(country)}</strong> in WWII Simulation game ${gameId}.</p><p>The game is scheduled to start <strong>${htmlEscape(scheduledStart)}</strong>.</p><p><a href="${htmlEscape(loginUrl)}">Log in to your dashboard</a></p><p>Keep this personal link private. You can use it again if you change devices.</p>`,
				});

				if (delivery.rejected.length > 0) {
					throw new Error(`SMTP rejected ${player.email}`);
				}
			}),
		);
	} finally {
		transport.close();
	}

	const sent = outcomes.filter(
		(outcome) => outcome.status === "fulfilled",
	).length;
	const failed = outcomes.length - sent;
	if (failed > 0)
		console.error(
			`Failed to send ${failed} of ${outcomes.length} game login emails`,
		);
	return {
		sent,
		failed,
		skipped: players.length - eligiblePlayers.length,
	};
}
