/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['sequelize', 'mysql2', 'bcryptjs'],

  // Suppress known harmless warnings
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

module.exports = nextConfig;