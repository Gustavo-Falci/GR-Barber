# Painel web do barbeiro — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** entregar o painel web do barbeiro — doze rotas sob `/painel` —
de modo que o produto fique usável de ponta a ponta pelo navegador, sem
app.

**Architecture:** Next 16 App Router, todas as telas client components
falando com `packages/api-client` por um provedor de contexto, como o
fluxo do cliente já faz. O painel vive num segmento real `painel/`
dentro do route group `(painel)`, com um subgrupo `(guardado)` cujo
layout concentra a guarda de sessão, o carregamento do perfil e o
tratamento de 401. Estado de tela na URL; sessão em `localStorage`.

**Tech Stack:** Next 16.3, React 19.2, TypeScript, CSS Modules, Vitest 4
com jsdom e Testing Library, `@gr-barber/api-client` (com
`criarApiClientFalso`), `@gr-barber/formato`, `@gr-barber/types`,
`@gr-barber/design-tokens`.

**Spec:** `docs/superpowers/specs/2026-09-06-painel-do-barbeiro-design.md`

## Global Constraints

Valem em toda tarefa. Copiadas da spec e do que já é regra do
repositório.

- **Prefixo `/painel` em toda rota do painel.** O slug da barbearia é
  `^[a-z0-9-]{3,80}$` sem reservados; rota estática na raiz tornaria
  aquele slug inalcançável.
- **Telefone tem um formato só: `(11) 99999-8888`.** Escreve com
  `formatarTelefoneParcial` enquanto se digita, envia com
  `normalizarTelefoneObrigatorio`, que lança `TelefoneInvalido`. Número
  sem DDD é 400 na API.
- **Preço é `string` em todo o caminho, nunca `number`.** É `Decimal` no
  banco e float perderia centavo. Exibe com `formatarPreco` de
  `src/componentes/ItemDeServico.tsx`.
- **Toda tela que olhe relógio recebe `agora: Date` por parâmetro**, com
  `new Date()` como padrão, e todo teste com data fixa passa o instante.
  Fake timers não entram nesta suíte. Teste que compara data fixa com o
  relógio real passa hoje e falha sozinho depois — já aconteceu.
- **`vi.fn()` declara os parâmetros** (`vi.fn(async (id: string) => …)`).
  Sem eles `mock.calls` vira tupla vazia e a asserção quebra no
  type-check com o teste verde.
- **Rodar um arquivo só:**
  `pnpm --filter @gr-barber/web exec vitest run <caminho>`. O `--` do
  pnpm não chega ao vitest.
- **Não existe `next lint` no Next 16** e nenhum app tem script `lint`.
  A verificação é `pnpm type-check` e `pnpm test`.
- **CSS Modules, um arquivo por componente**, tokens sempre por
  `var(--cor-*)`, `var(--espaco-*)`, `var(--texto-*)`, `var(--raio-*)`,
  `var(--borda-*)`. Sem CSS-in-JS.
- **A suíte roda sem `globals: true`**: importe `describe`, `it`,
  `expect`, `beforeEach` e `vi` de `vitest` em todo arquivo.
- **Os erros da API se tratam por `codigo`, nunca por status solto.** Os
  códigos: `nao_autenticado`, `nao_encontrado`, `conflito`,
  `horario_ocupado`, `regra_de_negocio`, `requisicao_invalida`,
  `erro_interno`.
- **Commits em inglês**, no formato dos que já existem (`feat(web): …`,
  `fix(web): …`, `test(web): …`, `docs: …`).

## Estrutura de arquivos

**Pacote `api-client` (Tarefa 1)**

| Arquivo | Responsabilidade |
|---|---|
| `packages/api-client/src/falso.ts` | passa a guardar **lista** de clientes, `clienteId` por agendamento, e `signup` que respeita a entrada |
| `packages/api-client/tests/falso.test.ts` | cobre os três reparos |

**Sessão e tema (Tarefas 2 e 3)**

| Arquivo | Responsabilidade |
|---|---|
| `apps/web/src/sessao/armazenamento.ts` | ganha `sessaoDaBarbearia` e `encerrarSessaoDoBarbeiro()` |
| `apps/web/src/painel/tema.ts` | chave, leitura, aplicação e o script inline |
| `apps/web/app/tokens-css.ts` | três blocos de tema em vez de dois |
| `apps/web/app/layout.tsx` | script de tema no `<head>` |
| `apps/web/app/(publico)/layout.tsx` | perde a `<div data-theme>` |

**Shell do painel (Tarefa 4)**

| Arquivo | Responsabilidade |
|---|---|
| `apps/web/src/painel/ProvedorDoPainel.tsx` | o `api.barbeiro` em contexto; aceita dublê no teste |
| `apps/web/src/painel/SessaoDoPainel.tsx` | guarda, perfil em contexto, `sair()` |
| `apps/web/src/painel/NavegacaoDoPainel.tsx` | barra superior, links, botão de tema |
| `apps/web/app/(painel)/painel/(guardado)/layout.tsx` | monta os três acima |
| `apps/web/tests/ajudantes/navegacao.ts` | passa a carregar `params` e `pathname` |

**Componentes novos (nas tarefas que os usam)**

| Arquivo | Tarefa |
|---|---|
| `apps/web/src/componentes/Estatistica.tsx` | 6 |
| `apps/web/src/componentes/GradeDeAgenda.tsx` | 7 |
| `apps/web/src/componentes/Tabela.tsx` | 10 |

**Telas** — todas em `apps/web/src/telas/painel/`, com a `page.tsx`
correspondente em `apps/web/app/(painel)/painel/…` servindo só de
casca. Uma tela por arquivo, um teste por tela.

| Tela | Rota | Tarefa |
|---|---|---|
| `EntrarNoPainel.tsx` | `/painel/entrar` | 5 |
| `DashboardDoDia.tsx` | `/painel` | 6 |
| `AgendaDoDia.tsx` | `/painel/agenda` | 7 |
| `NovoAgendamento.tsx` | `/painel/agendamentos/novo` | 8 |
| `DetalheDoAgendamento.tsx` | `/painel/agendamentos/[id]` | 9 |
| `ListaDeClientes.tsx` | `/painel/clientes` | 10 |
| `CadastroDeCliente.tsx` | `/painel/clientes/novo` | 10 |
| `DetalheDoCliente.tsx` | `/painel/clientes/[id]` | 10 |
| `ListaDeServicos.tsx` | `/painel/servicos` | 11 |
| `CadastroDeServico.tsx` | `/painel/servicos/novo` e `/[id]` | 11 |
| `ConfiguracoesDaBarbearia.tsx` | `/painel/configuracoes` | 12 |

**Limpeza (Tarefa 13):** `apps/web/app/primitivos/` sai;
`docs/screens.md` e `docs/roadmap.md` registram as doze rotas.

---

### Task 1: Reparar o dublê para o escopo do barbeiro

O dublê guarda **um** cliente: `estado.cliente` é objeto único,
`clientes()` devolve `[estado.cliente]`, `criarCliente` sobrescreve e
`cliente(id)` responde 404 para qualquer outro id. Lista, busca e
detalhe de clientes não têm como ser testados assim. `signup()` também
ignora o que recebe, e a tela de criar barbearia precisa ver o slug que
enviou.

