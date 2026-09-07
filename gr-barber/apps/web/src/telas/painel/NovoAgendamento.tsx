"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ErroDaApi } from "@gr-barber/api-client";
import type { ClienteSerializado } from "@gr-barber/types";
import { Aviso } from "../../componentes/Aviso";
import { Botao } from "../../componentes/Botao";
import { Calendario } from "../../componentes/Calendario";
import { formatarPreco, ItemDeServico } from "../../componentes/ItemDeServico";
import { ListaDeHorarios } from "../../componentes/ListaDeHorarios";
import { useRequisicao } from "../../api/useRequisicao";
import { ehPassado, hojeIso } from "../../formato/datas";
import { useApiDoPainel } from "../../painel/ProvedorDoPainel";
import { usePainel } from "../../painel/SessaoDoPainel";
import { BuscaDeCliente } from "./BuscaDeCliente";
import estilos from "./NovoAgendamento.module.css";

// Quatro blocos numa tela só, e não um wizard: o wizard do fluxo do
// cliente existe porque celular não comporta quatro passos, e um
// monitor comporta. `agora` por parâmetro, como toda tela que olhe
// relógio — fake timers não entram nesta suíte.
export function NovoAgendamento({ agora = new Date() }: { agora?: Date }) {
  const router = useRouter();
  const query = useSearchParams();
  const api = useApiDoPainel();
  const { perfil, slug } = usePainel();

  const data = query.get("data") ?? hojeIso(agora);
  const hora = query.get("hora") ?? "";
  const [mes, setMes] = useState(data.slice(0, 7));
  const [cliente, setCliente] = useState<ClienteSerializado | null>(null);
  const [servicoIds, setServicoIds] = useState<string[]>([]);
  const [confirmouPassado, setConfirmouPassado] = useState(false);
  const [aviso, setAviso] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);

  const servicos = useRequisicao(() => api.barbeiro.servicos(), []);

  // Só com serviço escolhido a pergunta faz sentido: /disponibilidade
  // exige `servicoIds` não vazio (minItems: 1 no schema da API) porque
  // é a duração dos serviços que decide onde um atendimento cabe. Sem
  // serviço, a tela nem chama a rota — chamaria com um array vazio que
  // a API rejeitaria com 400.
  const horarios = useRequisicao(
    () =>
      servicoIds.length === 0
        ? Promise.resolve([])
        : api.publico.disponibilidadeDoDia(slug, {
            barbeiroId: perfil.id,
            data,
            servicoIds,
          }),
    [slug, perfil.id, data, servicoIds.join(",")]
  );

  const diasComVaga = useRequisicao(
    () =>
      servicoIds.length === 0
        ? Promise.resolve({})
        : api.publico.disponibilidadeDoMes(slug, {
            barbeiroId: perfil.id,
            mes,
            servicoIds,
          }),
    [slug, perfil.id, mes, servicoIds.join(",")]
  );

  // A hora que a agenda mandou pela URL entra na lista mesmo antes (ou
  // além) do que a disponibilidade devolveu: sem serviço selecionado a
  // chamada acima nem acontece, e sem isto o horário com que a tela
  // "chegou preenchida" não apareceria pra marcar como atual. O que é
  // enviado em `agendar()` é sempre este mesmo `hora`, então o que a
  // pessoa vê marcado é exatamente o que o botão vai submeter.
  const horariosCarregados = horarios.dados ?? [];
  const horariosParaExibir =
    hora && !horariosCarregados.includes(hora)
      ? [hora, ...horariosCarregados]
      : horariosCarregados;

  const passado = ehPassado(data, agora);
  const pronto =
    Boolean(cliente) && servicoIds.length > 0 && Boolean(hora) && (!passado || confirmouPassado);

  function trocarQuery(proximos: Record<string, string>) {
    const atual = new URLSearchParams(query.toString());
    for (const [chave, valor] of Object.entries(proximos)) atual.set(chave, valor);
    router.push(`/painel/agendamentos/novo?${atual.toString()}`);
  }

  async function agendar() {
    if (!cliente) return;
    setAviso(undefined);
    setEnviando(true);

    try {
      const criado = await api.barbeiro.criarAgendamento({
        // A barbearia do MVP tem um barbeiro só, e é o que está logado.
        barbeiroId: perfil.id,
        clienteId: cliente.id,
        servicoIds,
        data,
        horaInicio: hora,
      });
      router.push(`/painel/agendamentos/${criado.id}`);
    } catch (causa) {
      const erro = causa as ErroDaApi;
      if (erro.codigo === "horario_ocupado") {
        // A corrida que a trava do banco pega depois de a
        // disponibilidade já ter dito que cabia. A resposta certa é
        // recarregar os horários, não repetir o envio.
        setAviso("Esse horário acabou de ser ocupado. Escolha outro.");
        horarios.recarregar();
      } else {
        setAviso(erro.mensagem || "Não foi possível agendar agora.");
      }
    }

    setEnviando(false);
  }

  const escolhidos = (servicos.dados ?? []).filter((s) => servicoIds.includes(s.id));
  const duracao = escolhidos.reduce((total, s) => total + s.duracaoMinutos, 0);
  const total = escolhidos.reduce((soma, s) => soma + Math.round(Number(s.preco) * 100), 0);

  return (
    <div className={estilos.pagina}>
      <h1>Novo agendamento</h1>

      <div className={estilos.grade}>
        <BuscaDeCliente escolhido={cliente} aoEscolher={setCliente} />

        <section className={estilos.bloco}>
          <h2>Serviços</h2>
          {(servicos.dados ?? [])
            .filter((servico) => servico.ativo)
            .map((servico) => (
              <ItemDeServico
                key={servico.id}
                servico={servico}
                marcado={servicoIds.includes(servico.id)}
                aoAlternar={(id) =>
                  setServicoIds((atuais) =>
                    atuais.includes(id)
                      ? atuais.filter((outro) => outro !== id)
                      : [...atuais, id]
                  )
                }
              />
            ))}
          <p>
            {duracao} min · {formatarPreco((total / 100).toFixed(2))}
          </p>
        </section>

        <section className={estilos.bloco}>
          <h2>Data</h2>
          <Calendario
            mes={mes}
            dias={diasComVaga.dados ?? {}}
            agora={agora}
            aoEscolher={(escolhida) => trocarQuery({ data: escolhida })}
            aoTrocarMes={setMes}
          />
        </section>

        <section className={estilos.bloco}>
          <h2>Horário</h2>
          <ListaDeHorarios
            horarios={horariosParaExibir}
            selecionada={hora}
            aoEscolher={(escolhida) => trocarQuery({ hora: escolhida })}
          />
        </section>
      </div>

      {passado ? (
        <div className={estilos.passado}>
          {/* garantirAlteravel não toca o escopo do barbeiro, então isto
              é recuperável — registrar retroativamente um atendimento
              que acabou de acontecer é legítimo. Fazer isso sem
              perceber, não. */}
          <p>Data no passado.</p>
          <label>
            <input
              type="checkbox"
              checked={confirmouPassado}
              onChange={(evento) => setConfirmouPassado(evento.target.checked)}
            />
            Registrar mesmo assim
          </label>
        </div>
      ) : null}

      {aviso ? <Aviso>{aviso}</Aviso> : null}

      <Botao disabled={!pronto} carregando={enviando} onClick={agendar}>
        Agendar
      </Botao>
    </div>
  );
}
