import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { criarApiClientFalso } from "@gr-barber/api-client";
import { ProvedorDaApi } from "../../src/api/ProvedorDaApi";
import { DadosDoCliente } from "../../src/telas/DadosDoCliente";
import { lerDadosDoCliente } from "../../src/fluxo/dadosDoCliente";
import { sessaoDoCliente } from "../../src/sessao/armazenamento";
import { navegacaoFalsa } from "../ajudantes/navegacao";

// Manhã do dia 10 — a mesma data usada em toda query deste arquivo. A
// suíte não pode depender do dia em que roda, senão passa hoje e falha
// sozinha amanhã: sem este padrão fixo, `montar()` caía no relógio real
// da máquina, e "2026-09-10" deixaria de ser "hoje ou depois" assim que
// a data virasse.
const MANHA = new Date("2026-09-10T08:00:00-03:00");

function montar(falso = criarApiClientFalso(), agora: Date = MANHA) {
  render(
    <ProvedorDaApi valor={falso}>
      <DadosDoCliente agora={agora} />
    </ProvedorDaApi>
  );
}

describe("dados do cliente", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    navegacaoFalsa.redefinir({
      query: { servicos: "s1", data: "2026-09-10", hora: "09:00" },
    });
  });

  it("formata o telefone enquanto digita", async () => {
    montar();

    await userEvent.type(screen.getByLabelText(/telefone/i), "11999998888");

    expect(screen.getByLabelText(/telefone/i)).toHaveValue("(11) 99999-8888");
  });

  it("guarda os dados e segue pra confirmação", async () => {
    montar();

    await userEvent.type(screen.getByLabelText(/nome/i), "João Silva");
    await userEvent.type(screen.getByLabelText(/telefone/i), "11999998888");
    await userEvent.click(screen.getByRole("button", { name: /continuar/i }));

    expect(lerDadosDoCliente()).toEqual({
      nome: "João Silva",
      telefone: "(11) 99999-8888",
    });
    expect(navegacaoFalsa.push).toHaveBeenCalledWith(
      "/gr-barber/agendar/confirmar?servicos=s1&data=2026-09-10&hora=09%3A00"
    );
  });

  it("recusa telefone sem DDD antes de mandar pra API", async () => {
    // A API responderia 400 pelo pattern; barrar aqui evita a ida e
    // volta e diz o que fazer.
    montar();

    await userEvent.type(screen.getByLabelText(/nome/i), "João");
    await userEvent.type(screen.getByLabelText(/telefone/i), "999998888");
    await userEvent.click(screen.getByRole("button", { name: /continuar/i }));

    expect(screen.getByText(/informe o ddd/i)).toBeInTheDocument();
    expect(navegacaoFalsa.push).not.toHaveBeenCalled();
  });

  it("aponta o nome vazio sem culpar o telefone, que está certo", async () => {
    // A falha é só do nome; a mensagem de DDD do telefone não pode
    // aparecer, senão a pessoa corrige o campo errado.
    montar();

    await userEvent.type(screen.getByLabelText(/telefone/i), "11999998888");
    await userEvent.click(screen.getByRole("button", { name: /continuar/i }));

    expect(screen.getByText(/informe seu nome/i)).toBeInTheDocument();
    expect(screen.queryByText(/informe o ddd/i)).not.toBeInTheDocument();
    expect(navegacaoFalsa.push).not.toHaveBeenCalled();
  });

  it("some com o erro do telefone assim que a pessoa volta a digitar", async () => {
    // Erro que sobrevive à correção faz o formulário parecer travado —
    // some no onChange, antes mesmo de um novo clique em Continuar.
    montar();

    await userEvent.type(screen.getByLabelText(/nome/i), "João");
    await userEvent.type(screen.getByLabelText(/telefone/i), "999998888");
    await userEvent.click(screen.getByRole("button", { name: /continuar/i }));
    expect(screen.getByText(/informe o ddd/i)).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText(/telefone/i));
    await userEvent.type(screen.getByLabelText(/telefone/i), "11999998888");

    expect(screen.queryByText(/informe o ddd/i)).not.toBeInTheDocument();
  });

  it("chega preenchido quando existe sessão daquela barbearia", async () => {
    sessaoDoCliente("gr-barber").gravar("jwt-do-cliente");
    montar();

    await waitFor(() =>
      expect(screen.getByLabelText(/nome/i)).toHaveValue("João Silva")
    );
    expect(screen.getByLabelText(/telefone/i)).toHaveValue("(11) 99999-8888");
  });

  it("volta pro passo de horário quando a URL não traz hora", async () => {
    navegacaoFalsa.redefinir({ query: { servicos: "s1", data: "2026-09-10" } });
    montar();

    await waitFor(() =>
      expect(navegacaoFalsa.replace).toHaveBeenCalledWith(
        "/gr-barber/agendar/horario?servicos=s1&data=2026-09-10"
      )
    );
  });
});
