/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    GPT4_API_KEY: process.env.GPT4_API_KEY,
  },
}

module.exports = nextConfig