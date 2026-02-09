/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true, // Required for static export
  },
  basePath: process.env.NODE_ENV === 'production' ? '/wow-dhs-visualizer' : '',
  assetPrefix:
    process.env.NODE_ENV === 'production' ? '/wow-dhs-visualizer' : '',
};

export default nextConfig;
