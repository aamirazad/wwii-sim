/** @type {import('next').NextConfig} */
const nextConfig = {
	allowedDevOrigins: ["3000.aamirazad.com"],
	env: {
		NEXT_PUBLIC_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
	},
};

export default nextConfig;
