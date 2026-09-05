"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "../api/ProvedorDaApi";
import { useRequisicao } from "../api/useRequisicao";
import { Calendario } from "../componentes/Calendario";
import { caminhoDoPasso } from "../fluxo/passos";
import { usePassoDoFluxo } from "../fluxo/usePassoDoFluxo";
import { hojeIso } from "../formato/datas";
import estilos from "./EscolhaDaData.module.css";

// `agora` é prop com padrão, do mesmo jeito que o agoraNaBarbearia da
// API recebe o instante: é o que deixa o teste escolher o dia sem fake
// timers.
export function EscolhaDaData({ agora = new Date() }: { agora?: Date }) {
  const { slug, servicoIds, remarcar, pronto } = usePassoDoFluxo("data");
  const router = useRouter();
  const api = useApi();
  const [mes, setMes] = useState(() => hojeIso(agora).slice(0, 7));

  const { dados, carregando, erro } = useRequisicao(async () => {
    if (!pronto) return {};
    const perfil = await api.publico.perfilDaBarbearia(slug);
    // O barbeiroId sai do perfil, e não da URL: é a única rota pública
    // que o entrega, e a barbearia do MVP tem um barbeiro só.
    return api.publico.disponibilidadeDoMes(slug, {
      barbeiroId: perfil.barbeiros[0].id,
      mes,
      servicoIds,
    });
  }, [slug, mes, servicoIds.join(","), pronto]);

  if (!pronto) return null;

  if (carregando) return <main className={estilos.pagina}>Carregando…</main>;

  // Sem isso, uma falha de rede desenharia o mês inteiro como
  // indisponível — uma tela enganosa, indistinguível de uma agenda
  // lotada de verdade. Diferente da tela de perfil, aqui um 404 não é
  // o caso comum: o slug já passou pelas telas de perfil e serviços
  // antes de chegar aqui, então uma mensagem genérica cobre os dois
  // casos sem inventar uma distinção que o cliente não vai notar.
  if (erro) {
    return (
      <main className={estilos.pagina}>
        <h1>Não foi possível carregar a agenda</h1>
      </main>
    );
  }

  return (
    <main className={estilos.pagina}>
      <h1>Escolha a data</h1>
      <Calendario
        mes={mes}
        dias={dados ?? {}}
        agora={agora}
        aoTrocarMes={setMes}
        aoEscolher={(data) =>
          router.push(
            caminhoDoPasso(slug, "horario", { servicoIds, data, remarcar })
          )
        }
      />
    </main>
  );
}
