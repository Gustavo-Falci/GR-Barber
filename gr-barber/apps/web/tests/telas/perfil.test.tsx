import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { criarApiClientFalso, ErroDaApi } from "@gr-barber/api-client";
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

  it("distingue barbearia inexistente de API indisponível", async () => {
    // Uma barbearia inexistente (404) é tráfego comum do WhatsApp.
    // Uma API indisponível (500) precisa ser clara: não é "barbearia não
    // encontrada", porque o cliente precisaria de ações diferentes (tentar
    // de novo mais tarde vs. reportar link quebrado).
    const falso = criarApiClientFalso();
    falso.publico.perfilDaBarbearia = async () => {
      throw new ErroDaApi(500, "erro_interno", "");
    };
    montar(falso);

    await waitFor(() =>
      expect(screen.getByText(/não foi possível abrir esta página/i)).toBeInTheDocument()
    );
  });
});
