"use client";

import { diasDoMes, ehPassado } from "../formato/datas";
import estilos from "./Calendario.module.css";

// `dias` é o mapa que /disponibilidade/mes devolve: data -> tem vaga.
// O passado não vem de lá — a rota não sabe que dia é hoje, e é esta
// tela que decide.
export function Calendario({
  mes,
  dias,
  agora,
  aoEscolher,
  aoTrocarMes,
}: {
  mes: string;
  dias: Record<string, boolean>;
  agora: Date;
  aoEscolher: (data: string) => void;
  aoTrocarMes: (mes: string) => void;
}) {
  return (
    <div className={estilos.calendario}>
      <div className={estilos.cabecalho}>
        <button onClick={() => aoTrocarMes(mesVizinho(mes, -1))} aria-label="Mês anterior">
          ‹
        </button>
        <span>{nomeDoMes(mes)}</span>
        <button onClick={() => aoTrocarMes(mesVizinho(mes, 1))} aria-label="Próximo mês">
          ›
        </button>
      </div>

      <div className={estilos.grade}>
        {diasDoMes(mes).map((data, indice) =>
          data === null ? (
            <span key={`vazio-${indice}`} className={estilos.vazio} />
          ) : (
            <button
              key={data}
              className={estilos.dia}
              disabled={ehPassado(data, agora) || !dias[data]}
              onClick={() => aoEscolher(data)}
            >
              {Number(data.slice(-2))}
            </button>
          )
        )}
      </div>
    </div>
  );
}

function mesVizinho(mes: string, passo: number): string {
  const [ano, numero] = mes.split("-").map(Number);
  const referencia = new Date(Date.UTC(ano, numero - 1 + passo, 1));
  return `${referencia.getUTCFullYear()}-${String(
    referencia.getUTCMonth() + 1
  ).padStart(2, "0")}`;
}

function nomeDoMes(mes: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${mes}-01T00:00:00Z`));
}
