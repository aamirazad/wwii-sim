/** @type {import('next').NextConfig} */
const nextConfig = {
	allowedDevOrigins: ["3000.aamirazad.com"],
	experimental: {
		viewTransition: true,
	},
	env: {
		NEXT_PUBLIC_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
	},
};

export default nextConfig;
