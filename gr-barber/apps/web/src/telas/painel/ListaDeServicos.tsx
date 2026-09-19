"use client";

import { useRouter } from "next/navigation";
import { Aviso } from "../../componentes/Aviso";
import { Botao } from "../../componentes/Botao";
import { CabecalhoDaPagina } from "../../componentes/CabecalhoDaPagina";
import { Chip } from "../../componentes/Chip";
import { formatarPreco } from "../../componentes/ItemDeServico";
import { Tabela } from "../../componentes/Tabela";
import { useRequisicao } from "../../api/useRequisicao";
import { useApiDoPainel } from "../../painel/ProvedorDoPainel";
import estilos from "./ListaDeServicos.module.css";

export function ListaDeServicos() {
  const router = useRouter();
  const api = useApiDoPainel();
  // Inclui os inativos: é desta tela que o barbeiro reativa o que
  // desativou, e um inativo que sumisse seria irrecuperável. A API já
  // devolve ordenado por `[ativo desc, nome asc]`, então os desativados
  // afundam sozinhos — a tela não reordena nada.
  const servicos = useRequisicao(() => api.barbeiro.servicos(), []);

  if (servicos.erro) {
    return <Aviso>{servicos.erro.mensagem || "Não foi possível carregar os serviços agora."}</Aviso>;
  }

  // `dados` nasce null, e a lista vazia que saía dele fazia a `Tabela`
  // pintar o estado vazio no primeiro paint: o barbeiro com doze
  // serviços lia "Nenhum serviço cadastrado ainda" e um botão de
  // cadastrar o primeiro, toda vez que abria a tela. Mesma guarda de
  // ListaDeClientes.
  const carregando = !servicos.dados;
  const listados = servicos.dados ?? [];
  const inativos = listados.filter((servico) => !servico.ativo).length;

  return (
    <div className={estilos.pagina}>
      <CabecalhoDaPagina
        titulo="Serviços"
        apoio="O que a barbearia oferece, com duração e preço."
        acao={
          <Botao onClick={() => router.push("/painel/servicos/novo")}>
            + Novo
          </Botao>
        }
      />

      {/* Só a tabela espera. O cabeçalho fica de pé porque o "+ Novo"
          piscando a cada carga é movimento que não informa nada. */}
      {carregando ? (
        <p>Carregando…</p>
      ) : (
        <>
          {/* Um inativo pode estar abaixo da dobra: a frase é o único
              lugar onde ele se anuncia sem rolar. Só aparece quando há
              o que contar. */}
          {listados.length > 0 ? (
            <p className={estilos.contagem}>
              {listados.length}{" "}
              {listados.length === 1 ? "serviço" : "serviços"}
              {inativos > 0
                ? ` · ${inativos} inativo${inativos === 1 ? "" : "s"}`
                : ""}
            </p>
          ) : null}

          <Tabela
            cabecalho={["Nome", "Duração", "Preço"]}
            // Três colunas, e não quatro: a quarta existia só pro chip
            // de "inativo", que agora anda junto do nome. Vazia em toda
            // linha ativa, ela era 266px de nada no fim da tabela — e
            // era pra lá que ia toda a sobra de uma tela larga.
            larguras={["56%", "22%", "22%"]}
            // Duração e preço são número: à direita, para a vírgula de
            // "R$ 40,00" e a de "R$ 180,00" caírem na mesma coluna.
            alinhamentos={["inicio", "fim", "fim"]}
            vazio="Nenhum serviço cadastrado ainda."
            dicaVazio="Sem serviço cadastrado ninguém consegue agendar — é ele que define quanto tempo o horário ocupa."
            acaoVazio={
              <Botao onClick={() => router.push("/painel/servicos/novo")}>
                Cadastrar primeiro serviço
              </Botao>
            }
            aoAbrir={(id) => router.push(`/painel/servicos/${id}`)}
            linhas={listados.map((servico) => ({
              id: servico.id,
              // A linha inteira se atenua. "Sumiu do agendamento do
              // cliente" é a propriedade mais importante de um serviço
              // desativado, e anunciá-la só num chip no fim da linha a
              // deixava a meia tabela do nome que ela qualifica.
              atenuada: !servico.ativo,
              celulas: [
                // O chip entra na primeira célula, ou seja, dentro do
                // botão que abre a linha: o nome acessível passa a ser
                // "Platinado inativo", que é exatamente o que se quer
                // ouvir antes de decidir abrir.
                <span className={estilos.nome} key="nome">
                  {servico.nome}
                  {servico.ativo ? null : <Chip tom="neutro">inativo</Chip>}
                </span>,
                `${servico.duracaoMinutos} min`,
                formatarPreco(servico.preco),
              ],
            }))}
          />
        </>
      )}
    </div>
  );
}
