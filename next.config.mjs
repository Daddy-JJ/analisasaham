/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow processing files and long API timeouts for financial queries
  experimental: {
    serverComponentsExternalPackages: ['yahoo-finance2'],
  },
};

export default nextConfig;