`estado.cliente` **continua existindo** — é o cliente logado que o
escopo `clientes-me` usa, e as oito telas do sub-projeto B dependem
dele. O que entra é `estado.clientes`, a lista que o barbeiro enxerga.

**Files:**
- Modify: `packages/api-client/src/falso.ts`
- Test: `packages/api-client/tests/falso.test.ts`

**Interfaces:**
- Consumes: nada de tarefas anteriores.
- Produces:
  - `EstadoFalso.clientes: ClienteSerializado[]` — semeável, padrão
    `[CLIENTE_PADRAO]`.
  - `barbeiro.clientes(busca?: string): Promise<ClienteSerializado[]>`
    filtrando por nome (sem acento, sem caixa) e por telefone (dígito a
    dígito).
  - `barbeiro.criarCliente(novo)` empurra na lista e devolve o criado;
    telefone repetido lança
    `new ErroDaApi(409, "conflito", "esse telefone já tem cadastro")`.
  - `barbeiro.cliente(id)` acha na lista.
  - `barbeiro.signup(nova)` devolve `SessaoBarbeiro` com o nome e o slug
    enviados.
  - `AgendamentoSerializado & { clienteId?: string }` no estado, para
    `comCliente` resolver quem é o cliente de cada agendamento.

- [ ] **Step 1: Escrever os testes que falham**

Criar `packages/api-client/tests/falso.test.ts` se não existir; se
existir, acrescentar o `describe` abaixo.

```ts
import { describe, expect, it } from "vitest";
import { criarApiClientFalso, ErroDaApi } from "../src";

describe("dublê — escopo do barbeiro", () => {
  it("lista todos os clientes semeados", async () => {
    const falso = criarApiClientFalso({
      clientes: [
        { id: "c1", nome: "João Silva", telefone: "(11) 99999-0001", email: null, temConta: false },
        { id: "c2", nome: "Marcos Reis", telefone: "(11) 99999-0002", email: null, temConta: false },
      ],
    });

    expect(await falso.barbeiro.clientes()).toHaveLength(2);
  });

  it("filtra por nome sem se importar com caixa", async () => {
    const falso = criarApiClientFalso({
      clientes: [
        { id: "c1", nome: "João Silva", telefone: "(11) 99999-0001", email: null, temConta: false },
        { id: "c2", nome: "Marcos Reis", telefone: "(11) 99999-0002", email: null, temConta: false },
      ],
    });

    const achados = await falso.barbeiro.clientes("marcos");

    expect(achados.map((c) => c.id)).toEqual(["c2"]);
  });

  it("filtra por telefone comparando dígito a dígito", async () => {
    // A API compara com regexp_replace no SQL: quem digita 999990002
    // acha (11) 99999-0002, sem parêntese nem traço.
    const falso = criarApiClientFalso({
      clientes: [
        { id: "c1", nome: "João Silva", telefone: "(11) 99999-0001", email: null, temConta: false },
        { id: "c2", nome: "Marcos Reis", telefone: "(11) 99999-0002", email: null, temConta: false },
      ],
    });

    const achados = await falso.barbeiro.clientes("999990002");

    expect(achados.map((c) => c.id)).toEqual(["c2"]);
  });

  it("cria cliente novo e o devolve na lista", async () => {
    const falso = criarApiClientFalso({ clientes: [] });

    const criado = await falso.barbeiro.criarCliente({
      nome: "Ana Souza",
      telefone: "(11) 98888-7777",
    });

    expect(criado.nome).toBe("Ana Souza");
    expect(await falso.barbeiro.clientes()).toHaveLength(1);
  });

  it("recusa telefone já cadastrado com conflito", async () => {
    // É o caso comum do walk-in: quem chega já existe, criado pelo
    // upsert do agendamento público.
    const falso = criarApiClientFalso({
      clientes: [
        { id: "c1", nome: "João Silva", telefone: "(11) 99999-0001", email: null, temConta: false },
      ],
    });

    await expect(
      falso.barbeiro.criarCliente({ nome: "João", telefone: "(11) 99999-0001" })
    ).rejects.toMatchObject({ codigo: "conflito" });
  });

  it("acha cliente por id na lista inteira", async () => {
    const falso = criarApiClientFalso({
      clientes: [
        { id: "c1", nome: "João Silva", telefone: "(11) 99999-0001", email: null, temConta: false },
        { id: "c2", nome: "Marcos Reis", telefone: "(11) 99999-0002", email: null, temConta: false },
      ],
    });

    const achado = await falso.barbeiro.cliente("c2");

    expect(achado.nome).toBe("Marcos Reis");
    expect(achado.agendamentos).toEqual([]);
  });

  it("devolve 404 para cliente que não existe", async () => {
    const falso = criarApiClientFalso({ clientes: [] });

    await expect(falso.barbeiro.cliente("c9")).rejects.toBeInstanceOf(ErroDaApi);
  });

  it("o signup devolve a barbearia que foi enviada", async () => {
    const falso = criarApiClientFalso();

    const sessao = await falso.barbeiro.signup({
      barbearia: { nome: "Barbearia do Zé", slug: "barbearia-do-ze" },
      barbeiro: { nome: "Zé", email: "ze@barbearia.com", senha: "segredo123" },
    });

    expect(sessao.barbearia.slug).toBe("barbearia-do-ze");
    expect(sessao.barbearia.nome).toBe("Barbearia do Zé");
    expect(sessao.barbeiro.nome).toBe("Zé");
  });

  it("o agendamento do barbeiro carrega o cliente que ele escolheu", async () => {
    const falso = criarApiClientFalso({
      clientes: [
        { id: "c1", nome: "João Silva", telefone: "(11) 99999-0001", email: null, temConta: false },
        { id: "c2", nome: "Marcos Reis", telefone: "(11) 99999-0002", email: null, temConta: false },
      ],
    });

    const criado = await falso.barbeiro.criarAgendamento({
      barbeiroId: "bb1",
      clienteId: "c2",
      servicoIds: ["s1"],
      data: "2026-09-08",
      horaInicio: "09:00",
    });

    expect(criado.cliente.nome).toBe("Marcos Reis");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @gr-barber/api-client exec vitest run tests/falso.test.ts`
Expected: FAIL — `clientes` não existe em `EstadoFalso`, o filtro não
filtra, o signup devolve `gr-barber`.

- [ ] **Step 3: Acrescentar a lista ao estado**

Em `packages/api-client/src/falso.ts`, na interface `EstadoFalso`, ao
lado de `cliente`:

```ts
export interface EstadoFalso {
  perfil: PerfilPublicoBarbearia;
  servicos: ServicoSerializado[];
  horariosLivres: string[];
  diasComVaga: Record<string, boolean>;
  // O `clienteId` é do dublê, não da API: AgendamentoSerializado não o
  // tem, e sem ele `comCliente` não sabe qual dos clientes da lista
  // pertence a cada agendamento. Opcional para não quebrar as sementes
  // do sub-projeto B, que não o informam.
  agendamentos: (AgendamentoSerializado & { clienteId?: string })[];
  // O cliente logado, que o escopo `clientes-me` usa.
  cliente: ClienteSerializado;
  // Os clientes que o barbeiro enxerga. Lista separada porque as duas
  // perguntas são diferentes: "quem sou eu" e "quem são os meus".
  clientes: ClienteSerializado[];
}
```

