import { execSync } from "node:child_process";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Container builds have no .git in the context, so they pass the hash in instead.
function resolveCommitHash(): string {
  if (process.env.COMMIT_HASH) {
    return process.env.COMMIT_HASH;
  }
  try {
    return execSync("git rev-parse --short HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __COMMIT_HASH__: JSON.stringify(resolveCommitHash()),
  },
  server: {
    port: 5173,
  },
});
