"use client";

import { useEffect, useState } from "react";
import type { ErroDaApi } from "@gr-barber/api-client";
import { normalizarTelefoneObrigatorio, TelefoneInvalido } from "@gr-barber/formato";
import type { HorarioSerializado } from "@gr-barber/types";
import { Aviso } from "../../componentes/Aviso";
import { Botao } from "../../componentes/Botao";
import { Campo } from "../../componentes/Campo";
import { useRequisicao } from "../../api/useRequisicao";
import { useApiDoPainel } from "../../painel/ProvedorDoPainel";
import { usePainel } from "../../painel/SessaoDoPainel";
import estilos from "./ConfiguracoesDaBarbearia.module.css";

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

// Vazio vira null, que é o que a API aceita pra limpar o campo; string
// vazia seria 400 do pattern.
function telefoneOuNulo(digitado: string): string | null {
  return digitado.trim() ? normalizarTelefoneObrigatorio(digitado) : null;
}

export function ConfiguracoesDaBarbearia() {
  const api = useApiDoPainel();
  const { perfil, slug } = usePainel();

  const horariosSalvos = useRequisicao(() => api.barbeiro.horarios(), []);

  const [nomeDaBarbearia, setNomeDaBarbearia] = useState("");
  const [telefoneDaBarbearia, setTelefoneDaBarbearia] = useState("");
  const [endereco, setEndereco] = useState("");
  const [semana, setSemana] = useState<HorarioSerializado[]>([]);
  const [nome, setNome] = useState(perfil.nome);
  const [telefone, setTelefone] = useState(perfil.telefone ?? "");
  const [erro, setErro] = useState<Record<string, string | undefined>>({});
  const [aviso, setAviso] = useState<string | undefined>();

  // A API tem PATCH /barbearias/me e nenhum GET: a única leitura dos
  // dados da própria barbearia é a rota pública por slug. Daí o painel
  // precisar do escopo publico também aqui, e não só na
  // disponibilidade.
  const barbearia = useRequisicao(() => api.publico.perfilDaBarbearia(slug), [slug]);

  useEffect(() => {
    if (!barbearia.dados) return;
    setNomeDaBarbearia(barbearia.dados.nome);
    setTelefoneDaBarbearia(barbearia.dados.telefone ?? "");
    setEndereco(barbearia.dados.endereco ?? "");
  }, [barbearia.dados]);

  useEffect(() => {
    if (horariosSalvos.dados) setSemana(horariosSalvos.dados);
  }, [horariosSalvos.dados]);

  async function salvarDados() {
    setAviso(undefined);
    setErro({});
    try {
      await api.barbeiro.atualizarMinhaBarbearia({
        nome: nomeDaBarbearia.trim(),
        telefone: telefoneOuNulo(telefoneDaBarbearia),
        endereco: endereco.trim() || null,
      });
    } catch (causa) {
      if (causa instanceof TelefoneInvalido) {
        setErro({ telefoneDaBarbearia: "Informe o DDD e o número, como (11) 99999-8888" });
        return;
      }
      setAviso((causa as ErroDaApi).mensagem || "Não foi possível salvar agora.");
    }
  }

  async function salvarHorarios() {
    setAviso(undefined);
    try {
      // A semana inteira, sempre: dia ausente do corpo vira fechado na
      // API, de propósito — "sem linha" e "fechado" são estados
      // diferentes pro cálculo de disponibilidade.
      await api.barbeiro.salvarHorarios(semana);
      horariosSalvos.recarregar();
    } catch (causa) {
      setAviso((causa as ErroDaApi).mensagem || "Não foi possível salvar agora.");
    }
  }

  async function salvarPerfil() {
    setAviso(undefined);
    setErro({});
    try {
      await api.barbeiro.atualizarMeuPerfil({
        nome: nome.trim(),
        telefone: telefoneOuNulo(telefone),
      });
    } catch (causa) {
      if (causa instanceof TelefoneInvalido) {
        setErro({ telefone: "Informe o DDD e o número, como (11) 99999-8888" });
        return;
      }
      setAviso((causa as ErroDaApi).mensagem || "Não foi possível salvar agora.");
    }
  }

  function trocarDia(diaSemana: number, mudanca: Partial<HorarioSerializado>) {
    setSemana((atual) =>
      atual.map((dia) => (dia.diaSemana === diaSemana ? { ...dia, ...mudanca } : dia))
    );
  }

  // Sem esta trava, "Salvar horários" clicado antes da resposta chegar
  // mandaria `semana` vazio — e sete dias ausentes do corpo fecham a
  // semana inteira na API (mesma regra do PUT). O mesmo vale pro nome
  // da barbearia: sem esperar `barbearia.dados`, digitar corre contra o
  // preenchimento assíncrono do campo e perde a digitação — o mesmo
  // problema que a guarda de sessão resolve pro perfil, aqui pros dois
  // outros GETs da tela.
  if (barbearia.erro) return <Aviso>{barbearia.erro.mensagem}</Aviso>;
  if (horariosSalvos.erro) return <Aviso>{horariosSalvos.erro.mensagem}</Aviso>;
  if (!barbearia.dados || !horariosSalvos.dados) return <p>Carregando…</p>;

  return (
    <div className={estilos.pagina}>
      <h1>Configurações</h1>
      {aviso ? <Aviso>{aviso}</Aviso> : null}

      <section>
        <h2>Barbearia</h2>
        <Campo rotulo="Nome da barbearia" valor={nomeDaBarbearia} onChange={setNomeDaBarbearia} />
        <Campo
          rotulo="Telefone da barbearia"
          formato="telefone"
          valor={telefoneDaBarbearia}
          onChange={setTelefoneDaBarbearia}
          erro={erro.telefoneDaBarbearia}
        />
        <Campo rotulo="Endereço" valor={endereco} onChange={setEndereco} />
        <Botao onClick={salvarDados}>Salvar dados</Botao>
      </section>

      <section>
        <h2>Horário de funcionamento</h2>
        {semana.map((dia) => (
          <div key={dia.diaSemana} className={estilos.dia}>
            <span>{DIAS[dia.diaSemana]}</span>
            <label>
              <input
                type="checkbox"
                aria-label={`Fechado na ${DIAS[dia.diaSemana]}`}
                checked={dia.fechado}
                onChange={(evento) =>
                  // Fechar limpa as horas: deixar a hora antiga junto de
                  // fechado guardaria um estado que a API não usa e que
                  // a próxima leitura reexibiria.
                  trocarDia(
                    dia.diaSemana,
                    evento.target.checked
                      ? { fechado: true, horaAbertura: null, horaFechamento: null }
                      : { fechado: false, horaAbertura: "09:00", horaFechamento: "18:00" }
                  )
                }
              />
              fechado
            </label>
            {dia.fechado ? null : (
              <>
                <Campo
                  rotulo={`Abre na ${DIAS[dia.diaSemana]}`}
                  valor={dia.horaAbertura ?? ""}
                  onChange={(valor) => trocarDia(dia.diaSemana, { horaAbertura: valor })}
                />
                <Campo
                  rotulo={`Fecha na ${DIAS[dia.diaSemana]}`}
                  valor={dia.horaFechamento ?? ""}
                  onChange={(valor) => trocarDia(dia.diaSemana, { horaFechamento: valor })}
                />
              </>
            )}
          </div>
        ))}
        <Botao onClick={salvarHorarios}>Salvar horários</Botao>
      </section>

      <section>
        <h2>Seu perfil</h2>
        <Campo rotulo="Seu nome" valor={nome} onChange={setNome} />
        <Campo
          rotulo="Seu telefone"
          formato="telefone"
          valor={telefone}
          onChange={setTelefone}
          erro={erro.telefone}
        />
        <Botao onClick={salvarPerfil}>Salvar perfil</Botao>
      </section>
    </div>
  );
}
