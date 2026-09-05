import { prisma } from "@gr-barber/database";
import { conflito } from "../lib/erro-http";
import { PADRAO_TELEFONE } from "../lib/padroes";
import { gerarHashSenha } from "../lib/senha";
import { serializarCliente } from "../lib/serializar";
import type { App } from "../tipos";

const paramsSlug = {
  type: "object",
  required: ["slug"],
  additionalProperties: false,
  properties: { slug: { type: "string", pattern: "^[a-z0-9-]{3,80}$" } },
} as const;

const corpoSignup = {
  type: "object",
  required: ["nome", "telefone", "senha"],
  additionalProperties: false,
  properties: {
    nome: { type: "string", minLength: 2, maxLength: 120 },
    telefone: { type: "string", pattern: PADRAO_TELEFONE, maxLength: 20 },
    senha: { type: "string", minLength: 8, maxLength: 200 },
  },
} as const;

// Públicas: são as telas de criar conta e entrar, abertas pelo link do
// WhatsApp. Ficam fora dos dois escopos protegidos do app.ts.
export function registrarRotasAuthCliente(app: App): void {
  app.post(
    "/barbearias/:slug/auth/cliente/signup",
    { schema: { params: paramsSlug, body: corpoSignup } },
    async (request, reply) => {
      const { nome, telefone, senha } = request.body;

      // findUniqueOrThrow: slug inexistente vira P2025 -> 404.
      const barbearia = await prisma.barbearia.findUniqueOrThrow({
        where: { slug: request.params.slug },
        select: { id: true },
      });

      const existente = await prisma.cliente.findUnique({
        where: {
          barbeariaId_telefone: { barbeariaId: barbearia.id, telefone },
        },
      });

      // Definir senha só é permitido enquanto não existe uma. Sem posse
      // verificada do telefone (OTP), esta é a única barreira contra
      // alguém assumir o cadastro de outra pessoa — quem chegar
      // primeiro fica com ele, e é uma dívida registrada na spec e no
      // roadmap, não um esquecimento.
      if (existente?.senhaHash) {
        throw conflito("esse telefone já tem conta nesta barbearia");
      }

      const senhaHash = await gerarHashSenha(senha);

      // `nome` só entra na criação. Num cadastro que já existe, o nome
      // do signup é ignorado de propósito: mesma regra do `update: {}`
      // vazio do upsert público — quem digita o nome abreviado no
      // celular não renomeia o cadastro que o barbeiro ajustou.
      const cliente = existente
        ? await prisma.cliente.update({
            where: { id: existente.id },
            data: { senhaHash },
          })
        : await prisma.cliente.create({
            data: { barbeariaId: barbearia.id, nome, telefone, senhaHash },
          });

      const token = app.jwt.sign({
        tipo: "cliente",
        clienteId: cliente.id,
        barbeariaId: barbearia.id,
      });

      return reply.code(201).send({ token, cliente: serializarCliente(cliente) });
    }
  );
}
