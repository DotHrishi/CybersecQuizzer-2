/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    outputFileTracingIncludes: {
      '/api/**/*': ['./prisma/dev.db', './prisma/schema.prisma'],
    },
  },
};

export default nextConfig;
