PREVENÇÃO DE VENCIMENTOS — V3.3

Esta V3 foi construída sobre a V2 e faz migração automática dos registros locais da chave prevencao_vencimentos_v2 para a estrutura V3.

PRINCIPAIS MUDANÇAS
- Cadastro usa apenas CORREDOR. Não há Seção nem Lado.
- Loja começa com 18 corredores, editáveis pelo administrador.
- Batida: um corredor por vez.
- Recomendação automática: corredor com maior tempo desde a última batida.
- É possível fazer outro corredor sem alterar a prioridade do recomendado.
- Batidas registram data/hora, corredor, responsável e quantidade de produtos.
- Produto registra a validade crítica encontrada; não exige cadastrar validade distante.
- Foto direta pela câmera/galeria com compressão local.
- Status: Encontrado; Ainda no corredor; Separado; Aguardando oferta; Oferta solicitada; Oferta aplicada; Resolvido.
- Lista de produtos com miniatura e seleção múltipla para mudança de status em lote.
- Controle de quantidade encontrada e ajuste posterior.
- Alertas no painel e suporte à permissão de notificações do navegador.
- Escala de equipe para decidir quem recebe alertas, sem bloquear usuários.
- Histórico de batidas e relatórios com filtro de período e impressão/Salvar como PDF.
- Aba Vencimentos: hoje, amanhã, próximos 7 dias e vencidos.
- Aba Hoje: registros do dia, responsável, origem (batida/manual) e filtros.
- Relatório com produtos do período e opção Gerar / Salvar PDF pelo navegador.
- Backup V3 em JSON.

EQUIPE INICIAL
Ramon — Pleno 2 — administrador
Luan — Pleno 1 — operador
Wagner — Chefe — operador

IMPORTANTE SOBRE SINCRONIZAÇÃO
A V3.3 entregue neste pacote ainda usa armazenamento local do navegador. Ela não sincroniza automaticamente entre Androids e computador. A estrutura foi separada para permitir a próxima etapa de nuvem compartilhada. Para ativar sincronização real, será necessário configurar um serviço de banco/conta compartilhada e suas credenciais.

ATUALIZAÇÃO SEGURA
1. Exporte o backup antes de atualizar.
2. Não apague o backup.
3. Futuras versões devem manter a chave/estrutura de dados ou executar migração explícita.