E no corpo de `criarApiClientFalso`, junto das outras cópias:

```ts
    cliente: semente.cliente ?? CLIENTE_PADRAO,
    clientes: [...(semente.clientes ?? [CLIENTE_PADRAO])],
```

- [ ] **Step 4: Trocar os quatro métodos e o `comCliente`**

Ainda em `falso.ts`. O `comCliente`:

```ts
  function comCliente(
    agendamento: AgendamentoSerializado & { clienteId?: string }
  ): AgendamentoComCliente {
    const dono =
      estado.clientes.find((c) => c.id === agendamento.clienteId) ??
      estado.cliente;
    return { ...agendamento, cliente: dono };
  }
```

O `novoAgendamento` passa a guardar o `clienteId` que recebeu —
acrescente `clienteId?: string` ao tipo do parâmetro `entrada` e
`clienteId: entrada.clienteId` ao objeto `agendamento` construído.

Um ajudante de busca, junto dos outros (`duracaoDe`, `editarServico`):

```ts
  // Nome sem acento e sem caixa; telefone dígito a dígito. É o que a
  // busca de clientes da API faz em SQL cru com regexp_replace.
  function combina(cliente: ClienteSerializado, busca: string): boolean {
    const alvo = busca.trim();
    if (!alvo) return true;

    const semAcento = (texto: string) =>
      texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

    if (semAcento(cliente.nome).includes(semAcento(alvo))) return true;

    const digitos = alvo.replace(/\D/g, "");
    return (
      digitos.length > 0 &&
      cliente.telefone.replace(/\D/g, "").includes(digitos)
    );
  }
```

Os métodos do bloco `barbeiro`:

```ts
      async clientes(busca?: string) {
        return estado.clientes.filter((c) => combina(c, busca ?? ""));
      },
      async criarCliente(novo: NovoCliente) {
        const repetido = estado.clientes.some(
          (c) => c.telefone.replace(/\D/g, "") === novo.telefone.replace(/\D/g, "")
        );
        if (repetido) {
          throw new ErroDaApi(409, "conflito", "esse telefone já tem cadastro");
        }
        const cliente: ClienteSerializado = {
          id: `c${estado.clientes.length + 1}`,
          nome: novo.nome,
          telefone: novo.telefone,
          email: novo.email ?? null,
          temConta: false,
        };
        estado.clientes.push(cliente);
        return cliente;
      },
      async cliente(id: string) {
        const achado = estado.clientes.find((c) => c.id === id);
        if (!achado) {
          throw new ErroDaApi(404, "nao_encontrado", "cliente não encontrado");
        }
        return {
          ...achado,
          agendamentos: estado.agendamentos.filter((a) => a.clienteId === id),
        };
      },
      async atualizarCliente(id: string, edicao: EdicaoDoCliente) {
        const indice = estado.clientes.findIndex((c) => c.id === id);
        if (indice < 0) {
          throw new ErroDaApi(404, "nao_encontrado", "cliente não encontrado");
        }
        estado.clientes[indice] = { ...estado.clientes[indice], ...edicao };
        return estado.clientes[indice];
      },
```

E o `signup`, que precisa refletir o que recebeu:

```ts
      async signup(nova: NovaBarbearia) {
        return {
          token: "jwt-falso-barbeiro",
          barbeiro: {
            id: "bb1",
            nome: nova.barbeiro.nome,
            email: nova.barbeiro.email,
          },
          barbearia: {
            id: estado.perfil.id,
            nome: nova.barbearia.nome,
            slug: nova.barbearia.slug,
          },
        };
      },
```

- [ ] **Step 5: Rodar o arquivo e depois a suíte inteira**

Run: `pnpm --filter @gr-barber/api-client exec vitest run tests/falso.test.ts`
Expected: PASS

Run: `pnpm test`
Expected: PASS — os 463 testes de hoje continuam verdes. Se algum teste
de tela do sub-projeto B quebrar, é sinal de que `estado.cliente` foi
substituído em vez de acompanhado; desfaça a substituição.

- [ ] **Step 6: Commit**

```bash
git add packages/api-client/src/falso.ts packages/api-client/tests/falso.test.ts
git commit -m "test(api-client): let the double hold a list of clients

The barber's Clientes screen searches, lists and opens clients, and the
double kept exactly one — clientes() returned a single-element array and
criarCliente overwrote it. estado.cliente stays as the logged-in client
the clientes-me scope uses; estado.clientes is the new list. signup now
echoes the barbershop it was given, and agendamentos remember which
client they belong to."
```

---

### Task 2: Segunda chave na sessão do barbeiro

`GET /me` devolve `PerfilBarbeiro`, que tem `barbeariaId` mas não tem
slug. O slug é necessário: `publico.disponibilidadeDoDia` é rota por
slug e a tela de novo agendamento depende dela. Ele chega uma vez só, no
`SessaoBarbeiro` do login e do signup.

**Files:**
- Modify: `apps/web/src/sessao/armazenamento.ts`
- Test: `apps/web/tests/sessao/armazenamento.test.ts`

**Interfaces:**
- Consumes: `Sessao`, `sessaoNaChave`, `sessaoDoBarbeiro` (já existem).
- Produces:
  - `sessaoDaBarbearia: Sessao` na chave `sessao.barbearia`.
  - `encerrarSessaoDoBarbeiro(): void` limpando as duas.

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar em `apps/web/tests/sessao/armazenamento.test.ts`:

```ts
  it("guarda o slug da barbearia numa chave própria", () => {
    sessaoDaBarbearia.gravar("gr-barber");

    expect(localStorage.getItem("sessao.barbearia")).toBe("gr-barber");
    expect(sessaoDaBarbearia.ler()).toBe("gr-barber");
  });

  it("encerrar a sessão do barbeiro limpa token e slug", () => {
    // Duas chaves, um logout: limpar só o token deixaria o slug de uma
    // barbearia sendo lido pela sessão da seguinte.
    sessaoDoBarbeiro.gravar("jwt");
    sessaoDaBarbearia.gravar("gr-barber");

    encerrarSessaoDoBarbeiro();

    expect(sessaoDoBarbeiro.ler()).toBeNull();
    expect(sessaoDaBarbearia.ler()).toBeNull();
  });
```

Acrescente `sessaoDaBarbearia` e `encerrarSessaoDoBarbeiro` ao import do
arquivo de teste.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @gr-barber/web exec vitest run tests/sessao/armazenamento.test.ts`
Expected: FAIL — `sessaoDaBarbearia is not defined`.

- [ ] **Step 3: Implementar**

No fim de `apps/web/src/sessao/armazenamento.ts`:

```ts
// O slug não vem do GET /me, que devolve só barbeariaId — ele chega no
// SessaoBarbeiro do login e do signup, e a tela de novo agendamento
// precisa dele para a disponibilidade, que é rota pública por slug.
export const sessaoDaBarbearia = sessaoNaChave("sessao.barbearia");

