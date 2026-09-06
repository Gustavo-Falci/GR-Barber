import { vi } from "vitest";

// As telas leem a URL pelos hooks do Next, que não existem fora do
// roteador. Este módulo guarda o estado que o mock devolve, e o
// setup.ts é quem faz o vi.mock — o mock precisa ser içado pro topo do
// módulo, e um helper importado não seria içado junto.
export const navegacaoFalsa = {
  slug: "gr-barber",
  query: new URLSearchParams(),
  push: vi.fn(),
  replace: vi.fn(),
  redefinir(entrada: { slug?: string; query?: Record<string, string> } = {}) {
    this.slug = entrada.slug ?? "gr-barber";
    this.query = new URLSearchParams(entrada.query ?? {});
    this.push.mockClear();
    this.replace.mockClear();
  },
};
