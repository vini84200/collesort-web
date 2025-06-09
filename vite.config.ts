import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import react from "@vitejs/plugin-react-swc";
import TanStackRouterVite from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait(),
    TanStackRouterVite({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss()
  ],
  worker: {
    // Not needed with vite-plugin-top-level-await >= 1.3.0
    format: "es",
    // @ts-expect-error
    plugins: [
      wasm(),
      // topLevelAwait()
    ]
  },
  base: "/collesort-web/",
});