// Uma função e não duas chamadas soltas: um logout que esquecesse o
// slug deixaria lixo que a próxima sessão leria como se fosse dela.
export function encerrarSessaoDoBarbeiro(): void {
  sessaoDoBarbeiro.limpar();
  sessaoDaBarbearia.limpar();
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm --filter @gr-barber/web exec vitest run tests/sessao/armazenamento.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/sessao/armazenamento.ts apps/web/tests/sessao/armazenamento.test.ts
git commit -m "feat(web): keep the barbershop slug beside the barber's token

GET /me answers with barbeariaId and no slug, but availability is a
public route addressed by slug, and the panel's new-appointment screen
needs it. The slug arrives once, in the SessaoBarbeiro the login and
signup return, so it is stored next to the token — and a single
encerrarSessaoDoBarbeiro clears both."
```

---

### Task 3: Tema claro e escuro que funciona nos dois grupos

Hoje o escuro só existe dentro de `@media (prefers-color-scheme: dark)`
no `:root`, e nada lê `[data-theme]`. Duas consequências: a troca manual
não tem como existir, e o `data-theme="light"` que
`(publico)/layout.tsx` já põe numa `<div>` não faz nada — o fluxo do
cliente escurece num celular no modo escuro, contra o que a spec do
sub-projeto B decidiu.

**Files:**
- Create: `apps/web/src/painel/tema.ts`
- Create: `apps/web/tests/painel/tema.test.ts`
- Modify: `apps/web/app/tokens-css.ts`
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/app/(publico)/layout.tsx`
- Test: `apps/web/tests/app/tokens-css.test.ts`

**Interfaces:**
- Consumes: `cssDeTokens` (já existe).
- Produces:
  - `type Tema = "claro" | "escuro"`
  - `CHAVE_DO_TEMA = "painel.tema"`
  - `lerTema(): Tema | null`
  - `gravarTema(tema: Tema): void`
  - `aplicarTema(tema: Tema): void` — escreve `data-theme` no `<html>`
  - `temaDoSistema(): Tema`
  - `SCRIPT_DE_TEMA: string` — o conteúdo do `<script>` inline

- [ ] **Step 1: Escrever os testes que falham**

`apps/web/tests/painel/tema.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import {
  aplicarTema,
  CHAVE_DO_TEMA,
  gravarTema,
  lerTema,
  SCRIPT_DE_TEMA,
} from "../../src/painel/tema";

describe("tema do painel", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("sem escolha gravada, lerTema devolve null", () => {
    expect(lerTema()).toBeNull();
  });

  it("grava e lê a escolha", () => {
    gravarTema("escuro");

    expect(localStorage.getItem(CHAVE_DO_TEMA)).toBe("escuro");
    expect(lerTema()).toBe("escuro");
  });

  it("ignora valor estragado no localStorage", () => {
    // Chave editada à mão ou sobrevivente de uma versão anterior não
    // pode virar data-theme="banana" no <html>.
    localStorage.setItem(CHAVE_DO_TEMA, "banana");

    expect(lerTema()).toBeNull();
  });

  it("aplicarTema escreve no <html>, não numa div", () => {
    // O body lê var(--cor-paper) do :root. Custom property redeclarada
    // numa div não chega nele, e o fundo da página ficaria do tema
    // errado em volta do conteúdo certo.
    aplicarTema("escuro");

    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("o script inline decide pelo caminho da URL", () => {
    expect(SCRIPT_DE_TEMA).toContain("/painel");
    expect(SCRIPT_DE_TEMA).toContain("data-theme");
  });
});
```

`apps/web/tests/app/tokens-css.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { cssDeTokens } from "../../app/tokens-css";

describe("css de tokens", () => {
  it("tem o bloco da escolha manual por escuro", () => {
    expect(cssDeTokens).toContain('[data-theme="dark"]');
  });

  it("a media query cede para quem escolheu claro", () => {
    // Sem a guarda, um barbeiro que escolheu claro continua escurecendo
    // num sistema escuro: o @media venceria.
    expect(cssDeTokens).toContain(':root:not([data-theme="light"])');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @gr-barber/web exec vitest run tests/painel/tema.test.ts tests/app/tokens-css.test.ts`
Expected: FAIL — o módulo `tema` não existe e `cssDeTokens` não tem os
seletores.

- [ ] **Step 3: Escrever `src/painel/tema.ts`**

```ts
export type Tema = "claro" | "escuro";

export const CHAVE_DO_TEMA = "painel.tema";

// O atributo é em inglês porque é o que o CSS lê, e o que o resto do
// mundo espera encontrar num data-theme.
const ATRIBUTO: Record<Tema, string> = { claro: "light", escuro: "dark" };

export function lerTema(): Tema | null {
  if (typeof window === "undefined") return null;
  const guardado = window.localStorage.getItem(CHAVE_DO_TEMA);
  return guardado === "claro" || guardado === "escuro" ? guardado : null;
}

export function gravarTema(tema: Tema): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHAVE_DO_TEMA, tema);
}

export function temaDoSistema(): Tema {
  if (typeof window === "undefined") return "claro";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "escuro"
    : "claro";
}

// No <html>, e não numa div do layout do grupo: o body pinta o fundo da
// página lendo var(--cor-paper) do :root, e custom property redeclarada
// numa div não chega até ele.
export function aplicarTema(tema: Tema): void {
  document.documentElement.dataset.theme = ATRIBUTO[tema];
}

// Roda no <head>, antes da primeira pintura — daí ser string e não
// componente. `location.pathname` é a única informação de rota
// disponível antes de o React montar, e é o que evita o pisca.
export const SCRIPT_DE_TEMA = `(function(){try{
  var noPainel = location.pathname === "/painel" || location.pathname.indexOf("/painel/") === 0;
  if (!noPainel) { document.documentElement.dataset.theme = "light"; return; }
  var guardado = localStorage.getItem("${CHAVE_DO_TEMA}");
  var tema = guardado === "claro" || guardado === "escuro" ? guardado : null;
  if (!tema) {
    tema = matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro";
    localStorage.setItem("${CHAVE_DO_TEMA}", tema);
  }
  document.documentElement.dataset.theme = tema === "escuro" ? "dark" : "light";
}catch(e){}})();`;
```

- [ ] **Step 4: Trocar os blocos em `app/tokens-css.ts`**

Substituir a exportação `cssDeTokens` e o comentário acima dela:

```ts
// Três blocos, não dois. Sem a guarda :not([data-theme="light"]), quem
// escolheu claro continua escurecendo num sistema escuro, porque o
// @media venceria. Sem [data-theme="dark"], escolher escuro não faz
// nada num sistema claro. Quem escreve o atributo é o script inline do
// layout raiz — ver src/painel/tema.ts.
export const cssDeTokens = `:root {
${varsDeCores(colors.light)}
${varsDeRaio}
${varsDeEspaco}
${varsDeBorda}
${varsDeTexto}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${varsDeCores(colors.dark)}
  }
}

[data-theme="dark"] {
${varsDeCores(colors.dark)}
}`;
```

- [ ] **Step 5: Pôr o script no layout raiz e tirar a div do público**

Em `apps/web/app/layout.tsx`, dentro do `<head>`, **antes** do
`<style>`:

```tsx
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_DE_TEMA }} />
```

com `import { SCRIPT_DE_TEMA } from "../src/painel/tema";` no topo.

Em `apps/web/app/(publico)/layout.tsx`, trocar o corpo por:

