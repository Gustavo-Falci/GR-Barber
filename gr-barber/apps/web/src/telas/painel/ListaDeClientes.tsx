"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Aviso } from "../../componentes/Aviso";
import { Botao } from "../../componentes/Botao";
import { Campo } from "../../componentes/Campo";
import { Tabela } from "../../componentes/Tabela";
import { useRequisicao } from "../../api/useRequisicao";
import { formatarDataLonga, hojeIso } from "../../formato/datas";
import { useApiDoPainel } from "../../painel/ProvedorDoPainel";
import estilos from "./ListaDeClientes.module.css";

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
  const [digitado, setDigitado] = useState(busca);
  useEffect(() => setDigitado(busca), [busca]);

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
  const recentes = useRequisicao(
    () => api.barbeiro.agendamentosDoIntervalo(de, ate),
    [de, ate]
  );

  if (clientes.erro) return <Aviso>{clientes.erro.mensagem}</Aviso>;

  function ultimoDe(clienteId: string): string {
    const datas = (recentes.dados ?? [])
      .filter((a) => a.cliente.id === clienteId)
      .map((a) => a.data)
      .sort();
    const ultima = datas.at(-1);
    return ultima ? formatarDataLonga(ultima) : "—";
  }

  return (
    <div className={estilos.pagina}>
      <div className={estilos.topo}>
        <h1>Clientes</h1>
        <Botao onClick={() => router.push("/painel/clientes/novo")}>+ Novo</Botao>
      </div>

      <Campo
        rotulo="Buscar por nome ou telefone"
        valor={digitado}
        onChange={(proximo) => {
          setDigitado(proximo);
          router.push(
            proximo ? `/painel/clientes?busca=${encodeURIComponent(proximo)}` : "/painel/clientes"
          );
        }}
      />

      <Tabela
        cabecalho={["Nome", "Telefone", "Último agendamento"]}
        vazio="Nenhum cliente por aqui ainda."
        aoAbrir={(id) => router.push(`/painel/clientes/${id}`)}
        linhas={(clientes.dados ?? []).map((cliente) => ({
          id: cliente.id,
          celulas: [cliente.nome, cliente.telefone, ultimoDe(cliente.id)],
        }))}
      />
    </div>
  );
}
