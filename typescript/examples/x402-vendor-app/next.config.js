/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer, webpack }) => {
    // Fallbacks for Node.js modules not available in browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      http2: false,
      child_process: false,
      dns: false,
      stream: false,
    }

    // Handle node: protocol imports
    if (!isServer) {
      // For browser builds, alias node: imports to false or polyfills
      config.resolve.alias = {
        ...config.resolve.alias,
        'node:crypto': false,
        'crypto': false,
      }
    }

    // Ignore optional dependencies that aren't needed in browser
    if (!isServer) {
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        '@react-native-async-storage/async-storage': false,
        'pino-pretty': false,
      }
    }

    // Ignore these modules completely
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^@react-native-async-storage\/async-storage$/,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /^pino-pretty$/,
      })
    )

    // Handle node: protocol imports for browser builds
    if (!isServer) {
      // Replace node:crypto with empty module for browser builds
      // @noble/hashes will fall back to browser crypto APIs
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^node:crypto$/,
          require.resolve('./webpack-polyfills/empty.js')
        )
      )
    }

    // Ensure webpack can resolve lit submodules properly
    // lit uses package.json exports which webpack should handle automatically
    // But we need to make sure the resolve conditions are set correctly
    if (!config.resolve.conditionNames) {
      config.resolve.conditionNames = ['import', 'require', 'node', 'default']
    }

    return config
  },
}

module.exports = nextConfig

