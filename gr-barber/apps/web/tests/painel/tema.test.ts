import { beforeEach, describe, expect, it } from "vitest";
import {
  aplicarTema,
  CHAVE_DO_TEMA,
  gravarTema,
  lerTema,
  SCRIPT_DE_TEMA,
} from "../../src/painel/tema";

describe("tema do painel", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("sem escolha gravada, lerTema devolve null", () => {
    expect(lerTema()).toBeNull();
  });

  it("grava e lê a escolha", () => {
    gravarTema("escuro");

    expect(localStorage.getItem(CHAVE_DO_TEMA)).toBe("escuro");
    expect(lerTema()).toBe("escuro");
  });

  it("ignora valor estragado no localStorage", () => {
    // Chave editada à mão ou sobrevivente de uma versão anterior não
    // pode virar data-theme="banana" no <html>.
    localStorage.setItem(CHAVE_DO_TEMA, "banana");

    expect(lerTema()).toBeNull();
  });

  it("aplicarTema escreve no <html>, não numa div", () => {
    // O body lê var(--cor-paper) do :root. Custom property redeclarada
    // numa div não chega nele, e o fundo da página ficaria do tema
    // errado em volta do conteúdo certo.
    aplicarTema("escuro");

    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("o script inline decide pelo caminho da URL", () => {
    expect(SCRIPT_DE_TEMA).toContain("/painel");
    expect(SCRIPT_DE_TEMA).toContain("data-theme");
  });
});
