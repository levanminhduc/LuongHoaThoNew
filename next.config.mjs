/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  skipTrailingSlashRedirect: true,
  transpilePackages: [
    "msw",
    "@mswjs/interceptors",
    "@open-draft/deferred-promise",
    "@open-draft/logger",
    "@open-draft/until",
    "headers-polyfill",
    "is-node-process",
    "outvariant",
    "rettime",
    "strict-event-emitter",
    "until-async",
  ],
  turbopack: {},
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
  },
  reactCompiler: false,
  experimental: {
    viewTransition: true,
    cpus: 2,
  },
};

export default nextConfig;
