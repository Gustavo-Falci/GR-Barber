"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ErroDaApi } from "@gr-barber/api-client";
import { normalizarTelefoneObrigatorio, TelefoneInvalido } from "@gr-barber/formato";
import { Aviso } from "../../componentes/Aviso";
import { Botao } from "../../componentes/Botao";
import { Campo } from "../../componentes/Campo";
import { useApiDoPainel } from "../../painel/ProvedorDoPainel";
import estilos from "./CadastroDeCliente.module.css";

export function CadastroDeCliente() {
  const router = useRouter();
  const api = useApiDoPainel();

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [erroTelefone, setErroTelefone] = useState<string | undefined>();
  const [aviso, setAviso] = useState<string | undefined>();
  const [salvando, setSalvando] = useState(false);

  async function cadastrar() {
    setAviso(undefined);
    setErroTelefone(undefined);

    let numero: string;
    try {
      // A mesma função que a API usa pra guardar. Barrar aqui evita a
      // ida e volta que voltaria 400 do pattern sem dizer o que fazer.
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
      const criado = await api.barbeiro.criarCliente({
        nome: nome.trim(),
        telefone: numero,
        email: email.trim() || null,
      });
      router.push(`/painel/clientes/${criado.id}`);
    } catch (causa) {
      const erro = causa as ErroDaApi;
      // Telefone repetido é o caso comum, não o raro: o cadastro pode
      // ter nascido do upsert do agendamento público.
      setAviso(
        erro.codigo === "conflito"
          ? "Esse telefone já tem cadastro. Procure por ele na lista."
          : erro.mensagem || "Não foi possível cadastrar agora."
      );
    }
    setSalvando(false);
  }

  return (
    <div className={estilos.pagina}>
      <h1>Novo cliente</h1>

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

      <Botao carregando={salvando} onClick={cadastrar}>
        Cadastrar
      </Botao>
    </div>
  );
}
