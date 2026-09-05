import { Botao } from "../../src/componentes/Botao";
import { Campo } from "../../src/componentes/Campo";
import { Cartao } from "../../src/componentes/Cartao";
import { Chip } from "../../src/componentes/Chip";
import estilos from "./page.module.css";

// Vitrine dos primitivos. Existe porque esta fase não entrega tela
// nenhuma e, sem ela, não haveria como ver o resultado rodando. Sai
// quando o painel chegar, no sub-projeto C.
export default function Primitivos() {
  return (
    <main className={estilos.pagina}>
      <h1>Primitivos</h1>

      <Cartao>
        <div className={estilos.linha}>
          <Botao>Confirmar agendamento</Botao>
          <Botao variante="contorno">Cancelar</Botao>
          <Botao variante="fantasma">Ver detalhes</Botao>
          <Botao carregando>Enviando…</Botao>
        </div>
      </Cartao>

      <Cartao>
        <div className={estilos.coluna}>
          <Campo rotulo="Nome" placeholder="João Silva" />
          <Campo rotulo="Telefone" formato="telefone" />
          <Campo rotulo="Telefone sem DDD" erro="informe o DDD" />
        </div>
      </Cartao>

      <Cartao>
        <div className={estilos.linha}>
          <Chip>09:00</Chip>
          <Chip tom="neutro">concluído</Chip>
        </div>
      </Cartao>
    </main>
  );
}
