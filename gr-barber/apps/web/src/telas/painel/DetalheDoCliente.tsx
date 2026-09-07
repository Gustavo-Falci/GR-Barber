"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { ErroDaApi } from "@gr-barber/api-client";
import { normalizarTelefoneObrigatorio, TelefoneInvalido } from "@gr-barber/formato";
import { Aviso } from "../../componentes/Aviso";
import { Botao } from "../../componentes/Botao";
import { Campo } from "../../componentes/Campo";
import { Tabela } from "../../componentes/Tabela";
import { useRequisicao } from "../../api/useRequisicao";
import { formatarDataLonga } from "../../formato/datas";
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

  useEffect(() => {
    if (!cliente.dados) return;
    setNome(cliente.dados.nome);
    setTelefone(cliente.dados.telefone);
    setEmail(cliente.dados.email ?? "");
  }, [cliente.dados]);

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
      setAviso((causa as ErroDaApi).mensagem || "Não foi possível salvar agora.");
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
            agendamento.status,
          ],
        }))}
      />
    </div>
  );
}
