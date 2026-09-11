import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

// `next/font/local` e `next/font/google` só existem de verdade dentro do
// build do Next — fora dele os módulos não exportam função nenhuma e o
// `app/fontes.ts` explode na importação. Os dublês devolvem só o
// `.variable`, que é tudo que o layout usa das fontes.
vi.mock("next/font/local", () => ({
  default: () => ({ variable: "fonte-display" }),
}));

vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "fonte-corpo" }),
}));

import RootLayout from "../../app/layout";

// Os tipos do React 19 deixam `props` como `unknown` num ReactElement
// sem parâmetro. Aqui só se lê chave solta, então Record basta.
type ElementoSolto = ReactElement<Record<string, unknown>>;

// O layout raiz é componente de servidor sem async, então dá pra chamar
// como função e inspecionar o elemento que ele devolve. É o único jeito
// de ver `suppressHydrationWarning`: a prop é só do React, nunca vira
// atributo no DOM nem sai no renderToString — um teste que renderize e
// olhe o HTML passa exista ela ou não.
function htmlDoLayout(): ElementoSolto {
  return RootLayout({ children: null }) as ElementoSolto;
}

describe("layout raiz", () => {
  it("silencia o aviso de hidratação no <html>", () => {
    // O SCRIPT_DE_TEMA roda no <head> antes da primeira pintura e
    // escreve data-theme no <html>. O HTML do servidor não tem esse
    // atributo — ele nasce no navegador, instantes antes de o React
    // hidratar. Sem a prop, toda rota abre o console com "A tree
    // hydrated but some attributes of the server rendered HTML didn't
    // match the client properties".
    //
    // `toBe(true)` e não `not.toBe(false)`: com a prop removida a
    // leitura é undefined, e undefined !== false deixaria passar.
    expect(htmlDoLayout().props.suppressHydrationWarning).toBe(true);
  });

  it("mantém o script de tema antes do estilo dos tokens", () => {
    // A ordem importa: o atributo precisa estar no <html> antes de o
    // CSS que o lê ser aplicado, senão pisca o tema errado.
    const filhos = htmlDoLayout().props.children as ElementoSolto[];
    const head = filhos[0];
    const dentroDoHead = head.props.children as ElementoSolto[];

    expect(dentroDoHead[0].type).toBe("script");
    expect(dentroDoHead[1].type).toBe("style");
  });
});
