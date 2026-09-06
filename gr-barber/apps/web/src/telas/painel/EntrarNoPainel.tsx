"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ErroDaApi } from "@gr-barber/api-client";
import type { SessaoBarbeiro } from "@gr-barber/types";
import { Aviso } from "../../componentes/Aviso";
import { Botao } from "../../componentes/Botao";
import { Campo } from "../../componentes/Campo";
import { useApiDoPainel } from "../../painel/ProvedorDoPainel";
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
  const api = useApiDoPainel();

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
        ? await api.barbeiro.signup({
            barbearia: { nome: nomeDaBarbearia.trim(), slug },
            barbeiro: { nome: nome.trim(), email, senha },
          })
        : await api.barbeiro.login({ email, senha });
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
