import { prisma } from "@gr-barber/database";
import { PADRAO_TELEFONE } from "../lib/padroes";
import { serializarBarbearia } from "../lib/serializar";
import type { App } from "../tipos";

// A tela de Configurações edita estes quatro campos. `slug` fica fora:
// ele forma o link público que o barbeiro já mandou no WhatsApp, e
// trocar quebraria o link — está fora do escopo desta fase. `id` e
// `barbeariaId` também ficam fora, e o additionalProperties: false é o
// que faz um corpo com barbeariaId virar 400 em vez de ser ignorado em
// silêncio.
const corpoPatchBarbearia = {
  type: "object",
  additionalProperties: false,
  minProperties: 1,
  properties: {
    nome: { type: "string", minLength: 2, maxLength: 120 },
    telefone: {
      type: ["string", "null"],
      pattern: PADRAO_TELEFONE,
      maxLength: 20,
    },
    endereco: { type: ["string", "null"], maxLength: 255 },
    // Só http(s): o campo vai direto pro `src` de uma imagem nas telas,
    // e um "javascript:" ali seria XSS servido pela nossa API.
    logoUrl: {
      type: ["string", "null"],
      pattern: "^https?://",
      maxLength: 500,
    },
  },
} as const;

export function registrarRotasBarbeariasProtegidas(app: App): void {
  app.patch(
    "/barbearias/me",
    { schema: { body: corpoPatchBarbearia } },
    async (request) => {
      // O id sai do token. Não existe rota `/barbearias/:id` de escrita:
      // sem id na URL não há o que escopar errado.
      const barbearia = await prisma.barbearia.update({
        where: { id: request.user.barbeariaId },
        data: request.body,
      });

      return serializarBarbearia(barbearia);
    }
  );
}
