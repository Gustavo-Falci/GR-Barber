import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { criarApiClientFalso } from "@gr-barber/api-client";
import { NavegacaoDoPainel } from "../../src/painel/NavegacaoDoPainel";
import { ProvedorDoPainel } from "../../src/painel/ProvedorDoPainel";
import { SessaoDoPainel } from "../../src/painel/SessaoDoPainel";
import { CHAVE_DO_TEMA } from "../../src/painel/tema";
import {
  sessaoDaBarbearia,
  sessaoDoBarbeiro,
} from "../../src/sessao/armazenamento";
import { navegacaoFalsa } from "../ajudantes/navegacao";

// jsdom não implementa matchMedia. Ver tests/painel/tema.test.ts — o mesmo
// stub, local a este arquivo porque só quem lê o sistema precisa dele.
function stubMatchMedia(prefereEscuro: boolean): void {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: prefereEscuro,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

function montar() {
  const falso = criarApiClientFalso();
  render(
    <ProvedorDoPainel valor={{ barbeiro: falso.barbeiro, publico: falso.publico }}>
      <SessaoDoPainel>
        <NavegacaoDoPainel />
      </SessaoDoPainel>
    </ProvedorDoPainel>
  );
  return falso;
}

describe("navegação do painel", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    stubMatchMedia(false);
    sessaoDoBarbeiro.gravar("jwt");
    sessaoDaBarbearia.gravar("gr-barber");
  });

  it("em /painel, marca Hoje como atual e mais nada", async () => {
    navegacaoFalsa.redefinir({ pathname: "/painel" });

    montar();

    const hoje = await screen.findByRole("link", { name: "Hoje" });
    expect(hoje).toHaveAttribute("aria-current", "page");
    // Se Hoje comparasse por startsWith em vez de igualdade exata, este
    // teste não distinguiria os dois casos — a próxima marcação é quem
    // prova que só uma rota fica marcada por vez.
    expect(screen.getByRole("link", { name: "Agenda" })).not.toHaveAttribute(
      "aria-current"
    );
  });

  it("em /painel/agenda, marca Agenda como atual e Hoje deixa de ser — a distinção que existe pra Hoje não usar startsWith", async () => {
    navegacaoFalsa.redefinir({ pathname: "/painel/agenda" });

    montar();

    const agenda = await screen.findByRole("link", { name: "Agenda" });
    expect(agenda).toHaveAttribute("aria-current", "page");
    // O caso que mata o mutante: "/painel/agenda".startsWith("/painel") é
    // verdadeiro, então um Hoje comparado por prefixo (em vez de
    // igualdade exata) ficaria marcado aqui também.
    expect(screen.getByRole("link", { name: "Hoje" })).not.toHaveAttribute(
      "aria-current"
    );
  });

  it("o botão de tema troca o rótulo, o atributo do <html> e a escolha gravada", async () => {
    navegacaoFalsa.redefinir({ pathname: "/painel" });

    montar();

    const botao = await screen.findByRole("button", { name: "Modo escuro" });

    await userEvent.click(botao);

    expect(
      screen.getByRole("button", { name: "Modo claro" })
    ).toBeInTheDocument();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem(CHAVE_DO_TEMA)).toBe("escuro");
  });
});
