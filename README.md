# WWII Sim

<img width="1500" height="500" alt="593_1x_shots_so" src="https://github.com/user-attachments/assets/16353fef-1cc8-48df-8b1c-7468204120f0" />

*Learn history by playing it. Coordinate and strategize as nations in the Second World War. Wage war, forge alliances, and have fun.*

The HASD History Club WWII Simulation is a game for students playing a country in WWII to compete against other students. With research and historical accuracy at the heart, the game teaches students about complex historical decisions and their resulting effects.

## Learn more

The best way to learn about the site is to complete the tutorial. To go <https://sim.aamirazad.com> to start!

*Demonstrating the tutorial*

https://github.com/user-attachments/assets/203e4243-b606-4aa4-95ef-16513ae0c631

*Working with troops*

https://github.com/user-attachments/assets/a1dc7788-5198-4004-917b-b18522819c37

*Game progress automatically*

https://github.com/user-attachments/assets/3e7cd425-46c2-463d-8545-fe9f5d63d3c3

*Profile card generated when you login to the site*

<img width="464" height="548" alt="image" src="https://github.com/user-attachments/assets/e8b9d937-651d-4c86-b175-66df4de83c15" />

*People using the website at my school*

<img width="800" height="597" alt="image" src="https://github.com/user-attachments/assets/1e10cdad-082c-41bd-8286-e746c774d14d" />


## Development

The project uses [pnpm](https://pnpm.io/) workspaces and runs on Node.js 24 or newer.

To run a local environment, copy `apps/api/.env.example` to `apps/api/.env` and `apps/web/env.example` to `apps/web/.env.local`, then fill in the Mailgun SMTP values. Install dependencies with `pnpm install`, run database migrations with `pnpm --filter api db:migrate`, and start the workspace with `pnpm dev`.

While a scheduled game is waiting to start, an admin can send login emails from the lobby. Each assigned player receives the scheduled start time, their country, and a personal dashboard login link. Set `APP_URL` to the deployed Vercel URL and `GAME_TIME_ZONE` to the game's IANA time zone (for example, `America/New_York`). Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` for delivery. Add the frontend URL to `CORS_ORIGIN` on the self-hosted API; multiple allowed origins can be comma-separated.

Be sure to populate the database with an admin user before you start. After, the admin can create more admins though the UI.

## License

All rights reserved. This software is not licensed for distribution, modification, or commercial use without explicit written permission from the author.
