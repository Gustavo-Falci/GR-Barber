"use client";

import estilos from "./ListaDeHorarios.module.css";

export function ListaDeHorarios({
  horarios,
  aoEscolher,
}: {
  horarios: string[];
  aoEscolher: (hora: string) => void;
}) {
  return (
    <div className={estilos.lista}>
      {horarios.map((hora) => (
        <button
          key={hora}
          className={estilos.horario}
          onClick={() => aoEscolher(hora)}
        >
          {hora}
        </button>
      ))}
    </div>
  );
}
