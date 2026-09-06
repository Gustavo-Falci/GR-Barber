"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { ErroDaApi } from "@gr-barber/api-client";
import type { PerfilBarbeiro } from "@gr-barber/types";
import {
  encerrarSessaoDoBarbeiro,
  sessaoDaBarbearia,
  sessaoDoBarbeiro,
} from "../sessao/armazenamento";
import { useApiDoPainel } from "./ProvedorDoPainel";

interface Painel {
  perfil: PerfilBarbeiro;
  slug: string;
  sair: () => void;
}

const Contexto = createContext<Painel | null>(null);

// A guarda vive aqui e não em cada tela: guarda por repetição depende de
// ninguém esquecer o hook, e quem esquecesse publicaria a tela sem
// sessão em silêncio. É o mesmo motivo de o app.ts da API usar escopo
// com onRequest em vez de pendurar o hook rota a rota.
export function SessaoDoPainel({ children }: { children: ReactNode }) {
  const router = useRouter();
  const api = useApiDoPainel();
  const [perfil, setPerfil] = useState<PerfilBarbeiro | null>(null);

  const sair = useCallback(() => {
    encerrarSessaoDoBarbeiro();
    router.replace("/painel/entrar");
  }, [router]);

  useEffect(() => {
    if (!sessaoDoBarbeiro.ler()) {
      router.replace("/painel/entrar");
      return;
    }

    let vivo = true;
    api.barbeiro
      .meuPerfil()
      .then((resposta) => {
        if (vivo) setPerfil(resposta);
      })
      .catch((causa: unknown) => {
        if (!vivo) return;
        // Qualquer falha ao provar quem é o chamador termina do mesmo
        // jeito: sem perfil não há painel. O 401 é o caso comum — o
        // token vale 7 dias e o hook da API consulta o banco a cada
        // requisição, então desativar um barbeiro invalida na hora.
        if (causa instanceof ErroDaApi) sair();
        else sair();
      });

    return () => {
      vivo = false;
    };
  }, [api, router, sair]);

  // Nada renderiza antes do perfil: uma tela que aparecesse e sumisse
  // seria pior do que uma que demora.
  if (!perfil) return null;

  return (
    <Contexto.Provider
      value={{ perfil, slug: sessaoDaBarbearia.ler() ?? "", sair }}
    >
      {children}
    </Contexto.Provider>
  );
}

export function usePainel(): Painel {
  const painel = useContext(Contexto);
  if (!painel) {
    throw new Error("usePainel precisa estar dentro de um SessaoDoPainel");
  }
  return painel;
}
