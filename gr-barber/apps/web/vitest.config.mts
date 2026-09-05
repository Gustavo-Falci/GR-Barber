import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    // Os pacotes internos publicam TypeScript cru (main aponta pro
    // src/index.ts). Sem isto o Vitest os trataria como JS pronto.
    server: { deps: { inline: [/@gr-barber\//] } },
  },
});
