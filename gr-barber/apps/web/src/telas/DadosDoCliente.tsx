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
  const [erro, setErro] = useState<string | undefined>();

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
    let normalizado: string;
    try {
      // A mesma função que a API usa. Barrar aqui evita a ida e volta
      // que voltaria 400 sem dizer o que fazer.
      normalizado = normalizarTelefone(telefone) ?? "";
    } catch (causa) {
      setErro(
        causa instanceof TelefoneInvalido
          ? "Informe o DDD e o número, como (11) 99999-8888"
          : "Telefone inválido"
      );
      return;
    }

    if (!nome.trim() || !normalizado) {
      setErro("Informe o DDD e o número, como (11) 99999-8888");
      return;
    }

    gravarDadosDoCliente({ nome: nome.trim(), telefone: normalizado });
    router.push(
      caminhoDoPasso(slug, "confirmar", { servicoIds, data, hora, remarcar })
    );
  }

  return (
    <main className={estilos.pagina}>
      <h1>Seus dados</h1>
      <Campo rotulo="Nome" valor={nome} onChange={setNome} />
      <Campo
        rotulo="Telefone (WhatsApp)"
        formato="telefone"
        valor={telefone}
        onChange={setTelefone}
        erro={erro}
      />
      <Botao onClick={continuar}>Continuar</Botao>
    </main>
  );
}
