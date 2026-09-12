"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
// O tipo e o componente têm o mesmo nome de propósito — um descreve o
// que o outro desenha. O alias existe só para os dois conviverem aqui.
import type { GradeDeTempo as Grade } from "../painel/grade";
import { MINUTOS_POR_LINHA } from "../painel/grade";
import { formatarDataLonga } from "../formato/datas";
import estilos from "./GradeDeTempo.module.css";

const NOMES_CURTOS = ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."];

function nomeDoDia(data: string): string {
  // Meio-dia UTC pra leitura do dia da semana não escorregar de fuso —
  // a mesma precaução do `diaDaSemanaDe` em painel/grade.ts.
  return NOMES_CURTOS[new Date(`${data}T12:00:00Z`).getUTCDay()];
}

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
  const rolagem = useRef<HTMLDivElement>(null);
  // Largura que a barra de rolagem ocupa. O cabeçalho fica fora do
  // scrollport — para a barra começar abaixo dele — e por isso sobra
  // mais largo que o corpo exatamente por esta medida. O CSS não a
  // expõe em lugar nenhum, então ela é medida no DOM e devolvida como
  // custom property.
  //
  // Em sistema de barra sobreposta a conta dá zero, que é o valor certo:
  // lá a barra não ocupa largura e não há o que compensar.
  const [larguraDaRolagem, setLarguraDaRolagem] = useState(0);

  // `useLayoutEffect` e não `useEffect`: medir depois da pintura deixaria
  // um quadro com o cabeçalho deslocado, visível como um tranco.
  useLayoutEffect(() => {
    const elemento = rolagem.current;
    if (!elemento) return;
    setLarguraDaRolagem(elemento.offsetWidth - elemento.clientWidth);
  }, [grade.totalLinhas, grade.colunas.length]);

  if (grade.totalLinhas === 0) {
    return <p className={estilos.vazio}>Fechado neste dia.</p>;
  }

  // O número de colunas vai por custom property, e não por `auto-fit`:
  // cabeçalho e corpo são duas grades irmãs que precisam ter exatamente
  // as mesmas trilhas, e `auto-fit` as derivaria da contagem de filhos
  // de cada uma — que é diferente.
  const estiloDaGrade = {
    "--total-linhas": grade.totalLinhas,
    "--colunas": grade.colunas.length,
    "--largura-da-rolagem": `${larguraDaRolagem}px`,
  } as CSSProperties;

  return (
    <div
      className={estilos.quadro}
      style={estiloDaGrade}
      data-testid="quadro-da-grade"
    >
      {/* Fora do invólucro que rola, e não dentro: assim a barra de
          rolagem começa abaixo do cabeçalho em vez de correr ao lado dos
          dias. O preço é o cabeçalho sobrar mais largo que o corpo pela
          largura da barra — devolvida a ele por
          `--largura-da-rolagem`, medida acima. */}
      <div className={estilos.cabecalho} data-testid="cabecalho-da-grade">
        <span className={estilos.canto} />
        {grade.colunas.map((coluna) =>
          aoAbrirDia ? (
            <button
              key={coluna.data}
              type="button"
              className={estilos.diaDoCabecalho}
              // A data por extenso é o nome acessível: "8" sozinho não
              // distingue uma coluna da outra numa lista de sete.
              aria-label={formatarDataLonga(coluna.data)}
              onClick={() => aoAbrirDia(coluna.data)}
            >
              <span className={estilos.nomeDoDia}>
                {nomeDoDia(coluna.data)}
              </span>
              <span className={estilos.numeroDoDia}>
                {Number(coluna.data.slice(8))}
              </span>
            </button>
          ) : (
            // Sem navegação a vista de dia ainda precisa dizer que dia
            // está na tela — o que some é o clique, não o rótulo.
            <span key={coluna.data} className={estilos.diaDoCabecalho}>
              <span className={estilos.nomeDoDia}>
                {nomeDoDia(coluna.data)}
              </span>
              <span className={estilos.numeroDoDia}>
                {Number(coluna.data.slice(8))}
              </span>
            </span>
          ),
        )}
      </div>

      <div
        className={estilos.rolagem}
        ref={rolagem}
        data-testid="rolagem-da-grade"
      >
        <div className={estilos.corpo} data-testid="corpo-da-grade">
          <div className={estilos.eixo}>
            {horasCheias(grade).map((hora) => (
              <span
                key={hora.rotulo}
                className={estilos.hora}
                // O rótulo da primeira linha fica embaixo do cabeçalho
                // grudado e não pode subir meia linha como os outros. É
                // `linha === 1`, e não "o primeiro da lista": abrindo às
                // 09:30, o primeiro rótulo é 10:00 na linha 7, que não
                // encosta em nada.
                data-no-topo={hora.linha === 1 ? "true" : undefined}
                style={{ "--linha": hora.linha } as CSSProperties}
              >
                {hora.rotulo}
              </span>
            ))}
          </div>

          {grade.colunas.map((coluna) => (
            <div key={coluna.data} className={estilos.coluna}>
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
                      {
                        "--linha": faixa.linha,
                        "--linhas": faixa.linhas,
                      } as CSSProperties
                    }
                  />
                ) : (
                  <button
                    key={faixa.hora}
                    type="button"
                    className={estilos.livre}
                    style={
                      {
                        "--linha": faixa.linha,
                        "--linhas": faixa.linhas,
                      } as CSSProperties
                    }
                    onClick={() => aoCriar(coluna.data, faixa.hora)}
                  >
                    {faixa.hora}
                  </button>
                ),
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
      </div>
    </div>
  );
}
