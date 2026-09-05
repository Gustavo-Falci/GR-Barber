import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// O auto-cleanup do Testing Library se pendura num afterEach global, e
// esta suíte roda sem `globals: true` — os imports são explícitos, como
// nos outros pacotes. Sem esta linha o DOM de um teste sobrevive no
// seguinte, e a segunda busca por role acha dois botões.
afterEach(cleanup);