```tsx
import type { ReactNode } from "react";

// O fluxo do cliente é sempre claro, mesmo com o sistema em escuro: é
// uma página que chega por link de WhatsApp pra quem não conhece o
// produto. Quem trava isso é o script de tema do layout raiz, que
// escreve data-theme="light" no <html> em toda rota fora de /painel —
// a <div data-theme> que ficava aqui era inerte, porque o body lê as
// custom properties do :root e não as de uma div.
export default function LayoutPublico({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `pnpm --filter @gr-barber/web exec vitest run tests/painel/tema.test.ts tests/app/tokens-css.test.ts`
Expected: PASS

Run: `pnpm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/painel/tema.ts apps/web/tests/painel/tema.test.ts apps/web/tests/app/tokens-css.test.ts apps/web/app/tokens-css.ts apps/web/app/layout.tsx "apps/web/app/(publico)/layout.tsx"
git commit -m "feat(web): make data-theme actually switch the palette

tokens-css defined dark only inside a media query on :root, so nothing
read data-theme — the public group's data-theme=\"light\" div was inert
and the client flow went dark on a dark-mode phone, the opposite of what
its spec decided. The attribute now goes on <html>, written by an inline
script that decides from location.pathname before first paint, and the
media query yields to an explicit light choice."
```

---

### Task 4: O shell do painel

Guarda, perfil em contexto, navegação, botão de tema, e a árvore de
rotas que o prefixo `/painel` exige. `/painel/entrar` fica fora do
subgrupo guardado — dentro dele, a guarda redirecionaria a tela para ela
mesma.

**Files:**
- Create: `apps/web/src/painel/ProvedorDoPainel.tsx`
- Create: `apps/web/src/painel/SessaoDoPainel.tsx`
- Create: `apps/web/src/painel/NavegacaoDoPainel.tsx`
- Create: `apps/web/src/painel/NavegacaoDoPainel.module.css`
- Create: `apps/web/app/(painel)/painel/(guardado)/layout.tsx`
- Modify: `apps/web/tests/ajudantes/navegacao.ts`
- Modify: `apps/web/tests/setup.ts`
- Test: `apps/web/tests/painel/sessao-do-painel.test.tsx`

**Interfaces:**
- Consumes: `apiDoBarbeiro` (`src/sessao/cliente-da-api.ts`),
  `sessaoDoBarbeiro`, `sessaoDaBarbearia`, `encerrarSessaoDoBarbeiro`
  (Tarefa 2), `lerTema`, `gravarTema`, `aplicarTema`, `temaDoSistema`
  (Tarefa 3).
- Produces:
  - `type ApiDoBarbeiro = ReturnType<typeof apiDoBarbeiro>`
  - `ProvedorDoPainel({ children, valor? }: { children: ReactNode; valor?: ApiDoBarbeiro })`
  - `useApiDoBarbeiro(): ApiDoBarbeiro`
  - `SessaoDoPainel({ children })` — guarda e provê o contexto
  - `usePainel(): { perfil: PerfilBarbeiro; slug: string; sair: () => void }`
  - `NavegacaoDoPainel()` — barra superior
  - `navegacaoFalsa.params: Record<string, string>` e
    `navegacaoFalsa.pathname: string`, ambos reiniciados por
    `redefinir()`

- [ ] **Step 1: Estender o ajudante de navegação**

`apps/web/tests/ajudantes/navegacao.ts` — as rotas do painel têm `[id]`,
e a navegação precisa de `usePathname` para marcar o link ativo:

```ts
import { vi } from "vitest";

// As telas leem a URL pelos hooks do Next, que não existem fora do
// roteador. Este módulo guarda o estado que o mock devolve, e o
// setup.ts é quem faz o vi.mock — o mock precisa ser içado pro topo do
// módulo, e um helper importado não seria içado junto.
export const navegacaoFalsa = {
  slug: "gr-barber",
  // As rotas do painel têm [id]; o slug continua separado porque as
  // telas do cliente o leem por nome.
  params: {} as Record<string, string>,
  pathname: "/",
  query: new URLSearchParams(),
  push: vi.fn((_destino: string) => {}),
  replace: vi.fn((_destino: string) => {}),
  redefinir(
    entrada: {
      slug?: string;
      params?: Record<string, string>;
      pathname?: string;
      query?: Record<string, string>;
    } = {}
  ) {
    this.slug = entrada.slug ?? "gr-barber";
    this.params = entrada.params ?? {};
    this.pathname = entrada.pathname ?? "/";
    this.query = new URLSearchParams(entrada.query ?? {});
    this.push.mockClear();
    this.replace.mockClear();
  },
};
```

Em `apps/web/tests/setup.ts`, o `vi.mock` passa a expor os dois novos:

```ts
vi.mock("next/navigation", () => ({
  useParams: () => ({ slug: navegacaoFalsa.slug, ...navegacaoFalsa.params }),
  useSearchParams: () => navegacaoFalsa.query,
  usePathname: () => navegacaoFalsa.pathname,
  useRouter: () => rotadorFalso,
}));
```

- [ ] **Step 2: Escrever o teste que falha**

`apps/web/tests/painel/sessao-do-painel.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { criarApiClientFalso, ErroDaApi } from "@gr-barber/api-client";
import { ProvedorDoPainel } from "../../src/painel/ProvedorDoPainel";
import { SessaoDoPainel, usePainel } from "../../src/painel/SessaoDoPainel";
import {
  sessaoDaBarbearia,
  sessaoDoBarbeiro,
} from "../../src/sessao/armazenamento";
import { navegacaoFalsa } from "../ajudantes/navegacao";

function Espiao() {
  const { perfil, slug, sair } = usePainel();
  return (
    <div>
      <span>{perfil.nome}</span>
      <span>slug: {slug}</span>
      <button onClick={sair}>Sair</button>
    </div>
  );
}

function montar(falso = criarApiClientFalso()) {
  render(
    <ProvedorDoPainel valor={falso.barbeiro}>
      <SessaoDoPainel>
        <Espiao />
      </SessaoDoPainel>
    </ProvedorDoPainel>
  );
  return falso;
}

