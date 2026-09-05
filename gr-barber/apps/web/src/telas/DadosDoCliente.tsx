"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizarTelefone, TelefoneInvalido } from "@gr-barber/formato";
import { useApi } from "../api/ProvedorDaApi";
import { Botao } from "../componentes/Botao";
import { Campo } from "../componentes/Campo";
import { caminhoDoPasso } from "../fluxo/passos";
import { gravarDadosDoCliente, lerDadosDoCliente } from "../fluxo/dadosDoCliente";
import { usePassoDoFluxo } from "../fluxo/usePassoDoFluxo";
import { sessaoDoCliente } from "../sessao/armazenamento";
import estilos from "./DadosDoCliente.module.css";

export function DadosDoCliente() {
  const { slug, servicoIds, data, hora, remarcar, pronto } =
    usePassoDoFluxo("dados");
  const router = useRouter();
  const api = useApi();

  const guardados = lerDadosDoCliente();
  const [nome, setNome] = useState(guardados?.nome ?? "");
  const [telefone, setTelefone] = useState(guardados?.telefone ?? "");
  // Um erro por campo, não um só: a mensagem precisa apontar o campo
  // que está errado, senão nome vazio mostra a instrução de DDD do
  // telefone, que está correto.
  const [erroNome, setErroNome] = useState<string | undefined>();
  const [erroTelefone, setErroTelefone] = useState<string | undefined>();

  // Se a pessoa já tem conta nesta barbearia, o cadastro é a fonte —
  // digitar de novo o que a API já sabe é trabalho à toa.
  useEffect(() => {
    if (!sessaoDoCliente(slug).ler()) return;

    let vivo = true;
    api.cliente
      .meuCadastro()
      .then((cliente) => {
        if (!vivo) return;
        setNome((atual) => atual || cliente.nome);
        setTelefone((atual) => atual || cliente.telefone);
      })
      // Token vencido cai aqui; o gancho da fundação já limpou a sessão,
      // e a tela segue como se não houvesse conta.
      .catch(() => undefined);

    return () => {
      vivo = false;
    };
  }, [api, slug]);

  if (!pronto) return null;

  function continuar() {
    const nomeAparado = nome.trim();

    let normalizado: string | null = null;
    let proximoErroTelefone: string | undefined;
    try {
      // A mesma função que a API usa. Barrar aqui evita a ida e volta
      // que voltaria 400 sem dizer o que fazer.
      normalizado = normalizarTelefone(telefone);
    } catch (causa) {
      proximoErroTelefone =
        causa instanceof TelefoneInvalido
          ? "Informe o DDD e o número, como (11) 99999-8888"
          : "Telefone inválido";
    }
    if (!proximoErroTelefone && !normalizado) {
      proximoErroTelefone = "Informe o DDD e o número, como (11) 99999-8888";
    }

    const proximoErroNome = nomeAparado ? undefined : "Informe seu nome";

    setErroNome(proximoErroNome);
    setErroTelefone(proximoErroTelefone);

    if (proximoErroNome || proximoErroTelefone) return;

    gravarDadosDoCliente({ nome: nomeAparado, telefone: normalizado as string });
    router.push(
      caminhoDoPasso(slug, "confirmar", { servicoIds, data, hora, remarcar })
    );
  }

  return (
    <main className={estilos.pagina}>
      <h1>Seus dados</h1>
      <Campo
        rotulo="Nome"
        valor={nome}
        // Mensagem que sobrevive à correção faz o formulário parecer
        // travado: limpar no próprio onChange já tira o erro assim que
        // a pessoa volta a digitar, antes mesmo do próximo Continuar.
        onChange={(proximo) => {
          setNome(proximo);
          setErroNome(undefined);
        }}
        erro={erroNome}
      />
      <Campo
        rotulo="Telefone (WhatsApp)"
        formato="telefone"
        valor={telefone}
        onChange={(proximo) => {
          setTelefone(proximo);
          setErroTelefone(undefined);
        }}
        erro={erroTelefone}
      />
      <Botao onClick={continuar}>Continuar</Botao>
    </main>
  );
}
