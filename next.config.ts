import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Stop `next dev` from rewriting AGENTS.md with its own agent rules block.
  agentRules: false,
};

export default nextConfig;
