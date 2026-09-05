"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApi } from "../api/ProvedorDaApi";
import { useRequisicao } from "../api/useRequisicao";
import { Aviso } from "../componentes/Aviso";
import { Botao } from "../componentes/Botao";
import { Cartao } from "../componentes/Cartao";
import { Chip } from "../componentes/Chip";
import { caminhoDoPasso } from "../fluxo/passos";
import { formatarDataLonga } from "../formato/datas";
import { sessaoDoCliente } from "../sessao/armazenamento";
import estilos from "./MinhaConta.module.css";

export function MinhaConta() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const api = useApi();

  const temSessao = Boolean(sessaoDoCliente(slug).ler());
  const { dados, carregando, erro, recarregar } = useRequisicao(
    async () => (temSessao ? api.cliente.meusAgendamentos() : []),
    [slug, temSessao]
  );

  // Sem token, ou com token que a API recusou: o gancho da fundação já
  // limpou o armazenamento, e aqui só falta tirar a pessoa da tela.
  useEffect(() => {
    if (!temSessao || erro?.codigo === "nao_autenticado") {
      router.replace(`/${slug}/entrar`);
    }
  }, [temSessao, erro, router, slug]);

  if (!temSessao) return null;

  if (carregando) return <main className={estilos.pagina}>Carregando…</main>;

  // Uma falha que não seja 401 não pode virar lista vazia: um
  // histórico vazio de verdade e uma requisição quebrada teriam a
  // mesma tela, e uma das duas é mentira. O caso de 401 fica de fora
  // porque a pessoa já está a caminho da tela de entrar, pelo efeito
  // acima.
  if (erro && erro.codigo !== "nao_autenticado") {
    return (
      <main className={estilos.pagina}>
        <h1>Meus agendamentos</h1>
        <Aviso>Não foi possível carregar seus agendamentos agora.</Aviso>
      </main>
    );
  }

  if (erro?.codigo === "nao_autenticado") return null;

  return (
    <main className={estilos.pagina}>
      <h1>Meus agendamentos</h1>

      {(dados ?? []).map((agendamento) => (
        <Cartao key={agendamento.id}>
          <div className={estilos.item}>
            <div className={estilos.linha}>
              <span>{formatarDataLonga(agendamento.data)}</span>
              <span>{agendamento.horaInicio}</span>
              <Chip tom={agendamento.status === "cancelado" ? "neutro" : "acento"}>
                {agendamento.status}
              </Chip>
            </div>

            {agendamento.status === "pendente" ||
            agendamento.status === "confirmado" ? (
              <div className={estilos.acoes}>
                <Botao
                  variante="contorno"
                  onClick={async () => {
                    await api.cliente.cancelar(agendamento.id);
                    recarregar();
                  }}
                >
                  Cancelar
                </Botao>
                <Botao
                  variante="fantasma"
                  onClick={() =>
                    router.push(
                      caminhoDoPasso(slug, "data", {
                        // Os mesmos serviços do agendamento: remarcar
                        // troca quando, não o quê.
                        servicoIds: agendamento.servicos.map((s) => s.servicoId),
                        remarcar: agendamento.id,
                      })
                    )
                  }
                >
                  Remarcar
                </Botao>
              </div>
            ) : null}
          </div>
        </Cartao>
      ))}
    </main>
  );
}
