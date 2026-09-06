"use client";

import { useParams, useRouter } from "next/navigation";
import { useApi } from "../api/ProvedorDaApi";
import { useRequisicao } from "../api/useRequisicao";
import { Botao } from "../componentes/Botao";
import { caminhoDoPasso } from "../fluxo/passos";
import estilos from "./PerfilDaBarbearia.module.css";

export function PerfilDaBarbearia() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const api = useApi();
  const { dados, carregando, erro } = useRequisicao(
    () => api.publico.perfilDaBarbearia(slug),
    [slug]
  );

  if (carregando) return <main className={estilos.pagina}>Carregando…</main>;

  // 404 é o caso comum aqui, não excepcional: o link circula por
  // WhatsApp e o slug pode ter mudado.
  if (erro) {
    return (
      <main className={estilos.pagina}>
        <h1>
          {erro.codigo === "nao_encontrado"
            ? "Não encontramos essa barbearia"
            : "Não foi possível abrir esta página"}
        </h1>
      </main>
    );
  }

  return (
    <main className={estilos.pagina}>
      <div className={estilos.faixa} />
      <div>
        <h1>{dados?.nome}</h1>
        {dados?.endereco ? (
          <p className={estilos.endereco}>{dados.endereco}</p>
        ) : null}
      </div>
      <Botao
        onClick={() =>
          router.push(caminhoDoPasso(slug, "servicos", { servicoIds: [] }))
        }
      >
        Agendar agora
      </Botao>
    </main>
  );
}