describe("sessão do painel", () => {
  beforeEach(() => {
    localStorage.clear();
    navegacaoFalsa.redefinir({ pathname: "/painel" });
  });

  it("sem token, manda pra tela de entrar e não renderiza o conteúdo", async () => {
    montar();

    await waitFor(() =>
      expect(navegacaoFalsa.replace).toHaveBeenCalledWith("/painel/entrar")
    );
    expect(screen.queryByText("Rafael")).not.toBeInTheDocument();
  });

  it("com token, carrega o perfil uma vez e o entrega às telas", async () => {
    sessaoDoBarbeiro.gravar("jwt");
    sessaoDaBarbearia.gravar("gr-barber");

    montar();

    expect(await screen.findByText("Rafael")).toBeInTheDocument();
    expect(screen.getByText("slug: gr-barber")).toBeInTheDocument();
  });

  it("401 no carregamento do perfil encerra a sessão e volta pra entrar", async () => {
    // 401 no meio da sessão é evento normal, não canto raro: o token
    // vale 7 dias e o hook da API consulta o banco a cada requisição.
    sessaoDoBarbeiro.gravar("jwt");
    sessaoDaBarbearia.gravar("gr-barber");
    const falso = criarApiClientFalso();
    falso.barbeiro.meuPerfil = async () => {
      throw new ErroDaApi(401, "nao_autenticado", "");
    };

    montar(falso);

    await waitFor(() => expect(sessaoDoBarbeiro.ler()).toBeNull());
    expect(sessaoDaBarbearia.ler()).toBeNull();
    expect(navegacaoFalsa.replace).toHaveBeenCalledWith("/painel/entrar");
  });

  it("sair limpa as duas chaves", async () => {
    sessaoDoBarbeiro.gravar("jwt");
    sessaoDaBarbearia.gravar("gr-barber");
    montar();

    await userEvent.click(await screen.findByRole("button", { name: "Sair" }));

    expect(sessaoDoBarbeiro.ler()).toBeNull();
    expect(sessaoDaBarbearia.ler()).toBeNull();
    expect(navegacaoFalsa.replace).toHaveBeenCalledWith("/painel/entrar");
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `pnpm --filter @gr-barber/web exec vitest run tests/painel/sessao-do-painel.test.tsx`
Expected: FAIL — os módulos `ProvedorDoPainel` e `SessaoDoPainel` não
existem.

- [ ] **Step 4: Escrever `src/painel/ProvedorDoPainel.tsx`**

Espelha o `ProvedorDaApi` do fluxo do cliente, mas sem slug de rota — o
painel não tem `[slug]` na URL.

```tsx
"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { apiDoBarbeiro } from "../sessao/cliente-da-api";

// Só o escopo do barbeiro: o painel nunca chama rota de cliente logado,
// e expor o client inteiro convidaria a isso.
export type ApiDoBarbeiro = ReturnType<typeof apiDoBarbeiro>;

const Contexto = createContext<ApiDoBarbeiro | null>(null);

// `valor` existe pro teste passar o dublê. Em produção ninguém informa,
// e o provedor monta o client de verdade uma vez só — senão cada render
// criaria outro.
export function ProvedorDoPainel({
  children,
  valor,
}: {
  children: ReactNode;
  valor?: ApiDoBarbeiro;
}) {
  const api = useMemo(() => valor ?? apiDoBarbeiro(), [valor]);

  return <Contexto.Provider value={api}>{children}</Contexto.Provider>;
}

export function useApiDoBarbeiro(): ApiDoBarbeiro {
  const api = useContext(Contexto);
  if (!api) {
    throw new Error("useApiDoBarbeiro precisa estar dentro de um ProvedorDoPainel");
  }
  return api;
}
```

- [ ] **Step 5: Escrever `src/painel/SessaoDoPainel.tsx`**

```tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { ErroDaApi } from "@gr-barber/api-client";
import type { PerfilBarbeiro } from "@gr-barber/types";
import {
  encerrarSessaoDoBarbeiro,
  sessaoDaBarbearia,
  sessaoDoBarbeiro,
} from "../sessao/armazenamento";
import { useApiDoBarbeiro } from "./ProvedorDoPainel";

interface Painel {
  perfil: PerfilBarbeiro;
  slug: string;
  sair: () => void;
}

const Contexto = createContext<Painel | null>(null);

// A guarda vive aqui e não em cada tela: guarda por repetição depende de
// ninguém esquecer o hook, e quem esquecesse publicaria a tela sem
// sessão em silêncio. É o mesmo motivo de o app.ts da API usar escopo
// com onRequest em vez de pendurar o hook rota a rota.
export function SessaoDoPainel({ children }: { children: ReactNode }) {
  const router = useRouter();
  const api = useApiDoBarbeiro();
  const [perfil, setPerfil] = useState<PerfilBarbeiro | null>(null);

  const sair = useCallback(() => {
    encerrarSessaoDoBarbeiro();
    router.replace("/painel/entrar");
  }, [router]);

  useEffect(() => {
    if (!sessaoDoBarbeiro.ler()) {
      router.replace("/painel/entrar");
      return;
    }

    let vivo = true;
    api
      .meuPerfil()
      .then((resposta) => {
        if (vivo) setPerfil(resposta);
      })
      .catch((causa: unknown) => {
        if (!vivo) return;
        // Qualquer falha ao provar quem é o chamador termina do mesmo
        // jeito: sem perfil não há painel. O 401 é o caso comum — o
        // token vale 7 dias e o hook da API consulta o banco a cada
        // requisição, então desativar um barbeiro invalida na hora.
        if (causa instanceof ErroDaApi) sair();
        else sair();
      });

    return () => {
      vivo = false;
    };
  }, [api, router, sair]);

  // Nada renderiza antes do perfil: uma tela que aparecesse e sumisse
  // seria pior do que uma que demora.
  if (!perfil) return null;

  return (
    <Contexto.Provider
      value={{ perfil, slug: sessaoDaBarbearia.ler() ?? "", sair }}
    >
      {children}
    </Contexto.Provider>
  );
}

export function usePainel(): Painel {
  const painel = useContext(Contexto);
  if (!painel) {
    throw new Error("usePainel precisa estar dentro de um SessaoDoPainel");
  }
  return painel;
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `pnpm --filter @gr-barber/web exec vitest run tests/painel/sessao-do-painel.test.tsx`
Expected: PASS

- [ ] **Step 7: Escrever a navegação**

`apps/web/src/painel/NavegacaoDoPainel.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { aplicarTema, gravarTema, lerTema, temaDoSistema, type Tema } from "./tema";
import { usePainel } from "./SessaoDoPainel";
import estilos from "./NavegacaoDoPainel.module.css";

const LINKS = [
  { href: "/painel", rotulo: "Hoje" },
  { href: "/painel/agenda", rotulo: "Agenda" },
  { href: "/painel/clientes", rotulo: "Clientes" },
  { href: "/painel/servicos", rotulo: "Serviços" },
  { href: "/painel/configuracoes", rotulo: "Configurações" },
];

export function NavegacaoDoPainel() {
  const { slug, sair } = usePainel();
  const caminho = usePathname();
  const [tema, setTema] = useState<Tema>("claro");

  // O script do <head> já pintou; isto só põe o React em dia com o que
  // está no <html>, pra o botão mostrar o rótulo certo.
  useEffect(() => setTema(lerTema() ?? temaDoSistema()), []);

  function trocarTema() {
    const proximo: Tema = tema === "claro" ? "escuro" : "claro";
    setTema(proximo);
    gravarTema(proximo);
    aplicarTema(proximo);
  }

  return (
    <header className={estilos.barra}>
      <strong className={estilos.marca}>{slug}</strong>
      <nav className={estilos.links}>
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            // O "Hoje" é /painel exato: com startsWith, ele ficaria
            // ativo em todas as rotas do painel ao mesmo tempo.
            aria-current={
              (link.href === "/painel" ? caminho === link.href : caminho.startsWith(link.href))
                ? "page"
                : undefined
            }
          >
            {link.rotulo}
          </Link>
        ))}
      </nav>
      <button type="button" onClick={trocarTema}>
        {tema === "claro" ? "Modo escuro" : "Modo claro"}
      </button>
      <button type="button" onClick={sair}>
        Sair
      </button>
    </header>
  );
}
```

`apps/web/src/painel/NavegacaoDoPainel.module.css`:

```css
.barra {
  display: flex;
  align-items: center;
  gap: var(--espaco-md);
  padding: var(--espaco-md) var(--espaco-lg);
  border-bottom: var(--borda-media) solid var(--cor-ink);
  background: var(--cor-paper);
}

.marca {
  font-family: var(--fonte-display), system-ui, sans-serif;
  font-size: var(--texto-lg);
}

.links {
  display: flex;
  gap: var(--espaco-md);
  margin-inline-end: auto;
}

.links a[aria-current="page"] {
  text-decoration: underline;
}
```

Se algum nome de token não existir em `packages/design-tokens`, use o
que existir — confira `packages/design-tokens/src/index.ts` antes de
escrever, não invente escala.

- [ ] **Step 8: Escrever o layout guardado**

`apps/web/app/(painel)/painel/(guardado)/layout.tsx`:

```tsx
import type { ReactNode } from "react";

import { NavegacaoDoPainel } from "../../../../src/painel/NavegacaoDoPainel";
import { ProvedorDoPainel } from "../../../../src/painel/ProvedorDoPainel";
import { SessaoDoPainel } from "../../../../src/painel/SessaoDoPainel";

// O subgrupo (guardado) não entra no caminho: este layout vale de
// /painel pra baixo, menos /painel/entrar, que fica fora dele de
// propósito — lá dentro a guarda redirecionaria a tela pra ela mesma.
export default function LayoutGuardado({ children }: { children: ReactNode }) {
  return (
    <ProvedorDoPainel>
      <SessaoDoPainel>
        <NavegacaoDoPainel />
        <main>{children}</main>
      </SessaoDoPainel>
    </ProvedorDoPainel>
  );
}
```

Antes de escrever, confirme a forma dos route groups aninhados na
documentação instalada — `apps/web/AGENTS.md` manda ler
`node_modules/next/dist/docs/` porque este Next difere do que o modelo
aprendeu.

- [ ] **Step 9: Rodar a suíte e o type-check**

Run: `pnpm test`
Expected: PASS — inclusive os testes do sub-projeto B, que o
`navegacao.ts` alterado atravessa.

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/painel apps/web/app/\(painel\) apps/web/tests/ajudantes/navegacao.ts apps/web/tests/setup.ts apps/web/tests/painel/sessao-do-painel.test.tsx
git commit -m "feat(web): guard the panel in one place

The layout of the (guardado) subgroup redirects to /painel/entrar when
there is no token, loads the profile once, and puts it plus the slug in
context. Per-screen guards would depend on nobody forgetting the hook,
and whoever forgot would publish a screen without a session in silence —
the same reason the API's app.ts uses a scope with onRequest instead of
hanging the hook route by route."
```

---

### Task 5: `/painel/entrar` — entrar e criar barbearia

Duas ações explícitas na mesma tela, como a tela de entrar do cliente.
A de criar barbearia não está no `docs/screens.md`: como C vem antes de
D, entre o fim deste sub-projeto e o do próximo o painel é o único
caminho pelo qual uma barbearia pode existir.

**Files:**
- Create: `apps/web/src/telas/painel/EntrarNoPainel.tsx`
- Create: `apps/web/src/telas/painel/EntrarNoPainel.module.css`
- Create: `apps/web/app/(painel)/painel/entrar/page.tsx`
- Test: `apps/web/tests/telas/painel/entrar-no-painel.test.tsx`

**Interfaces:**
- Consumes: `ProvedorDoPainel`, `useApiDoBarbeiro` (Tarefa 4),
  `sessaoDoBarbeiro`, `sessaoDaBarbearia` (Tarefa 2), `Botao`, `Campo`,
  `Aviso`.
- Produces: `EntrarNoPainel()`.

- [ ] **Step 1: Escrever o teste que falha**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { criarApiClientFalso, ErroDaApi } from "@gr-barber/api-client";
import { ProvedorDoPainel } from "../../../src/painel/ProvedorDoPainel";
import { EntrarNoPainel } from "../../../src/telas/painel/EntrarNoPainel";
import {
  sessaoDaBarbearia,
  sessaoDoBarbeiro,
} from "../../../src/sessao/armazenamento";
import { navegacaoFalsa } from "../../ajudantes/navegacao";

function montar(falso = criarApiClientFalso()) {
  render(
    <ProvedorDoPainel valor={falso.barbeiro}>
      <EntrarNoPainel />
    </ProvedorDoPainel>
  );
  return falso;
}

describe("entrar no painel", () => {
  beforeEach(() => {
    localStorage.clear();
    navegacaoFalsa.redefinir({ pathname: "/painel/entrar" });
  });

  it("entra e guarda token e slug", async () => {
    montar();

    await userEvent.type(screen.getByLabelText(/e-mail/i), "rafael@gr.com");
    await userEvent.type(screen.getByLabelText(/^senha/i), "segredo123");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(sessaoDoBarbeiro.ler()).toBe("jwt-falso-barbeiro"));
    // O slug é o que a tela de novo agendamento vai usar pra chamar a
    // disponibilidade, que é rota pública por slug.
    expect(sessaoDaBarbearia.ler()).toBe("gr-barber");
    expect(navegacaoFalsa.push).toHaveBeenCalledWith("/painel");
  });

  it("traduz nao_autenticado em email ou senha incorretos", async () => {
    const falso = criarApiClientFalso();
    falso.barbeiro.login = async () => {
      throw new ErroDaApi(401, "nao_autenticado", "");
    };
    montar(falso);

    await userEvent.type(screen.getByLabelText(/e-mail/i), "rafael@gr.com");
    await userEvent.type(screen.getByLabelText(/^senha/i), "errada12");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText(/e-mail ou senha incorretos/i)).toBeInTheDocument();
  });

  it("cria a barbearia e entra com o slug enviado", async () => {
    montar();

    await userEvent.click(screen.getByRole("button", { name: /criar barbearia/i }));
    await userEvent.type(screen.getByLabelText(/nome da barbearia/i), "Barbearia do Zé");
    await userEvent.type(screen.getByLabelText(/endereço do link/i), "barbearia-do-ze");
    await userEvent.type(screen.getByLabelText(/seu nome/i), "Zé");
    await userEvent.type(screen.getByLabelText(/e-mail/i), "ze@barbearia.com");
    await userEvent.type(screen.getByLabelText(/^senha/i), "segredo123");
    await userEvent.click(screen.getByRole("button", { name: /criar e entrar/i }));

    await waitFor(() => expect(sessaoDaBarbearia.ler()).toBe("barbearia-do-ze"));
    expect(navegacaoFalsa.push).toHaveBeenCalledWith("/painel");
  });

  it("recusa slug fora do formato antes de chamar a API", async () => {
    // A API responde 400 do pattern ^[a-z0-9-]{3,80}$; barrar aqui
    // mantém o erro no campo em vez de virar aviso genérico.
    const falso = criarApiClientFalso();
    let chamou = false;
    falso.barbeiro.signup = async () => {
      chamou = true;
      throw new ErroDaApi(400, "requisicao_invalida", "");
    };
    montar(falso);

    await userEvent.click(screen.getByRole("button", { name: /criar barbearia/i }));
    await userEvent.type(screen.getByLabelText(/nome da barbearia/i), "Barbearia do Zé");
    await userEvent.type(screen.getByLabelText(/endereço do link/i), "Zé Barbearia!");
    await userEvent.type(screen.getByLabelText(/seu nome/i), "Zé");
    await userEvent.type(screen.getByLabelText(/e-mail/i), "ze@barbearia.com");
    await userEvent.type(screen.getByLabelText(/^senha/i), "segredo123");
    await userEvent.click(screen.getByRole("button", { name: /criar e entrar/i }));

    expect(await screen.findByText(/letras minúsculas, números e hífen/i)).toBeInTheDocument();
    expect(chamou).toBe(false);
  });

  it("traduz conflito sem dizer qual dos dois campos repetiu", async () => {
    // A dívida do 409 já é conhecida; a tela não a amplia dizendo se foi
    // o e-mail ou o endereço.
    const falso = criarApiClientFalso();
    falso.barbeiro.signup = async () => {
      throw new ErroDaApi(409, "conflito", "");
    };
    montar(falso);

    await userEvent.click(screen.getByRole("button", { name: /criar barbearia/i }));
    await userEvent.type(screen.getByLabelText(/nome da barbearia/i), "Barbearia do Zé");
    await userEvent.type(screen.getByLabelText(/endereço do link/i), "barbearia-do-ze");
    await userEvent.type(screen.getByLabelText(/seu nome/i), "Zé");
    await userEvent.type(screen.getByLabelText(/e-mail/i), "ze@barbearia.com");
    await userEvent.type(screen.getByLabelText(/^senha/i), "segredo123");
    await userEvent.click(screen.getByRole("button", { name: /criar e entrar/i }));

    expect(
      await screen.findByText(/e-mail ou esse endereço já está em uso/i)
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @gr-barber/web exec vitest run tests/telas/painel/entrar-no-painel.test.tsx`
Expected: FAIL — `EntrarNoPainel` não existe.

- [ ] **Step 3: Implementar a tela**

`apps/web/src/telas/painel/EntrarNoPainel.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ErroDaApi } from "@gr-barber/api-client";
import type { SessaoBarbeiro } from "@gr-barber/types";
import { Aviso } from "../../componentes/Aviso";
import { Botao } from "../../componentes/Botao";
import { Campo } from "../../componentes/Campo";
import { useApiDoBarbeiro } from "../../painel/ProvedorDoPainel";
import {
  sessaoDaBarbearia,
  sessaoDoBarbeiro,
} from "../../sessao/armazenamento";
import estilos from "./EntrarNoPainel.module.css";

// O mesmo do pattern de apps/api/src/routers/auth.ts:23. Barrar aqui
// mantém o erro no campo, em vez de voltar 400 do AJV em inglês.
const PADRAO_SLUG = /^[a-z0-9-]{3,80}$/;

export function EntrarNoPainel() {
  const router = useRouter();
  const api = useApiDoBarbeiro();

  const [criando, setCriando] = useState(false);
  const [nomeDaBarbearia, setNomeDaBarbearia] = useState("");
  const [slug, setSlug] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erroSlug, setErroSlug] = useState<string | undefined>();
  const [aviso, setAviso] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);

  async function submeter() {
    setAviso(undefined);
    setErroSlug(undefined);

    if (criando && !PADRAO_SLUG.test(slug)) {
      setErroSlug("Use letras minúsculas, números e hífen, de 3 a 80 caracteres");
      return;
    }

    setEnviando(true);

    let sessao: SessaoBarbeiro | undefined;
    try {
      sessao = criando
        ? await api.signup({
            barbearia: { nome: nomeDaBarbearia.trim(), slug },
            barbeiro: { nome: nome.trim(), email, senha },
          })
        : await api.login({ email, senha });
    } catch (causa) {
      const erro = causa as ErroDaApi;
      if (erro.codigo === "nao_autenticado") {
        setAviso("E-mail ou senha incorretos.");
      } else if (erro.codigo === "conflito") {
        // Sem dizer qual dos dois: a sondagem que o 409 já permite é
        // dívida conhecida, e não vale ampliá-la na tela.
        setAviso("Esse e-mail ou esse endereço já está em uso.");
      } else {
        setAviso(erro.mensagem || "Não foi possível continuar agora.");
      }
    }

    setEnviando(false);

    // Fora do try: falha ao guardar não é recusa da API, e mostrá-la
    // como tal mandaria a pessoa duvidar da senha que estava certa.
    if (sessao) {
      sessaoDoBarbeiro.gravar(sessao.token);
      sessaoDaBarbearia.gravar(sessao.barbearia.slug);
      router.push("/painel");
    }
  }

  return (
    <main className={estilos.pagina}>
      <h1>{criando ? "Criar barbearia" : "Entrar no painel"}</h1>

      {criando ? (
        <>
          <Campo
            rotulo="Nome da barbearia"
            valor={nomeDaBarbearia}
            onChange={setNomeDaBarbearia}
          />
          <Campo
            rotulo="Endereço do link"
            valor={slug}
            onChange={(proximo) => {
              setSlug(proximo);
              setErroSlug(undefined);
            }}
            erro={erroSlug}
          />
          {/* É este endereço que vai no WhatsApp; mostrar o resultado
              evita descobrir depois que ficou errado. */}
          <p className={estilos.previa}>O link dos seus clientes: /{slug || "sua-barbearia"}</p>
          <Campo rotulo="Seu nome" valor={nome} onChange={setNome} />
        </>
      ) : null}

      <Campo rotulo="E-mail" type="email" valor={email} onChange={setEmail} />
      <Campo rotulo="Senha" type="password" valor={senha} onChange={setSenha} />

      {aviso ? <Aviso>{aviso}</Aviso> : null}

      <div className={estilos.acoes}>
        <Botao carregando={enviando} onClick={submeter}>
          {criando ? "Criar e entrar" : "Entrar"}
        </Botao>
        <Botao
          variante="contorno"
          onClick={() => {
            setCriando((atual) => !atual);
            setAviso(undefined);
            setErroSlug(undefined);
          }}
        >
          {criando ? "Já tenho conta" : "Criar barbearia"}
        </Botao>
      </div>
    </main>
  );
}
```

`EntrarNoPainel.module.css` — siga o padrão de
`src/telas/Entrar.module.css`, com `.pagina`, `.acoes` e `.previa`.

`apps/web/app/(painel)/painel/entrar/page.tsx`:

```tsx
"use client";

import { ProvedorDoPainel } from "../../../../src/painel/ProvedorDoPainel";
import { EntrarNoPainel } from "../../../../src/telas/painel/EntrarNoPainel";

// Fora do subgrupo (guardado) de propósito: lá dentro a guarda
// redirecionaria esta tela pra ela mesma. Por isso o provedor é montado
// aqui, e não herdado do layout.
export default function Pagina() {
  return (
    <ProvedorDoPainel>
      <EntrarNoPainel />
    </ProvedorDoPainel>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm --filter @gr-barber/web exec vitest run tests/telas/painel/entrar-no-painel.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/telas/painel apps/web/app/\(painel\)/painel/entrar apps/web/tests/telas/painel/entrar-no-painel.test.tsx
git commit -m "feat(web): let a barber sign in and create a barbershop

Creating a barbershop is on no screen of the map, which puts first
access on the Expo app's login. C ships before D, so until then the
panel is the only way a barbershop can come into existence — the same
shape as the client flow's eighth screen. The slug is validated against
the API's own pattern before the call, so a bad address stays an error
on its field instead of a 400 in English."
```

---

O plano continua nas tarefas 6 a 13 — dashboard, agenda, novo
agendamento, detalhe, clientes, serviços, configurações e limpeza.
