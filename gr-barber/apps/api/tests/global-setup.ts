import { execSync } from "node:child_process";
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

  // execSync com uma string só, em vez de execFileSync com array de
  // argumentos: no Windows o pnpm é um .cmd, que o execFile só executa
  // com `shell: true` — e essa combinação (shell mais array) dispara o
  // aviso DEP0190 do Node em toda rodada de teste.
  execSync("pnpm exec prisma migrate deploy", {
    cwd: pastaDatabase,
    env: { ...process.env },
    stdio: "inherit",
  });
}
