import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const apiTarget = process.env.VIRTUALSCREEN_API_TARGET ?? "http://127.0.0.1:8000";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }
          if (id.includes("react") || id.includes("react-dom")) {
            return "vendor-react";
          }
          if (id.includes("katex")) {
            return "vendor-katex";
          }
          if (
            id.includes("@codemirror/lang-markdown") ||
            id.includes("@codemirror/lang-python")
          ) {
            return "vendor-editor-lang";
          }
          if (id.includes("@uiw/react-codemirror")) {
            return "vendor-editor-react";
          }
          if (id.includes("@lezer")) {
            return "vendor-editor-parser";
          }
          if (
            id.includes("@codemirror/view") ||
            id.includes("@codemirror/state") ||
            id.includes("@codemirror/language")
          ) {
            return "vendor-editor-core";
          }
          if (id.includes("@codemirror") || id.includes("node_modules/codemirror")) {
            return "vendor-editor-extra";
          }
          if (
            id.includes("markdown-it") ||
            id.includes("dompurify") ||
            id.includes("entities") ||
            id.includes("linkify-it") ||
            id.includes("mdurl") ||
            id.includes("uc.micro")
          ) {
            return "vendor-rendering";
          }
          return undefined;
        }
      }
    }
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": apiTarget,
      "/ws": {
        target: apiTarget,
        ws: true
      }
    }
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"]
  }
});
