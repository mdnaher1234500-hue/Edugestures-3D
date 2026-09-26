/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@edugesture/shared-types'],
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
