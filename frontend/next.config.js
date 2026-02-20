/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `http://${process.env.BACKEND_HOST || 'backend-dev'}:${process.env.BACKEND_PORT || '52001'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
