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
  // desativou, e um inativo que sumisse seria irrecuperável.
  const servicos = useRequisicao(() => api.barbeiro.servicos(), []);

  if (servicos.erro) {
    return <Aviso>{servicos.erro.mensagem || "Não foi possível carregar os serviços agora."}</Aviso>;
  }

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

      <Tabela
        cabecalho={["Nome", "Duração", "Preço", ""]}
        vazio="Nenhum serviço cadastrado ainda."
        dicaVazio="Sem serviço cadastrado ninguém consegue agendar — é ele que define quanto tempo o horário ocupa."
        acaoVazio={
          <Botao onClick={() => router.push("/painel/servicos/novo")}>
            Cadastrar primeiro serviço
          </Botao>
        }
        aoAbrir={(id) => router.push(`/painel/servicos/${id}`)}
        linhas={(servicos.dados ?? []).map((servico) => ({
          id: servico.id,
          celulas: [
            servico.nome,
            `${servico.duracaoMinutos} min`,
            formatarPreco(servico.preco),
            servico.ativo ? null : <Chip tom="neutro">inativo</Chip>,
          ],
        }))}
      />
    </div>
  );
}
