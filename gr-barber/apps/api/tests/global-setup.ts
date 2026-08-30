import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Aplica a migration inicial no banco de teste, uma vez, antes de
// qualquer arquivo de teste. `migrate deploy` e não `migrate dev`:
// dev tentaria gerar uma migration nova a partir do schema.prisma, e a
// migration inicial tem SQL escrito à mão (a EXCLUDE constraint) que
// não sai do schema declarativo.
export default function setup(): void {
  const pastaDatabase = fileURLToPath(
    new URL("../../../packages/database", import.meta.url)
  );

  execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    cwd: pastaDatabase,
    env: { ...process.env },
    stdio: "inherit",
    // pnpm no Windows é um .cmd, que execFile não executa direto.
    shell: process.platform === "win32",
  });
}
