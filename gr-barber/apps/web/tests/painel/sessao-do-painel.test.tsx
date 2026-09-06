import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { criarApiClientFalso, ErroDaApi } from "@gr-barber/api-client";
import { ProvedorDoPainel } from "../../src/painel/ProvedorDoPainel";
import { SessaoDoPainel, usePainel } from "../../src/painel/SessaoDoPainel";
import {
  sessaoDaBarbearia,
  sessaoDoBarbeiro,
} from "../../src/sessao/armazenamento";
import { navegacaoFalsa } from "../ajudantes/navegacao";

function Espiao() {
  const { perfil, slug, sair } = usePainel();
  return (
    <div>
      <span>{perfil.nome}</span>
      <span>slug: {slug}</span>
      <button onClick={sair}>Sair</button>
    </div>
  );
}

function montar(falso = criarApiClientFalso()) {
  render(
    <ProvedorDoPainel valor={{ barbeiro: falso.barbeiro, publico: falso.publico }}>
      <SessaoDoPainel>
        <Espiao />
      </SessaoDoPainel>
    </ProvedorDoPainel>
  );
  return falso;
}

describe("sessão do painel", () => {
  beforeEach(() => {
    localStorage.clear();
    navegacaoFalsa.redefinir({ pathname: "/painel" });
  });

  it("sem token, manda pra tela de entrar e não renderiza o conteúdo", async () => {
    montar();

    await waitFor(() =>
      expect(navegacaoFalsa.replace).toHaveBeenCalledWith("/painel/entrar")
    );
    expect(screen.queryByText("Rafael")).not.toBeInTheDocument();
  });

  it("com token, carrega o perfil uma vez e o entrega às telas", async () => {
    sessaoDoBarbeiro.gravar("jwt");
    sessaoDaBarbearia.gravar("gr-barber");

    montar();

    expect(await screen.findByText("Rafael")).toBeInTheDocument();
    expect(screen.getByText("slug: gr-barber")).toBeInTheDocument();
  });

  it("401 no carregamento do perfil encerra a sessão e volta pra entrar", async () => {
    // 401 no meio da sessão é evento normal, não canto raro: o token
    // vale 7 dias e o hook da API consulta o banco a cada requisição.
    sessaoDoBarbeiro.gravar("jwt");
    sessaoDaBarbearia.gravar("gr-barber");
    const falso = criarApiClientFalso();
    falso.barbeiro.meuPerfil = async () => {
      throw new ErroDaApi(401, "nao_autenticado", "");
    };

    montar(falso);

    await waitFor(() => expect(sessaoDoBarbeiro.ler()).toBeNull());
    expect(sessaoDaBarbearia.ler()).toBeNull();
    expect(navegacaoFalsa.replace).toHaveBeenCalledWith("/painel/entrar");
  });

  it("sair limpa as duas chaves", async () => {
    sessaoDoBarbeiro.gravar("jwt");
    sessaoDaBarbearia.gravar("gr-barber");
    montar();

    await userEvent.click(await screen.findByRole("button", { name: "Sair" }));

    expect(sessaoDoBarbeiro.ler()).toBeNull();
    expect(sessaoDaBarbearia.ler()).toBeNull();
    expect(navegacaoFalsa.replace).toHaveBeenCalledWith("/painel/entrar");
  });
});
