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

## Painel web (6 telas)

Login, Dashboard, Agenda, Clientes, Serviços, Configurações da
barbearia — mesma função das telas mobile, layout mais largo.
