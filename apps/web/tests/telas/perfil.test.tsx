import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { criarApiClientFalso } from "@gr-barber/api-client";
import { ProvedorDaApi } from "../../src/api/ProvedorDaApi";
import { PerfilDaBarbearia } from "../../src/telas/PerfilDaBarbearia";
import { navegacaoFalsa } from "../ajudantes/navegacao";

function montar(falso = criarApiClientFalso()) {
  render(
    <ProvedorDaApi valor={falso}>
      <PerfilDaBarbearia />
    </ProvedorDaApi>
  );
  return falso;
}

describe("perfil da barbearia", () => {
  beforeEach(() => navegacaoFalsa.redefinir());

  it("mostra nome e endereço da barbearia", async () => {
    montar();
    await waitFor(() =>
      expect(screen.getByRole("heading")).toHaveTextContent("GR Barber")
    );
    expect(screen.getByText("Rua das Tesouras, 123")).toBeInTheDocument();
  });

  it("leva pro primeiro passo do agendamento", async () => {
    montar();
    await waitFor(() => screen.getByRole("heading"));

    await userEvent.click(screen.getByRole("button", { name: /agendar/i }));

    expect(navegacaoFalsa.push).toHaveBeenCalledWith("/gr-barber/agendar");
  });

  it("dá tela própria pra barbearia que não existe", async () => {
    // Link errado no WhatsApp, slug renomeado: precisa ser uma tela, não
    // um erro cru.
    navegacaoFalsa.redefinir({ slug: "nao-existe" });
    montar();

    await waitFor(() =>
      expect(screen.getByText(/não encontramos essa barbearia/i)).toBeInTheDocument()
    );
  });
});
