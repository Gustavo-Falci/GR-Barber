"use client";

import { useEffect, useMemo, useState } from "react";
import { apenasDigitos } from "@gr-barber/formato";
import { useRouter, useSearchParams } from "next/navigation";
import { Aviso } from "../../componentes/Aviso";
import { Botao } from "../../componentes/Botao";
import { CabecalhoDaPagina } from "../../componentes/CabecalhoDaPagina";
import { CampoDeBusca } from "../../componentes/CampoDeBusca";
import { Tabela } from "../../componentes/Tabela";
import { useRequisicao } from "../../api/useRequisicao";
import { formatarDataLonga, hojeIso } from "../../formato/datas";
import { IconeCalendario } from "../../painel/icones";
import { useApiDoPainel } from "../../painel/ProvedorDoPainel";
import estilos from "./ListaDeClientes.module.css";

// Quanto a busca espera parada antes de virar navegação e requisição.
// 300ms é o intervalo em que uma digitação normal não tem pausa — e a
// pessoa que parou pra ler a lista não sente espera.
const ESPERA_DA_BUSCA = 300;

const SEM_REGISTRO = "Sem registro nos últimos 90 dias";

// As três perguntas que o barbeiro faz sobre a carteira, nesta ordem:
// quem é todo mundo, quem está vindo, e quem sumiu. Os números saem do
// que ESTÁ carregado — a API devolve a página já filtrada pela busca, e
// contar aqui um total da barbearia seria inventar um dado que a tela
// não tem.
type Faixa = "todos" | "recentes" | "sumidos";

const FAIXAS: { valor: Faixa; rotulo: string }[] = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "recentes", rotulo: "Vieram em 30 dias" },
  { valor: "sumidos", rotulo: "Sem registro em 90 dias" },
];

// Zap abre no aplicativo com a conversa pronta. O 55 entra aqui porque o
// telefone guardado é nacional — "(15) 99782-7833" vira 5515997827833.
function linkDoZap(telefone: string): string {
  const digitos = apenasDigitos(telefone);
  return `https://wa.me/55${digitos}`;
}

function IconeZap() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.7-5.2A8.5 8.5 0 1 1 21 11.5Z" />
      <path d="M8.8 9.2c0 3.3 2.7 6 6 6 .7-.6 1-1 1-1l-1.8-1.2-1.1.9a5.6 5.6 0 0 1-1.8-1.8l.9-1.1L11.8 9s-.4.2-1 1c0 0-2 0-2-.8Z" />
    </svg>
  );
}

