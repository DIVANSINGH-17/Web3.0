import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const carbonKey = env.VITE_CARBON_API_KEY
  const carbonHeader = env.VITE_CARBON_AUTH_HEADER || 'auth-token'
  const iwasteHeader = env.VITE_IWASTE_AUTH_HEADER
  const iwasteKey = env.VITE_IWASTE_API_KEY

  // Build carbon headers for ElectricityMaps API
  const carbonHeaders = carbonKey
    ? { [carbonHeader]: carbonKey, 'auth-token': carbonKey }
    : {}

  return {
    plugins: [react()],
    server: {
      proxy: {
        // ElectricityMaps API proxy (more reliable than carbonfootprint.com)
        '/cf': {
          target: 'https://api.electricitymap.org',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/cf/, ''),
          headers: carbonHeaders,
        },
        // EPA iWASTE API proxy
        '/iwaste': {
          target: 'https://iwaste.epa.gov',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/iwaste/, ''),
          headers: iwasteHeader && iwasteKey ? { [iwasteHeader]: iwasteKey } : {},
        },
      },
    },
  }
})
