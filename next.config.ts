import type { NextConfig } from "next";

import "./src/env.js";

const nextConfig: NextConfig = {
	allowedDevOrigins: ["https://3000.aamira.me"]
};

export default nextConfig;
