# TODO List — GovTI (PSI Energy)

Esta lista é baseada no blueprint do GovTI: React SPA + Tailwind (dark/brandGreen), Node/Express, Sequelize, Postgres, importações (CSV + OCR), rastreabilidade (audit logs) e regras anti-duplicação + transações.

## MVP (Base do sistema)
- [ ] **Estruturar apps**
  - [ ] Frontend React (SPA) com Tailwind (dark mode padrão) + `lucide-react` + `sweetalert2`
  - [ ] Backend Node/Express com Sequelize + Postgres
  - [ ] Axios padronizado no frontend (baseURL + interceptors de erro)

- [ ] **Autenticação e perfis**
  - [ ] Tabela `users` (roles) e rotas de autenticação (login/logout/refresh se aplicável)
  - [ ] Guardas de rota no frontend (acesso por papel)

## Banco de dados (modelo relacional normalizado)
- [ ] **Ajustar/confirmar schema MySQL/InnoDB**
  - [ ] `employees` (único por email; status; dados de offboarding)
  - [ ] `assets` (pai: `asset_type`, `status`, timestamps)
  - [ ] Filhas por tipo: `asset_notebooks`, `asset_celulares`, `asset_chips`, `asset_starlinks` (1:1 com `assets` via FK e `ON DELETE CASCADE`)
  - [ ] `asset_assignments` (histórico N:M: `assigned_at`, `returned_at`, `pdf_term_url`)
  - [ ] `licenses` e `employee_licenses`
  - [ ] `contracts` (medições: previsto x realizado + mês_competencia)
  - [ ] `audit_logs` (CREATE/UPDATE/DELETE/IMPORT)

- [ ] **Índices e unicidades (anti-duplicação)**
  - [ ] `employees.email` UNIQUE
  - [ ] Notebook: `patrimonio` UNIQUE e `serial_number` UNIQUE
  - [ ] Celular: `imei` UNIQUE
  - [ ] CHIP: `numero` UNIQUE e `iccid` UNIQUE

## Backend (Express + Sequelize)
- [ ] **Padrões de transação**
  - [ ] Criar helper/padrão `sequelize.transaction()` para operações compostas (ativo pai + filha + atribuição + audit)
  - [ ] Garantir rollback se qualquer etapa falhar

- [ ] **CRUDs principais**
  - [ ] `employees`: criar/editar/desativar + busca/filtros
  - [ ] `assets`: criar/editar/status + detalhes por tipo
  - [ ] `asset_assignments`: atribuir/devolver (com timestamps consistentes)
  - [ ] `licenses` + `employee_licenses`: catálogo e vínculo/desvínculo
  - [ ] `contracts`: criar + medições + filtros por competência/fornecedor

- [ ] **Audit logs (rastreabilidade total)**
  - [ ] Middleware/serviço para registrar ações (CREATE/UPDATE/DELETE/IMPORT)
  - [ ] Estrutura: actor (user), entidade, antes/depois, timestamp, origem (UI/IMPORT/API)

- [ ] **Rotas bulk (mitigar timeout/429)**
  - [ ] `POST /api/assets/bulk` (arrays grandes, processamento otimizado)
  - [ ] `POST /api/employees/bulk`
  - [ ] `POST /api/licenses/bulk` e `POST /api/licenses/link/bulk`
  - [ ] `POST /api/contracts/bulk`

## Frontend (UI/UX dark + brandGreen)
- [ ] **Base visual**
  - [ ] Tema dark consistente (`bg-gray-900`/`bg-black`) + componentes `rounded-2xl/3xl`
  - [ ] Classes `text-brandGreen` e `bg-brandGreen` para ações primárias
  - [ ] Tabelas com `divide-gray-800`, transições (`hover:-translate-y-1`, `animate-fade-in`)
  - [ ] Modais “glass” (`backdrop-blur-sm`, `bg-black/80`)

- [ ] **Padrão de robustez (Fallback de case)**
  - [ ] Utilitário/abordagem para leitura resiliente (ex: `asset.Notebook || asset.notebook`)
  - [ ] Normalização de payloads no client antes de renderizar

- [ ] **Telas**
  - [ ] Colaboradores (lista + detalhe + offboarding)
  - [ ] Ativos (lista + detalhe por tipo)
  - [ ] Atribuições (histórico e status “Em uso/Disponível/Manutenção”)
  - [ ] Licenças (catálogo e vínculos)
  - [ ] Contratos (medições e filtros por competência)
  - [ ] Audit Logs (filtros por ação/entidade/período)

## Termo de responsabilidade (PDF)
- [ ] **Gerar PDF na atribuição**
  - [ ] jsPDF + `jspdf-autotable` com dados dinâmicos do hardware
  - [ ] Armazenar/retornar `pdf_term_url` e exibir link/ação na UI

## Offboarding (regra obrigatória)
- [ ] **Checklist visual + URL obrigatória**
  - [ ] Checklist: Onfly, MegaERP, Admin365, Equipamentos devolvidos
  - [ ] Campo obrigatório: URL do termo assinado (Drive/OneDrive)
  - [ ] Bloquear ação de offboarding se checklist incompleto ou sem URL

## Importações (ETL) — CSV (PapaParse)
- [ ] **Leitura e pré-processamento**
  - [ ] Upload local
  - [ ] Higienização de headers (remover BOM UTF-8, aspas, espaços)
  - [ ] Preview antes de confirmar

- [ ] **Tipos de lote**
  - [ ] Colaboradores
  - [ ] Notebooks
  - [ ] Celulares
  - [ ] CHIPs
  - [ ] Starlinks
  - [ ] Medições de contratos
  - [ ] Licenças (cadastro)
  - [ ] Vínculos de licenças

- [ ] **Envio otimizado**
  - [ ] Preferir 1 requisição bulk por tipo (quando possível)
  - [ ] Alternativa: loop assíncrono controlado (preservar ordem e auto-assign por e-mail)
  - [ ] Registrar ação `IMPORT` em `audit_logs`

## Importações — OCR de PDFs (Contratos)
- [ ] **Endpoint**
  - [ ] `POST /api/contracts/analyze-pdf`
  - [ ] Extração via Regex: valores monetários, fornecedor (ex: DELL), mês de competência
  - [ ] Criar registros automaticamente em `contracts` + audit `IMPORT`

## Qualidade, segurança e operação
- [ ] **Validações e erros**
  - [ ] Mensagens claras de duplicidade (email/patrimônio/serial/imei/número/iccid)
  - [ ] Tratamento padronizado de erros no backend (códigos HTTP + payload consistente)

- [ ] **Performance**
  - [ ] Paginação e filtros server-side para listas grandes
  - [ ] Índices adicionais conforme consultas reais (assets por status/tipo; assignments por employee/asset)

## Roadmap (futuras features)
- [ ] **Dashboard executivo**
  - [ ] TCO do parque
  - [ ] Consumo de licenças vs contratado
  - [ ] % medições acima do previsto

- [ ] **Alertas de vencimento (cron)**
  - [ ] CHIPs vencendo
  - [ ] Garantia de notebooks expirando
  - [ ] Contratos para renovação

- [ ] **AD/SSO Microsoft 365**
- [ ] **Integração GLPI/Zendesk**
  - [ ] Abrir chamados automaticamente ao marcar ativo como “Manutenção”

