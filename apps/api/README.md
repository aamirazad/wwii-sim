# WWII Sim API

## Getting Started

From the repository root, install the pnpm workspace dependencies:

```bash
pnpm install
```

## Development

To start the development server run:

```bash
pnpm --filter api dev
```

The API listens on http://localhost:3001/.

## Login emails

Admins can send login emails to all assigned players while a scheduled game is waiting to start. Copy `.env.example` to `.env` and configure the SMTP values, `APP_URL`, and `GAME_TIME_ZONE`. `GAME_TIME_ZONE` must be an IANA time zone such as `America/New_York` and is included in the scheduled start time shown in each email.
