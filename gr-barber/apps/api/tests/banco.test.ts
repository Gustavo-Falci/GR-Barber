import { describe, expect, it } from "vitest";
import { prisma } from "@gr-barber/database";

describe("banco de teste", () => {
  it("conecta e começa vazio", async () => {
    expect(await prisma.barbearia.count()).toBe(0);
  });

  it("aplicou a EXCLUDE constraint escrita à mão na migration", async () => {
    // Essa constraint não sai do schema.prisma — ela existe só no SQL
    // da migration inicial. Se `migrate deploy` não a aplicou, todo o
    // teste de corrida da fase 4 daria falso positivo.
    const linhas = await prisma.$queryRaw<{ conname: string }[]>`
      SELECT conname FROM pg_constraint WHERE conname = 'sem_conflito_horario'
    `;
    expect(linhas).toHaveLength(1);
  });

  it("limpa o banco entre um caso e outro", async () => {
    await prisma.barbearia.create({
      data: { nome: "Barbearia Teste", slug: "teste-limpeza" },
    });
    expect(await prisma.barbearia.count()).toBe(1);
    // o beforeEach do setup.ts derruba isso antes do próximo caso
  });

  it("de fato começou vazio de novo", async () => {
    expect(await prisma.barbearia.count()).toBe(0);
  });
});
