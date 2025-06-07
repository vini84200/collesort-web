import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import react from "@vitejs/plugin-react-swc";
import TanStackRouterVite from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [wasm(), topLevelAwait(),
  TanStackRouterVite({
    target: "react",
    autoCodeSplitting: true,
  }),
  react()],
  base: "/collesort-web/",
});