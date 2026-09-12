"use client";

import estilos from "./SeletorDeVista.module.css";

export type Vista = "dia" | "semana" | "mes";

const VISTAS: { valor: Vista; rotulo: string }[] = [
  { valor: "dia", rotulo: "Dia" },
  { valor: "semana", rotulo: "Semana" },
  { valor: "mes", rotulo: "Mês" },
];

export function SeletorDeVista({
  vista,
  aoTrocarVista,
  aoAndar,
  aoVoltarAHoje,
}: {
  vista: Vista;
  aoTrocarVista: (vista: Vista) => void;
  // Passos na unidade da vista corrente: um dia, uma semana ou um mês.
  aoAndar: (passos: number) => void;
  aoVoltarAHoje: () => void;
}) {
  return (
    <div className={estilos.barra}>
      <div className={estilos.vistas} role="group" aria-label="Vista da agenda">
        {VISTAS.map((opcao) => (
          <button
            key={opcao.valor}
            type="button"
            className={estilos.vista}
            // aria-pressed e não aria-current: são botões que alternam um
            // modo, não links para outro lugar.
            aria-pressed={opcao.valor === vista}
            onClick={() => aoTrocarVista(opcao.valor)}
          >
            {opcao.rotulo}
          </button>
        ))}
      </div>

      <div className={estilos.navegacao}>
        <button
          type="button"
          className={estilos.passo}
          aria-label="Período anterior"
          onClick={() => aoAndar(-1)}
        >
          ‹
        </button>
        <button type="button" className={estilos.hoje} onClick={aoVoltarAHoje}>
          Hoje
        </button>
        <button
          type="button"
          className={estilos.passo}
          aria-label="Próximo período"
          onClick={() => aoAndar(1)}
        >
          ›
        </button>
      </div>
    </div>
  );
}
