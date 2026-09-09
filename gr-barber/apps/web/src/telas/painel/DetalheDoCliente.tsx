"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { ErroDaApi } from "@gr-barber/api-client";
import { normalizarTelefoneObrigatorio, TelefoneInvalido } from "@gr-barber/formato";
import { Aviso } from "../../componentes/Aviso";
import { Botao } from "../../componentes/Botao";
import { Campo } from "../../componentes/Campo";
import { Tabela } from "../../componentes/Tabela";
import { useRequisicao } from "../../api/useRequisicao";
import { formatarDataLonga } from "../../formato/datas";
import { rotuloDoStatus } from "../../formato/status";
import { useApiDoPainel } from "../../painel/ProvedorDoPainel";
import estilos from "./DetalheDoCliente.module.css";

export function DetalheDoCliente() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const api = useApiDoPainel();

  // A mesma chamada traz o cadastro e o histórico: ClienteComHistorico.
  const cliente = useRequisicao(() => api.barbeiro.cliente(id), [id]);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [erroTelefone, setErroTelefone] = useState<string | undefined>();
  const [aviso, setAviso] = useState<string | undefined>();
  const [salvando, setSalvando] = useState(false);

  // Sincronizado durante a renderização, e não num `useEffect`: um
  // efeito só roda depois do commit, e entre o commit e o efeito o
  // formulário já teria aparecido com os campos vazios — digitar nessa
  // janela corre contra o preenchimento e perde o que a pessoa
  // escreveu. Mesmo mecanismo do fix em ConfiguracoesDaBarbearia
  // (181514d): a trava `!cliente.dados` mais abaixo olha se os dados
  // chegaram, não se o estado local já foi sincronizado com eles — por
  // isso não fecha essa janela sozinha. Sincronizar aqui evita o commit
  // intermediário: o React descarta essa renderização e refaz com o
  // valor certo antes de pintar qualquer coisa. O `!==` contra o
  // rastreador é o que impede o loop, e também é o que faz
  // `cliente.recarregar()` (depois de salvar) sincronizar de novo — a
  // resposta fresca do GET não é `===` à anterior.
  const [clienteSincronizado, setClienteSincronizado] = useState<typeof cliente.dados>(null);
  if (cliente.dados && cliente.dados !== clienteSincronizado) {
    setClienteSincronizado(cliente.dados);
    setNome(cliente.dados.nome);
    setTelefone(cliente.dados.telefone);
    setEmail(cliente.dados.email ?? "");
  }

  if (cliente.erro) {
    return (
      <Aviso>
        {cliente.erro.codigo === "nao_encontrado"
          ? "Cliente não encontrado."
          : cliente.erro.mensagem}
      </Aviso>
    );
  }
  if (!cliente.dados) return <p>Carregando…</p>;

  async function salvar() {
    setAviso(undefined);
    setErroTelefone(undefined);

    let numero: string;
    try {
      numero = normalizarTelefoneObrigatorio(telefone);
    } catch (causa) {
      setErroTelefone(
        causa instanceof TelefoneInvalido
          ? "Informe o DDD e o número, como (11) 99999-8888"
          : "Telefone inválido"
      );
      return;
    }

    setSalvando(true);
    try {
      await api.barbeiro.atualizarCliente(id, {
        nome: nome.trim(),
        telefone: numero,
        email: email.trim() || null,
      });
      cliente.recarregar();
    } catch (causa) {
      const erro = causa as ErroDaApi;
      // Mesma cópia de CadastroDeCliente.tsx pro `conflito` de telefone:
      // um barbeiro editando um cliente não deve ver uma mensagem pior
      // do que quem está criando um do zero pro mesmo caso.
      setAviso(
        erro.codigo === "conflito"
          ? "Esse telefone já tem cadastro. Procure por ele na lista."
          : erro.mensagem || "Não foi possível salvar agora."
      );
    }
    setSalvando(false);
  }

  return (
    <div className={estilos.pagina}>
      <h1>{cliente.dados.nome}</h1>

      <Campo rotulo="Nome" valor={nome} onChange={setNome} />
      <Campo
        rotulo="Telefone"
        formato="telefone"
        valor={telefone}
        onChange={(proximo) => {
          setTelefone(proximo);
          setErroTelefone(undefined);
        }}
        erro={erroTelefone}
      />
      <Campo rotulo="E-mail (opcional)" type="email" valor={email} onChange={setEmail} />

      {aviso ? <Aviso>{aviso}</Aviso> : null}

      <Botao carregando={salvando} onClick={salvar}>
        Salvar
      </Botao>

      <h2>Histórico</h2>
      <Tabela
        cabecalho={["Data", "Horário", "Serviços", "Status"]}
        vazio="Esse cliente ainda não tem agendamento."
        aoAbrir={(agendamentoId) => router.push(`/painel/agendamentos/${agendamentoId}`)}
        linhas={cliente.dados.agendamentos.map((agendamento) => ({
          id: agendamento.id,
          celulas: [
            formatarDataLonga(agendamento.data),
            agendamento.horaInicio,
            agendamento.servicos.map((s) => s.nome).join(" + "),
            rotuloDoStatus(agendamento.status),
          ],
        }))}
      />
    </div>
  );
}
