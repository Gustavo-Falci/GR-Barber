import { randomUUID } from "node:crypto";

import { prisma } from "@gr-barber/database";
import { conferirSenha, gerarHashSenha } from "../lib/senha";
import type { App } from "../tipos";

// `format: "email"` dependeria do ajv-formats estar ligado no Fastify;
// um pattern explícito não depende de configuração nenhuma.
const PADRAO_EMAIL = "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$";

// A coluna é VARCHAR com índice único simples — sem citext e sem índice
// funcional, o Postgres compara caixa a caixa. Sem normalizar,
// "Gu@Exemplo.com" e "gu@exemplo.com" viram duas contas distintas, e
// quem cadastrou numa não entra pela outra. A mesma função na gravação
// e na busca, senão a busca nunca acha o que a gravação guardou.
function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Hash de uma senha aleatória, no mesmo formato e tamanho de um real.
// Serve só pra dar ao login sem barbeiro o mesmo custo de derivação do
// login com barbeiro — ver o comentário na rota. Tem que ser bem
// formado: um valor malformado sairia pelo atalho do conferirSenha sem
// derivar nada, que é justamente o vazamento que ele existe pra fechar.
//
// Calculado sob demanda e guardado: derivar a cada requisição seria
// desperdício, e no topo do módulo exigiria await de nível superior,
// que o bundle CJS do tsup não tem.
let hashDescartavel: Promise<string> | null = null;

export function obterHashDescartavel(): Promise<string> {
  hashDescartavel ??= gerarHashSenha(randomUUID());
  return hashDescartavel;
}

const corpoSignup = {
  type: "object",
  required: ["barbearia", "barbeiro"],
  additionalProperties: false,
  properties: {
    barbearia: {
      type: "object",
      required: ["nome", "slug"],
      additionalProperties: false,
      properties: {
        nome: { type: "string", minLength: 2, maxLength: 120 },
        // o slug forma o link público que o barbeiro manda no WhatsApp
        slug: { type: "string", pattern: "^[a-z0-9-]{3,80}$" },
      },
    },
    barbeiro: {
      type: "object",
      required: ["nome", "email", "senha"],
      additionalProperties: false,
      properties: {
        nome: { type: "string", minLength: 2, maxLength: 120 },
        email: { type: "string", pattern: PADRAO_EMAIL, maxLength: 160 },
        senha: { type: "string", minLength: 8, maxLength: 200 },
      },
    },
  },
} as const;

export function registrarRotasAuth(app: App): void {
  app.post(
    "/auth/signup",
    { schema: { body: corpoSignup } },
    async (request, reply) => {
      const { barbearia, barbeiro } = request.body;
      const email = normalizarEmail(barbeiro.email);
      const senhaHash = await gerarHashSenha(barbeiro.senha);

      // Transação: uma barbearia sem barbeiro seria inacessível pra
      // sempre, já que o login é por email de barbeiro.
      const criado = await prisma.$transaction(async (tx) => {
        const novaBarbearia = await tx.barbearia.create({
          data: { nome: barbearia.nome, slug: barbearia.slug },
        });

        const novoBarbeiro = await tx.barbeiro.create({
          data: {
            barbeariaId: novaBarbearia.id,
            nome: barbeiro.nome,
            email,
            senhaHash,
          },
        });

        return { barbearia: novaBarbearia, barbeiro: novoBarbeiro };
      });

      const token = app.jwt.sign({
        barbeiroId: criado.barbeiro.id,
        barbeariaId: criado.barbearia.id,
      });

      // Campos listados um a um, nunca spread do registro: é o que
      // garante que senhaHash não escape.
      return reply.code(201).send({
        token,
        barbeiro: {
          id: criado.barbeiro.id,
          nome: criado.barbeiro.nome,
          email: criado.barbeiro.email,
        },
        barbearia: {
          id: criado.barbearia.id,
          nome: criado.barbearia.nome,
          slug: criado.barbearia.slug,
        },
      });
    }
  );

  const corpoLogin = {
    type: "object",
    required: ["email", "senha"],
    additionalProperties: false,
    properties: {
      email: { type: "string", pattern: PADRAO_EMAIL, maxLength: 160 },
      senha: { type: "string", minLength: 1, maxLength: 200 },
    },
  } as const;

  app.post(
    "/auth/login",
    { schema: { body: corpoLogin } },
    async (request, reply) => {
      const { email, senha } = request.body;

      const barbeiro = await prisma.barbeiro.findUnique({
        where: { email: normalizarEmail(email) },
        include: { barbearia: true },
      });

      // Email inexistente e senha errada dão exatamente a mesma
      // resposta — confirmar qual dos dois falhou entregaria quais
      // emails existem na plataforma.
      //
      // Responder igual não basta: se o email não existe e a gente
      // pulasse o conferirSenha, essa resposta voltaria muito mais
      // rápido que a de senha errada, porque o scrypt é lento de
      // propósito. O relógio entregaria o que o corpo esconde. Por
      // isso o caminho sem barbeiro confere contra um hash descartável
      // — o resultado é sempre falso, mas custa o mesmo.
      //
      // Barbeiro desativado é tratado como inexistente: mesma resposta,
      // mesmo custo. `ativo` existe no schema desde a migration inicial;
      // sem esta linha, desativar alguém no futuro não tiraria o acesso
      // dele, e a falha seria silenciosa — ninguém testa o login de uma
      // conta que acabou de ser desligada.
      const autorizado = barbeiro?.ativo ? barbeiro : null;

      const hashParaConferir =
        autorizado?.senhaHash ?? (await obterHashDescartavel());
      const senhaConfere = await conferirSenha(senha, hashParaConferir);

      if (!autorizado || !senhaConfere) {
        return reply.code(401).send({ erro: "credenciais_invalidas" });
      }

      const token = app.jwt.sign({
        barbeiroId: autorizado.id,
        barbeariaId: autorizado.barbeariaId,
      });

      return reply.code(200).send({
        token,
        barbeiro: { id: autorizado.id, nome: autorizado.nome, email: autorizado.email },
        barbearia: {
          id: autorizado.barbearia.id,
          nome: autorizado.barbearia.nome,
          slug: autorizado.barbearia.slug,
        },
      });
    }
  );
}
