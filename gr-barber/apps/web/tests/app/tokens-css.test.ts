import { describe, expect, it } from "vitest";
import { cssDeTokens } from "../../app/tokens-css";

describe("css de tokens", () => {
  it("tem o bloco da escolha manual por escuro", () => {
    expect(cssDeTokens).toContain('[data-theme="dark"]');
  });

  it("a media query cede para quem escolheu claro", () => {
    // Sem a guarda, um barbeiro que escolheu claro continua escurecendo
    // num sistema escuro: o @media venceria.
    expect(cssDeTokens).toContain(':root:not([data-theme="light"])');
  });
});
