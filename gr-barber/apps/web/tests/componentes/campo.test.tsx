import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Campo } from "../../src/componentes/Campo";

describe("Campo", () => {
  it("associa o rótulo ao input", () => {
    render(<Campo rotulo="Nome" />);
    expect(screen.getByLabelText("Nome")).toBeInTheDocument();
  });

  it("formata telefone enquanto se digita", async () => {
    // A API guarda "(11) 99999-8888" e recusa qualquer outra forma com
    // 400. Formatar no campo é o que impede o erro de chegar lá.
    render(<Campo rotulo="Telefone" formato="telefone" />);

    const input = screen.getByLabelText("Telefone");
    await userEvent.type(input, "11999998888");

    expect(input).toHaveValue("(11) 99999-8888");
  });

  it("mostra o erro e marca o input como inválido", () => {
    render(<Campo rotulo="Telefone" erro="informe o DDD" />);

    const input = screen.getByLabelText("Telefone");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("informe o DDD")).toBeInTheDocument();
  });
});
