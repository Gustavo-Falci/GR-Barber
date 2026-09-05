import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { criarApiClientFalso } from "@gr-barber/api-client";
import { colors } from "@gr-barber/design-tokens";

// Existe só pra provar que o setup renderiza JSX, enxerga os pacotes
// internos e tem os matchers do jest-dom. Sai na Task 10, quando os
// primitivos trouxerem testes de verdade.
describe("setup de teste do web", () => {
  it("renderiza JSX e enxerga os pacotes do monorepo", async () => {
    const falso = criarApiClientFalso();
    const perfil = await falso.publico.perfilDaBarbearia("gr-barber");

    render(<h1 style={{ color: colors.light.ink }}>{perfil.nome}</h1>);

    expect(screen.getByRole("heading")).toHaveTextContent("GR Barber");
  });
});
