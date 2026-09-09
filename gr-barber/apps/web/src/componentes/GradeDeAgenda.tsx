import type { Faixa } from "../painel/grade";
import estilos from "./GradeDeAgenda.module.css";

export function GradeDeAgenda({
  faixas,
  aoAbrir,
  aoCriar,
}: {
  faixas: Faixa[];
  aoAbrir: (id: string) => void;
  aoCriar: (hora: string) => void;
}) {
  if (faixas.length === 0) return <p>Fechado neste dia.</p>;

  return (
    <ul className={estilos.grade}>
      {faixas.map((faixa) => (
        <li key={faixa.hora} className={estilos.faixa}>
          {faixa.agendamento ? (
            <button type="button" onClick={() => aoAbrir(faixa.agendamento!.id)}>
              {faixa.hora} {faixa.agendamento.cliente.nome} ·{" "}
              {faixa.agendamento.servicos.map((s) => s.nome).join(" + ")}
            </button>
          ) : faixa.passada ? (
            // Sem botão: oferecer 09:00 às 10h é ruído. A hora continua
            // visível pra grade não ganhar buraco.
            <span className={estilos.passada}>{faixa.hora}</span>
          ) : (
            <button type="button" onClick={() => aoCriar(faixa.hora)}>
              {faixa.hora} livre
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