// `agora` por parâmetro porque a janela de 90 dias olha o relógio.
export function ListaDeClientes({ agora = new Date() }: { agora?: Date }) {
  const router = useRouter();
  const query = useSearchParams();
  const api = useApiDoPainel();
  const busca = query.get("busca") ?? "";
  // Estado local, e nao o valor da URL direto no campo: o router.push do
  // Next e assincrono, e um campo cujo valor so volta pela URL trava
  // enquanto a navegacao nao acontece - a pessoa digita e nao ve letra.
  // O filtro continua saindo da URL, entao recarregar e o link valem.
  const [faixa, setFaixa] = useState<Faixa>("todos");
  const [digitado, setDigitado] = useState(busca);
  useEffect(() => setDigitado(busca), [busca]);

  // A busca espera a pessoa parar de digitar antes de virar navegação e,
  // por consequência, requisição: `?busca=` é dependência do
  // useRequisicao abaixo, então cada tecla custava uma ida à API —
  // "gustavo" eram sete. O valor que aparece no campo continua sendo o
  // `digitado`, que muda na hora; o que atrasa é só o efeito dele.
  useEffect(() => {
    if (digitado === busca) return;

    const id = setTimeout(() => {
      // replace, não push: cada tecla mudaria a URL, e um push por tecla
      // empilharia uma entrada no histórico por tecla — digitar "joão"
      // deixaria quatro apertos de voltar só pra sair da tela. replace
      // mantém a busca linkável (o que o filtro na URL existe pra dar)
      // sem empilhar nada.
      router.replace(
        digitado
          ? `/painel/clientes?busca=${encodeURIComponent(digitado)}`
          : "/painel/clientes"
      );
    }, ESPERA_DA_BUSCA);

    return () => clearTimeout(id);
    // `router` fora das deps de propósito: a identidade dele muda a cada
    // navegação, e listá-lo remontaria o temporizador no meio da
    // digitação.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digitado, busca]);

  const clientes = useRequisicao(() => api.barbeiro.clientes(busca), [busca]);

  // O último agendamento não vem na lista de clientes, então sai daqui:
  // uma chamada de intervalo, não uma por linha. A janela é de 90 dias
  // e não "desde sempre" de propósito — buscar o histórico inteiro da
  // barbearia a cada abertura da lista fica mais caro a cada mês, e
  // quem não aparece há três meses aparece como "—", que é a informação
  // que a coluna existe pra dar.
  const janela = 90;
  const ate = hojeIso(agora);
  const de = hojeIso(new Date(agora.getTime() - janela * 24 * 60 * 60 * 1000));
  const trintaDiasAtras = hojeIso(
    new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000)
  );
  const recentes = useRequisicao(
    () => api.barbeiro.agendamentosDoIntervalo(de, ate),
    [de, ate]
  );

  // Uma passada pelos agendamentos, não uma por cliente: a versão antiga
  // filtrava e ordenava a lista inteira dentro do map das linhas, o que
  // com o teto de 200 clientes da API dava 200 varreduras de toda a
  // agenda do trimestre a cada render.
  const ultimaVisita = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const agendamento of recentes.dados ?? []) {
      const guardada = mapa.get(agendamento.cliente.id);
      // ISO compara como texto, então `>` basta pra ficar com a maior.
      if (!guardada || agendamento.data > guardada) {
        mapa.set(agendamento.cliente.id, agendamento.data);
      }
    }
    return mapa;
  }, [recentes.dados]);

  // Só a primeira carga: `dados` guarda a resposta anterior enquanto a
  // próxima não chega, então trocar a busca não pisca — a lista antiga
  // fica à vista até a nova responder.
  const carregando = !clientes.dados || !recentes.dados;

  // Um cliente por balde, a partir do mapa que a coluna já usa.
  const faixaDe = (clienteId: string): Faixa => {
    const ultima = ultimaVisita.get(clienteId);
    if (!ultima) return "sumidos";
    return ultima >= trintaDiasAtras ? "recentes" : "todos";
  };

  const carregados = clientes.dados ?? [];
  const listados =
    faixa === "todos"
      ? carregados
      : carregados.filter((cliente) => faixaDe(cliente.id) === faixa);

  const quantosNaFaixa = (valor: Faixa) =>
    valor === "todos"
      ? carregados.length
      : carregados.filter((cliente) => faixaDe(cliente.id) === valor).length;

  const quantos = listados.length;
  const contagem = busca
    ? `${quantos} ${quantos === 1 ? "encontrado" : "encontrados"} para “${busca}”`
    : `${quantos} ${quantos === 1 ? "cliente" : "clientes"}`;

  if (clientes.erro) {
    return <Aviso>{clientes.erro.mensagem || "Não foi possível carregar os clientes agora."}</Aviso>;
  }
  // `recentes.erro`, ao contrário do `daSemana.erro` da agenda (que fica
  // de fora de propósito, ver o comentário lá), não pode ficar de fora
  // aqui: quando essa chamada falha, `recentes.dados` fica `null` e
  // `ultimoDe` devolve "—" pra TODO cliente — e "—" não é "sem dado
  // ainda", é a alegação de que ninguém aparece há três meses. Uma
  // falha de carregamento virando essa afirmação confiante e falsa é
  // pior do que a tela inteira parar num aviso.
  if (recentes.erro) {
    return (
      <Aviso>
        {recentes.erro.mensagem || "Não foi possível carregar os últimos agendamentos agora."}
      </Aviso>
    );
  }

  function ultimoDe(clienteId: string): string {
    const ultima = ultimaVisita.get(clienteId);
    // O "—" de antes dizia duas coisas opostas com o mesmo traço: "nunca
    // veio" e "sumiu faz mais de três meses". A frase não afirma nenhuma
    // das duas — diz o que a janela de 90 dias de fato sabe.
    return ultima ? formatarDataLonga(ultima) : SEM_REGISTRO;
  }

  return (
    <div className={estilos.pagina}>
      <CabecalhoDaPagina
        titulo="Clientes"
        apoio="Quem já passou pela barbearia, com o último atendimento."
        acao={
          <Botao onClick={() => router.push("/painel/clientes/novo")}>
            + Novo cliente
          </Botao>
        }
      />

      <CampoDeBusca
        rotulo="Buscar por nome ou telefone"
        exemplo="Nome ou telefone"
        valor={digitado}
        onChange={setDigitado}
      />

      {/* O cabeçalho e o campo ficam de pé enquanto carrega, em vez de a
          tela inteira virar "Carregando…": o campo desmontado no meio da
          digitação levaria o foco junto. */}
      {carregando ? (
        <p>Carregando…</p>
      ) : (
        <>
          {/* Sem a contagem, uma lista curta não se distingue de um
              filtro que comeu o resto. A frase fala do que está na tela
              — e não do tamanho da base, que a tela não sabe: a API
              devolve a página filtrada, não um total. */}
          {/* As faixas ocupam a franja que sobrava acima da tabela e
              respondem a pergunta que a ordem alfabética não responde:
              quem está vindo e quem sumiu. Filtram o que já está na
              tela — nenhuma ida nova à API. */}
          <div className={estilos.faixas} role="group" aria-label="Filtrar por frequência">
            {FAIXAS.map((opcao) => (
              <button
                key={opcao.valor}
                type="button"
                className={estilos.faixa}
                aria-pressed={faixa === opcao.valor}
                onClick={() => setFaixa(opcao.valor)}
              >
                {opcao.rotulo}
                <span className={estilos.quantosNaFaixa}>
                  {quantosNaFaixa(opcao.valor)}
                </span>
              </button>
            ))}
          </div>

          {quantos > 0 ? (
            <p className={estilos.contagem}>{contagem}</p>
          ) : null}

        <Tabela
          cabecalho={["Nome", "Telefone", "Último agendamento", ""]}
          // Sem largura declarada o excesso de uma tela larga cai todo na
          // última coluna, e sobram centenas de pixels vazios à direita
          // de uma data de doze caracteres.
          larguras={["42%", "20%", "26%", "12%"]}
          // Dois vazios diferentes, porque são duas situações opostas:
          // sem nenhum cliente cadastrado, e uma busca que não achou
          // ninguém. O texto único de antes anunciava base vazia pra quem
          // só tinha digitado o nome errado.
          vazio={
            busca
              ? `Nenhum cliente para “${busca}”.`
              : faixa === "todos"
                ? "Nenhum cliente por aqui ainda."
                : "Nenhum cliente nesta faixa."
          }
          dicaVazio={
            busca
              ? "A busca olha nome e telefone — tente parte do nome, ou só os últimos dígitos."
              : faixa === "todos"
                ? "Cliente cadastrado aqui já aparece na busca do Novo agendamento."
                : "Os outros continuam na lista — a faixa só esconde quem não se encaixa."
          }
          acaoVazio={
            !busca && faixa !== "todos" ? (
              <Botao variante="contorno" onClick={() => setFaixa("todos")}>
                Ver todos
              </Botao>
            ) : busca ? (
              <Botao variante="contorno" onClick={() => setDigitado("")}>
                Limpar busca
              </Botao>
            ) : (
              <Botao onClick={() => router.push("/painel/clientes/novo")}>
                Cadastrar primeiro cliente
              </Botao>
            )
          }
          aoAbrir={(id) => router.push(`/painel/clientes/${id}`)}
          linhas={listados.map((cliente) => ({
            id: cliente.id,
            celulas: [
              cliente.nome,
              cliente.telefone,
              ultimoDe(cliente.id),
              // Chamar no zap e marcar horário são as duas coisas que se
              // faz com um cliente na tela — e as duas custavam abrir o
              // detalhe e voltar. `stopPropagation` em ambas: a linha
              // inteira abre o detalhe, e uma ação que também abrisse
              // seria a ação errada acontecendo junto.
              <span className={estilos.acoes} key="acoes">
                <a
                  className={estilos.acao}
                  href={linkDoZap(cliente.telefone)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Conversar com ${cliente.nome} no WhatsApp`}
                  onClick={(evento) => evento.stopPropagation()}
                >
                  <IconeZap />
                </a>
                <button
                  type="button"
                  className={estilos.acao}
                  aria-label={`Agendar para ${cliente.nome}`}
                  onClick={(evento) => {
                    evento.stopPropagation();
                    router.push(
                      `/painel/agendamentos/novo?cliente=${cliente.id}`
                    );
                  }}
                >
                  <IconeCalendario />
                </button>
              </span>,
            ],
          }))}
          />
        </>
      )}
    </div>
  );
}
