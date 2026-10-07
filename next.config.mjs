/** @type {import('next').NextConfig} */
const isBuild =
  process.argv.includes("build") ||
  process.env.npm_lifecycle_event === "build" ||
  process.env.NODE_ENV === "production";

const nextConfig = {
  ...(isBuild ? { output: "standalone" } : {}),
  reactStrictMode: false,
  transpilePackages: ["three"],
};

export default nextConfig;
