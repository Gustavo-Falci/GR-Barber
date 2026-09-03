import { prisma } from "@gr-barber/database";
import { PADRAO_TELEFONE } from "../lib/padroes";
import { serializarBarbearia } from "../lib/serializar";
import { completarSemana } from "./horarios";
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

// Mesmo pattern do slug no signup: é ele que forma o link público, e um
// slug fora do formato não chega nem a consultar o banco.
const paramsSlug = {
  type: "object",
  required: ["slug"],
  additionalProperties: false,
  properties: { slug: { type: "string", pattern: "^[a-z0-9-]{3,80}$" } },
} as const;

// Pública de propósito: é a landing que o cliente abre pelo link do
// WhatsApp, sem conta nenhuma. Fica fora do escopo protegido do app.ts.
export function registrarRotasBarbeariasPublicas(app: App): void {
  app.get(
    "/barbearias/:slug",
    { schema: { params: paramsSlug } },
    async (request) => {
      // findUniqueOrThrow: slug inexistente vira P2025, que o tratador
      // central traduz pra 404.
      const barbearia = await prisma.barbearia.findUniqueOrThrow({
        where: { slug: request.params.slug },
        include: { horariosFuncionamento: true },
      });

      // Campos escolhidos pelo serializador: um spread traria os
      // barbeiros e o senhaHash junto.
      return {
        ...serializarBarbearia(barbearia),
        horarios: completarSemana(barbearia.horariosFuncionamento),
      };
    }
  );
}
