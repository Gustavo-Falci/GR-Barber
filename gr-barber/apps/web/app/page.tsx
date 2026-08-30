import { calcularHorariosDisponiveis } from "@gr-barber/scheduling";

// Página provisória — existe pra provar que o Next enxerga os pacotes
// internos do monorepo (transpilePackages no next.config.js). As telas
// de verdade estão em docs/screens.md e ainda não foram construídas.
export default function Home() {
  const horarios = calcularHorariosDisponiveis({
    horarioFuncionamento: {
      horaAbertura: "09:00",
      horaFechamento: "18:00",
      fechado: false,
    },
    agendamentosExistentes: [{ horaInicio: "10:00", horaFim: "10:45" }],
    duracaoTotalMinutos: 45,
  });

  return (
    <main>
      <h1>GR Barber</h1>
      <p className="subtitulo">Horários livres hoje ({horarios.length})</p>
      <div className="grade">
        {horarios.map((hora) => (
          <span key={hora} className="chip">
            {hora}
          </span>
        ))}
      </div>
    </main>
  );
}
