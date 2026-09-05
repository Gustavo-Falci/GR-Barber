"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { caminhoDoPasso, lerEscolhas, type Escolhas, type Passo } from "./passos";

// O que cada passo exige de quem veio antes, e pra onde manda quando
// falta. Sem isso, abrir /agendar/horario de um link velho renderizaria
// uma tela sem data, chamando a API com undefined.
const EXIGE: Record<Passo, { falta: (e: Escolhas) => boolean; volta: Passo }> = {
  servicos: { falta: () => false, volta: "servicos" },
  data: { falta: (e) => e.servicoIds.length === 0, volta: "servicos" },
  horario: { falta: (e) => !e.data, volta: "data" },
  dados: { falta: (e) => !e.hora, volta: "horario" },
  confirmar: { falta: (e) => !e.hora, volta: "horario" },
};

// `pronto` é falso enquanto o redirecionamento não aconteceu: a tela
// não deve chamar a API nem desenhar com dado faltando.
export function usePassoDoFluxo(
  passo: Passo
): Escolhas & { slug: string; pronto: boolean } {
  const { slug } = useParams<{ slug: string }>();
  const query = useSearchParams();
  const router = useRouter();

  const escolhas = lerEscolhas(query);
  const regra = EXIGE[passo];
  const falta = regra.falta(escolhas);

  useEffect(() => {
    if (!falta) return;
    // `replace` e não `push`: o passo incompleto não merece uma entrada
    // no histórico, senão voltar cairia nele de novo.
    router.replace(caminhoDoPasso(slug, regra.volta, escolhas));
  }, [falta, slug, regra.volta, router, escolhas]);

  return { ...escolhas, slug, pronto: !falta };
}
