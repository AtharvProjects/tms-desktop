import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import electron from "vite-plugin-electron"
import renderer from "vite-plugin-electron-renderer"

// Native/binary modules that must NOT be bundled by Vite/Rollup
const EXTERNALS = [
  '@prisma/client',
  'prisma',
  '.prisma',
  'electron',
  'whatsapp-web.js',
  'qrcode',
  'puppeteer',
  'puppeteer-core',
  'better-sqlite3',
  'fs',
  'path',
  'os',
  'crypto',
  'child_process',
  'net',
  'tls',
  'dns',
  'http',
  'https',
  'stream',
  'zlib',
  'url',
]

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: "electron/main.ts",
        vite: {
          build: {
            sourcemap: false,
            rollupOptions: {
              external: EXTERNALS,
            }
          }
        }
      },
      {
        entry: "electron/preload.ts",
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            sourcemap: false,
            lib: {
              entry: 'electron/preload.ts',
              formats: ['cjs'],
              fileName: () => 'preload.cjs'
            },
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ['react-is'],
  },
  build: {
    commonjsOptions: {
      include: [/react-is/, /node_modules/],
    },
    chunkSizeWarningLimit: 2000,
  },
})
