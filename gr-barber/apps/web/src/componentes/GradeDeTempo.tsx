"use client";

import type { CSSProperties } from "react";
// O tipo e o componente têm o mesmo nome de propósito — um descreve o
// que o outro desenha. O alias existe só para os dois conviverem aqui.
import type { GradeDeTempo as Grade } from "../painel/grade";
import { MINUTOS_POR_LINHA } from "../painel/grade";
import { formatarDataLonga } from "../formato/datas";
import estilos from "./GradeDeTempo.module.css";

// Rótulos de hora cheia no eixo da esquerda.
function horasCheias(grade: Grade): { rotulo: string; linha: number }[] {
  const horas: { rotulo: string; linha: number }[] = [];
  const primeira = Math.ceil(grade.minutoInicial / 60) * 60;

  for (let minuto = primeira; minuto < grade.minutoFinal; minuto += 60) {
    horas.push({
      rotulo: `${String(minuto / 60).padStart(2, "0")}:00`,
      linha: (minuto - grade.minutoInicial) / MINUTOS_POR_LINHA + 1,
    });
  }

  return horas;
}

export function GradeDeTempo({
  grade,
  aoAbrir,
  aoCriar,
  aoAbrirDia,
}: {
  grade: Grade;
  aoAbrir: (id: string) => void;
  // O dia vai junto da hora: na vista de semana a hora sozinha não diz
  // qual coluna foi clicada.
  aoCriar: (data: string, hora: string) => void;
  // Só a vista de semana passa: é o cabeçalho clicável de cada coluna.
  aoAbrirDia?: (data: string) => void;
}) {
  if (grade.totalLinhas === 0) {
    return <p className={estilos.vazio}>Fechado neste dia.</p>;
  }

  const estiloDaGrade = {
    "--total-linhas": grade.totalLinhas,
  } as CSSProperties;

  return (
    <div className={estilos.quadro} style={estiloDaGrade}>
      <div className={estilos.eixo}>
        {horasCheias(grade).map((hora) => (
          <span
            key={hora.rotulo}
            className={estilos.hora}
            style={{ "--linha": hora.linha } as CSSProperties}
          >
            {hora.rotulo}
          </span>
        ))}
      </div>

      {grade.colunas.map((coluna) => (
        <div key={coluna.data} className={estilos.coluna}>
          {aoAbrirDia ? (
            <button
              type="button"
              className={estilos.cabecalhoDoDia}
              // A data por extenso é o nome acessível: "8" sozinho não
              // distingue uma coluna da outra numa lista de sete.
              aria-label={formatarDataLonga(coluna.data)}
              onClick={() => aoAbrirDia(coluna.data)}
            >
              {Number(coluna.data.slice(8))}
            </button>
          ) : null}

          {coluna.fechado ? (
            <p className={estilos.fechado}>Fechado neste dia.</p>
          ) : null}

          {coluna.livres.map((faixa) =>
            // Faixa passada não vira botão: oferecer 09:00 às 10h é
            // ruído. A linha continua ocupada pra grade não ganhar
            // buraco.
            faixa.passada ? (
              <span
                key={faixa.hora}
                className={estilos.passada}
                style={
                  { "--linha": faixa.linha, "--linhas": faixa.linhas } as CSSProperties
                }
              />
            ) : (
              <button
                key={faixa.hora}
                type="button"
                className={estilos.livre}
                style={
                  { "--linha": faixa.linha, "--linhas": faixa.linhas } as CSSProperties
                }
                onClick={() => aoCriar(coluna.data, faixa.hora)}
              >
                {faixa.hora}
              </button>
            )
          )}

          {coluna.eventos.map((evento) => (
            <button
              key={evento.agendamento.id}
              type="button"
              className={estilos.evento}
              style={
                {
                  "--linha": evento.linha,
                  "--linhas": evento.linhas,
                  "--pista": evento.pista,
                  "--pistas": evento.pistas,
                } as CSSProperties
              }
              onClick={() => aoAbrir(evento.agendamento.id)}
            >
              {/* O nome completo entra no texto, e quem encurta é o CSS:
                  na coluna larga da vista de dia ele cabe inteiro, na
                  coluna estreita da semana trunca com reticências.
                  Cortar no JavaScript esconderia o sobrenome também na
                  vista de dia, onde há espaço de sobra. */}
              <strong className={estilos.horaDoEvento}>
                {evento.agendamento.horaInicio}
              </strong>{" "}
              {evento.agendamento.cliente.nome}
              <span className={estilos.servicos}>
                {evento.agendamento.servicos.map((s) => s.nome).join(" + ")}
              </span>
            </button>
          ))}

          {grade.agora?.data === coluna.data ? (
            <span
              data-testid="regua-do-agora"
              className={estilos.agora}
              style={{ "--linha": grade.agora.linha } as CSSProperties}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
