# Telas mapeadas

23 telas ao todo, em três grupos. O visual de cada uma está em
`docs/design-system.html` (abra no navegador — inclui toggle de
modo escuro pro app do barbeiro e pro painel).

## App do barbeiro (10 telas)

| Tela | O que faz |
|---|---|
| Login / cadastro | Autenticação; primeiro acesso também cadastra a Barbearia |
| Dashboard do dia | Resumo dos agendamentos de hoje, atalho pra novo agendamento |
| Agenda | Visão semanal/mensal, navegação entre dias |
| Novo agendamento | Criação manual (walk-in, telefone) — usa o mesmo motor de disponibilidade |
| Detalhe do agendamento | Editar, concluir, cancelar |
| Clientes | Lista com busca |
| Cadastro de cliente | Dados + histórico de agendamentos |
| Serviços | Lista com preço/duração |
| Cadastro de serviço | Nome, duração, preço |
| Configurações | Perfil, horário de funcionamento, canal de lembrete |

## Fluxo do cliente (7 telas — web público + app opcional)

| Tela | O que faz |
|---|---|
| Perfil da barbearia | Landing pública, ponto de entrada do link do WhatsApp |
| Escolha dos serviços | Checklist com soma de duração em tempo real |
| Escolha da data | Calendário — dias sem horário suficiente ficam desabilitados |
| Escolha do horário | Só mostra horários calculados como disponíveis |
| Dados do cliente | Nome + telefone (pulado se já logado no app opcional) |
| Confirma e agenda | Resumo final, confirma, dispara lembrete |
| Meus agendamentos | Só no app opcional — histórico, cancelar/remarcar |

## Painel web (12 rotas)

O mapa previa seis telas — Login, Dashboard, Agenda, Clientes, Serviços
e Configurações. São doze rotas, por duas razões.

Quatro são telas que este mapa deu ao app do barbeiro e não ao painel,
para a mesma função: detalhe do agendamento, novo agendamento, cadastro
de cliente e cadastro de serviço.

A décima segunda o mapa não tem em lugar nenhum: **criar barbearia**. O
primeiro acesso estava na tela de login do app do barbeiro, que é o
sub-projeto D; como o painel veio antes, ele é o único caminho pelo qual
uma barbearia pode existir.

| Rota | O que faz |
|---|---|
| `/painel/entrar` | Entrar, e criar a barbearia no primeiro acesso |
| `/painel` | Dashboard: contagem, ocupação, previsto e a lista do dia |
| `/painel/agenda` | O dia em faixas, com a semana em cima |
| `/painel/agendamentos/novo` | Cliente, serviços, data e horário numa tela |
| `/painel/agendamentos/[id]` | Status e observações |
| `/painel/clientes` | Lista com busca na URL |
| `/painel/clientes/novo` | Nome, telefone e email |
| `/painel/clientes/[id]` | Dados e histórico |
| `/painel/servicos` | Lista, inativos inclusive |
| `/painel/servicos/novo` | Nome, duração e preço |
| `/painel/servicos/[id]` | Editar, desativar e reativar |
| `/painel/configuracoes` | Barbearia, horários da semana e perfil |

O prefixo `/painel` existe porque o slug da barbearia não tem lista de
reservados: uma rota estática na raiz tornaria aquele slug inalcançável.
