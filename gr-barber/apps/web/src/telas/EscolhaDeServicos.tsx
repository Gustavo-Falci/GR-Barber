"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "../api/ProvedorDaApi";
import { useRequisicao } from "../api/useRequisicao";
import { Botao } from "../componentes/Botao";
import { formatarPreco, ItemDeServico } from "../componentes/ItemDeServico";
import { Resumo } from "../componentes/Resumo";
import { caminhoDoPasso } from "../fluxo/passos";
import { usePassoDoFluxo } from "../fluxo/usePassoDoFluxo";
import estilos from "./EscolhaDeServicos.module.css";

export function EscolhaDeServicos() {
  const { slug, servicoIds, remarcar } = usePassoDoFluxo("servicos");
  const router = useRouter();
  const api = useApi();
  const { dados, carregando } = useRequisicao(
    () => api.publico.servicos(slug),
    [slug]
  );

  // Começa do que veio na URL: voltar do passo seguinte não pode perder
  // a escolha.
  const [escolhidos, setEscolhidos] = useState<string[]>(servicoIds);

  const servicos = dados ?? [];
  const selecionados = servicos.filter((s) => escolhidos.includes(s.id));
  const duracao = selecionados.reduce((t, s) => t + s.duracaoMinutos, 0);
  const total = selecionados.reduce((t, s) => t + Number(s.preco), 0);

  function alternar(id: string) {
    setEscolhidos((atuais) =>
      atuais.includes(id) ? atuais.filter((x) => x !== id) : [...atuais, id]
    );
  }

  if (carregando) return <main className={estilos.pagina}>Carregando…</main>;

  return (
    <main className={estilos.pagina}>
      <h1>Serviços</h1>

      <div className={estilos.lista}>
        {servicos.map((servico) => (
          <ItemDeServico
            key={servico.id}
            servico={servico}
            marcado={escolhidos.includes(servico.id)}
            aoAlternar={alternar}
          />
        ))}
      </div>

      {selecionados.length > 0 ? (
        <Resumo
          itens={[
            `${selecionados.length} ${
              selecionados.length === 1 ? "serviço" : "serviços"
            }`,
            `${duracao} min`,
            formatarPreco(total.toFixed(2)),
          ]}
        />
      ) : null}

      <Botao
        disabled={escolhidos.length === 0}
        onClick={() =>
          router.push(
            caminhoDoPasso(slug, "data", { servicoIds: escolhidos, remarcar })
          )
        }
      >
        Continuar
      </Botao>
    </main>
  );
}
