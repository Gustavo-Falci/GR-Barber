"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Aviso } from "../../componentes/Aviso";
import { GradeDeAgenda } from "../../componentes/GradeDeAgenda";
import { useRequisicao } from "../../api/useRequisicao";
import { formatarDataLonga, hojeIso } from "../../formato/datas";
import { diasDaSemana, faixasDoDia } from "../../painel/grade";
import { useApiDoPainel } from "../../painel/ProvedorDoPainel";
import estilos from "./AgendaDoDia.module.css";

const NOMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

// `agora` por parâmetro, como toda tela que olhe relógio: fake timers
// não entram nesta suíte, e teste que compara data fixa com o relógio
// real falha sozinho depois.
export function AgendaDoDia({ agora = new Date() }: { agora?: Date }) {
  const router = useRouter();
  const query = useSearchParams();
  const api = useApiDoPainel();

  const data = query.get("data") ?? hojeIso(agora);
  const semana = diasDaSemana(data);

  const doDia = useRequisicao(() => api.barbeiro.agendamentosDoDia(data), [data]);
  const daSemana = useRequisicao(
    () => api.barbeiro.agendamentosDoIntervalo(semana[0], semana[6]),
    [semana[0]]
  );
  const horarios = useRequisicao(() => api.barbeiro.horarios(), []);

  if (doDia.erro) return <Aviso>{doDia.erro.mensagem}</Aviso>;
  if (!doDia.dados || !horarios.dados) return <p>Carregando…</p>;

  const diaDaSemana = new Date(`${data}T12:00:00`).getDay();
  const faixas = faixasDoDia({
    data,
    horario: horarios.dados.find((h) => h.diaSemana === diaDaSemana),
    agendamentos: doDia.dados,
    agora,
  });

  return (
    <div className={estilos.pagina}>
      <h1>{formatarDataLonga(data)}</h1>

      <ul className={estilos.semana}>
        {semana.map((dia, indice) => (
          <li key={dia}>
            <button
              type="button"
              aria-current={dia === data ? "date" : undefined}
              onClick={() => router.push(`/painel/agenda?data=${dia}`)}
            >
              {NOMES[indice]} {dia.slice(8)}
              {/* O ponto diz que aquele dia tem algo, sem obrigar a
                  abrir um por um. */}
              {daSemana.dados?.some((a) => a.data === dia) ? " ·" : ""}
            </button>
          </li>
        ))}
      </ul>

      <GradeDeAgenda
        faixas={faixas}
        aoAbrir={(id) => router.push(`/painel/agendamentos/${id}`)}
        aoCriar={(hora) =>
          router.push(
            `/painel/agendamentos/novo?data=${data}&hora=${encodeURIComponent(hora)}`
          )
        }
      />
    </div>
  );
}
