import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import wasmPackWatchPlugin from "vite-plugin-wasm-pack-watcher";
import react from "@vitejs/plugin-react-swc";

import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import tailwindcss from "@tailwindcss/vite";


export default defineConfig({
  build: {
    watch: {
      include: ["src/**/*.ts", "src/**/*.rs", "src/**/*.tsx", "src/**/*.js"],
    },
  },
  plugins: [wasmPackWatchPlugin(), wasm(), topLevelAwait(),
  TanStackRouterVite({
    target: "react",
    autoCodeSplitting: true,
  }),
  react(),
  tailwindcss()
  ],
});