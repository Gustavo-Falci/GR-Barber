import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { criarApiClientFalso, ErroDaApi } from "@gr-barber/api-client";
import { ProvedorDoPainel } from "../../../src/painel/ProvedorDoPainel";
import { EntrarNoPainel } from "../../../src/telas/painel/EntrarNoPainel";
import {
  sessaoDaBarbearia,
  sessaoDoBarbeiro,
} from "../../../src/sessao/armazenamento";
import { navegacaoFalsa } from "../../ajudantes/navegacao";

function montar(falso = criarApiClientFalso()) {
  render(
    <ProvedorDoPainel valor={{ barbeiro: falso.barbeiro, publico: falso.publico }}>
      <EntrarNoPainel />
    </ProvedorDoPainel>
  );
  return falso;
}

describe("entrar no painel", () => {
  beforeEach(() => {
    localStorage.clear();
    navegacaoFalsa.redefinir({ pathname: "/painel/entrar" });
  });

  it("entra e guarda token e slug", async () => {
    montar();

    await userEvent.type(screen.getByLabelText(/e-mail/i), "rafael@gr.com");
    await userEvent.type(screen.getByLabelText(/^senha/i), "segredo123");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(sessaoDoBarbeiro.ler()).toBe("jwt-falso-barbeiro"));
    // O slug é o que a tela de novo agendamento vai usar pra chamar a
    // disponibilidade, que é rota pública por slug.
    expect(sessaoDaBarbearia.ler()).toBe("gr-barber");
    expect(navegacaoFalsa.push).toHaveBeenCalledWith("/painel");
  });

  it("traduz nao_autenticado em email ou senha incorretos", async () => {
    const falso = criarApiClientFalso();
    falso.barbeiro.login = async () => {
      throw new ErroDaApi(401, "nao_autenticado", "");
    };
    montar(falso);

    await userEvent.type(screen.getByLabelText(/e-mail/i), "rafael@gr.com");
    await userEvent.type(screen.getByLabelText(/^senha/i), "errada12");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText(/e-mail ou senha incorretos/i)).toBeInTheDocument();
  });

  it("cria a barbearia e entra com o slug enviado", async () => {
    montar();

    await userEvent.click(screen.getByRole("button", { name: /criar barbearia/i }));
    await userEvent.type(screen.getByLabelText(/nome da barbearia/i), "Barbearia do Zé");
    await userEvent.type(screen.getByLabelText(/endereço do link/i), "barbearia-do-ze");
    await userEvent.type(screen.getByLabelText(/seu nome/i), "Zé");
    await userEvent.type(screen.getByLabelText(/e-mail/i), "ze@barbearia.com");
    await userEvent.type(screen.getByLabelText(/^senha/i), "segredo123");
    await userEvent.click(screen.getByRole("button", { name: /criar e entrar/i }));

    await waitFor(() => expect(sessaoDaBarbearia.ler()).toBe("barbearia-do-ze"));
    expect(navegacaoFalsa.push).toHaveBeenCalledWith("/painel");
  });

  it("recusa slug fora do formato antes de chamar a API", async () => {
    // A API responde 400 do pattern ^[a-z0-9-]{3,80}$; barrar aqui
    // mantém o erro no campo em vez de virar aviso genérico.
    const falso = criarApiClientFalso();
    let chamou = false;
    falso.barbeiro.signup = async () => {
      chamou = true;
      throw new ErroDaApi(400, "requisicao_invalida", "");
    };
    montar(falso);

    await userEvent.click(screen.getByRole("button", { name: /criar barbearia/i }));
    await userEvent.type(screen.getByLabelText(/nome da barbearia/i), "Barbearia do Zé");
    await userEvent.type(screen.getByLabelText(/endereço do link/i), "Zé Barbearia!");
    await userEvent.type(screen.getByLabelText(/seu nome/i), "Zé");
    await userEvent.type(screen.getByLabelText(/e-mail/i), "ze@barbearia.com");
    await userEvent.type(screen.getByLabelText(/^senha/i), "segredo123");
    await userEvent.click(screen.getByRole("button", { name: /criar e entrar/i }));

    expect(await screen.findByText(/letras minúsculas, números e hífen/i)).toBeInTheDocument();
    expect(chamou).toBe(false);
  });

  it("traduz conflito sem dizer qual dos dois campos repetiu", async () => {
    // A dívida do 409 já é conhecida; a tela não a amplia dizendo se foi
    // o e-mail ou o endereço.
    const falso = criarApiClientFalso();
    falso.barbeiro.signup = async () => {
      throw new ErroDaApi(409, "conflito", "");
    };
    montar(falso);

    await userEvent.click(screen.getByRole("button", { name: /criar barbearia/i }));
    await userEvent.type(screen.getByLabelText(/nome da barbearia/i), "Barbearia do Zé");
    await userEvent.type(screen.getByLabelText(/endereço do link/i), "barbearia-do-ze");
    await userEvent.type(screen.getByLabelText(/seu nome/i), "Zé");
    await userEvent.type(screen.getByLabelText(/e-mail/i), "ze@barbearia.com");
    await userEvent.type(screen.getByLabelText(/^senha/i), "segredo123");
    await userEvent.click(screen.getByRole("button", { name: /criar e entrar/i }));

    expect(
      await screen.findByText(/e-mail ou esse endereço já está em uso/i)
    ).toBeInTheDocument();
  });
});
