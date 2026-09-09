"use client";

import estilos from "./ListaDeHorarios.module.css";

export function ListaDeHorarios({
  horarios,
  selecionada,
  aoEscolher,
}: {
  horarios: string[];
  // Opcional: a tela de novo agendamento do painel chega com a hora já
  // preenchida pela URL que a agenda montou, e precisa marcar qual
  // botão é o atual. As telas que não passam nada continuam sem marca
  // nenhuma, como antes.
  selecionada?: string;
  aoEscolher: (hora: string) => void;
}) {
  return (
    <div className={estilos.lista}>
      {horarios.map((hora) => (
        <button
          key={hora}
          type="button"
          className={estilos.horario}
          aria-current={hora === selecionada ? "true" : undefined}
          onClick={() => aoEscolher(hora)}
        >
          {hora}
        </button>
      ))}
    </div>
  );
}
