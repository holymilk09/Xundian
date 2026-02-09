/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@xundian/shared'],
};

module.exports = nextConfig;
