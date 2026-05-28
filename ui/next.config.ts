import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@node-rs/jieba', 'tiktoken'],
};

export default nextConfig;
