import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Production optimizations
  output: 'standalone',
  
  // Compression
  compress: true,
  
  // Security headers
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Frame-Options',
          value: 'SAMEORIGIN'
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff'
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block'
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin'
        }
      ]
    }
  ],
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;"
  },
  
  // Experimental features for performance
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
    externalDir: true,
    optimizePackageImports: ['@heroicons/react', 'lucide-react'],
    serverMinification: true,
    optimizeCss: true
  },
  
  // Environment variables validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Webpack configuration for production
  webpack: (config, { buildId: _buildId, dev, isServer, defaultLoaders: _defaultLoaders, webpack: _webpack }) => {
    // Production optimizations
    if (!dev && !isServer) {
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
          enforce: true
        },
        supabase: {
          test: /[\\/]node_modules[\\/]@supabase[\\/]/,
          name: 'supabase',
          chunks: 'all',
          priority: 20
        },
        ui: {
          test: /[\\/]node_modules[\\/](@radix-ui|@heroicons|lucide-react)[\\/]/,
          name: 'ui',
          chunks: 'all',
          priority: 15
        }
      }
      
      // Enable tree shaking for production
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
    }
    
    // Bundle analyzer (only in development)
    if (dev && process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(new BundleAnalyzerPlugin({
        analyzerMode: 'server',
        analyzerPort: 8888,
        openAnalyzer: true
      }));
    }
    
    return config
  },
  
  // Redirects for SEO and user experience
  redirects: async () => [
    {
      source: '/admin',
      destination: '/admin/users',
      permanent: false
    }
  ],
  
  // Rewrites for API versioning
  rewrites: async () => [
    {
      source: '/api/v1/:path*',
      destination: '/api/:path*'
    }
  ]
};

export default nextConfig;
