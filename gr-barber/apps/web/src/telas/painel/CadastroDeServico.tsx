"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { ErroDaApi } from "@gr-barber/api-client";
import { Aviso } from "../../componentes/Aviso";
import { Botao } from "../../componentes/Botao";
import { Campo } from "../../componentes/Campo";
import { useRequisicao } from "../../api/useRequisicao";
import { useApiDoPainel } from "../../painel/ProvedorDoPainel";
import estilos from "./CadastroDeServico.module.css";

// "20,00" e "20.00" viram a mesma string decimal. Number entra só na
// validação, nunca no que é enviado: o preço é Decimal no banco.
function paraDecimal(digitado: string): string | null {
  const limpo = digitado.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return null;
  return Number(limpo).toFixed(2);
}

export function CadastroDeServico() {
  const { id } = useParams<{ id?: string }>();
  const router = useRouter();
  const api = useApiDoPainel();

  // Não existe servico(id) no client: cliente(id) e agendamento(id)
  // existem, este não. A lista basta, e devolve inclusive os inativos.
  const servicos = useRequisicao(() => api.barbeiro.servicos(), []);
  const atual = id ? servicos.dados?.find((s) => s.id === id) : undefined;

  const [nome, setNome] = useState("");
  const [duracao, setDuracao] = useState("");
  const [preco, setPreco] = useState("");
  const [erroPreco, setErroPreco] = useState<string | undefined>();
  const [aviso, setAviso] = useState<string | undefined>();
  const [salvando, setSalvando] = useState(false);

  // Sincronizado durante a renderização, e não num `useEffect`: mesmo
  // mecanismo do fix em ConfiguracoesDaBarbearia (181514d) — um efeito
  // só roda depois do commit, e entre o commit e o efeito o formulário
  // já teria aparecido com os campos vazios, aberto a digitar contra o
  // preenchimento assíncrono. Setar estado durante a própria
  // renderização faz o React descartar essa renderização e refazer com
  // o valor certo antes de pintar qualquer coisa — não existe commit
  // intermediário pra observar ou editar.
  //
  // O `!==` contra o rastreador (`atualSincronizado`) é o que impede o
  // loop: sem ele, cada `setNome`/`setDuracao`/`setPreco` re-renderiza,
  // a condição continua verdadeira (nada mudou o valor de `atual`, mas
  // também nada faria a igualdade falhar de novo), e o componente
  // re-renderiza pra sempre. É tentador "simplificar" isto pra um
  // booleano tipo `jaSincronizei` — não faça: um booleano nunca reabre
  // depois do primeiro `true`, e quebra o re-sync depois de
  // `alternarAtivo()` (abaixo) chamar `servicos.recarregar()`.
  //
  // O rastreador aqui é `atual` (o item achado na lista), não
  // `servicos.dados` (a lista inteira): o dublê de teste devolve a
  // mesma referência de array em toda chamada a `servicos()` (só o item
  // dentro dela é substituído por `{...antigo, ...edicao}`), então
  // `servicos.dados !== anterior` nunca dispararia depois de
  // `servicos.recarregar()`. `atual`, por vir de `.find()` sobre esse
  // array, aponta pro objeto recém-substituído — muda de referência
  // sempre que o serviço é editado ou reativado, com ou sem essa
  // peculiaridade do dublê.
  const [atualSincronizado, setAtualSincronizado] = useState<typeof atual>(undefined);
  if (atual && atual !== atualSincronizado) {
    setAtualSincronizado(atual);
    setNome(atual.nome);
    setDuracao(String(atual.duracaoMinutos));
    setPreco(atual.preco);
  }

  // Sem isto, uma falha em servicos() deixava dados null pra sempre: o
  // guard de "não encontrado" também depende de dados, então nenhum dos
  // dois disparava e a tela ficava no formulário vazio sem dizer nada.
  if (servicos.erro) return <Aviso>{servicos.erro.mensagem}</Aviso>;

  if (id && servicos.dados && !atual) {
    return <Aviso>Serviço não encontrado.</Aviso>;
  }

  async function salvar() {
    setAviso(undefined);
    setErroPreco(undefined);

    const decimal = paraDecimal(preco);
    if (!decimal) {
      setErroPreco("Use um valor como 40,00");
      return;
    }

    setSalvando(true);
    try {
      const corpo = {
        nome: nome.trim(),
        duracaoMinutos: Number(duracao),
        preco: decimal,
      };
      if (id) await api.barbeiro.atualizarServico(id, corpo);
      else await api.barbeiro.criarServico(corpo);
      router.push("/painel/servicos");
    } catch (causa) {
      setAviso((causa as ErroDaApi).mensagem || "Não foi possível salvar agora.");
    }
    setSalvando(false);
  }

  async function alternarAtivo() {
    if (!id || !atual) return;
    setSalvando(true);
    try {
      // Soft delete: some da lista pública e o histórico de quem já foi
      // atendido sobrevive.
      if (atual.ativo) await api.barbeiro.desativarServico(id);
      else await api.barbeiro.atualizarServico(id, { ativo: true });
      servicos.recarregar();
    } catch (causa) {
      setAviso((causa as ErroDaApi).mensagem || "Não foi possível salvar agora.");
    }
    setSalvando(false);
  }

  return (
    <div className={estilos.pagina}>
      <h1>{id ? "Editar serviço" : "Novo serviço"}</h1>

      <Campo rotulo="Nome" valor={nome} onChange={setNome} />
      <Campo rotulo="Duração em minutos" valor={duracao} onChange={setDuracao} />
      <Campo
        rotulo="Preço"
        valor={preco}
        onChange={(proximo) => {
          setPreco(proximo);
          setErroPreco(undefined);
        }}
        erro={erroPreco}
      />

      {aviso ? <Aviso>{aviso}</Aviso> : null}

      <Botao carregando={salvando} onClick={salvar}>
        Salvar
      </Botao>

      {atual ? (
        <Botao variante="contorno" carregando={salvando} onClick={alternarAtivo}>
          {atual.ativo ? "Desativar" : "Reativar"}
        </Botao>
      ) : null}
    </div>
  );
}
