# 🛡️ GovTI (Sistema de Governança de TI e FinOps)

Um sistema corporativo (ERP) robusto desenvolvido para a gestão centralizada de ativos físicos de TI, controle de licenças de software (FinOps) e governança do ciclo de vida de colaboradores (Onboarding e Offboarding).

## 🚀 Principais Funcionalidades

O sistema foi desenhado com regras de negócio rígidas para garantir a integridade dos dados e a rastreabilidade das operações de TI.

### 💻 1. Inventário Físico (Hardwares)
* Gestão completa de **Notebooks, Celulares, CHIPs Corporativos e Antenas Starlink**.
* **Regras de Unicidade:** Bloqueio no banco de dados e na API contra o cadastro de Serial Numbers ou números de Patrimônio duplicados.
* **Histórico de Atribuições:** Rastreabilidade total (quem usou, quando pegou e quando devolveu).

### 💳 2. Gestão de Licenças e FinOps
* Controle de subscrições de softwares (Microsoft 365, Adobe, etc).
* Visão de custos fixos recorrentes (Mensal e Anual).
* Controle de esgotamento de licenças (bloqueia a atribuição se a quantidade paga for excedida).
* Painel que exibe quais usuários estão consumindo cada licença.
* Alerta de **Data de Renovação**.

### 👥 3. Gestão de Colaboradores (Painel 360º)
* Arquitetura de vínculo **1-para-N** (um colaborador pode ter múltiplos aparelhos e licenças simultaneamente).
* **Painel Consolidado:** Interface única para visualizar dados do usuário, entregar/remover hardwares e conceder/revogar licenças de software com um clique.

### 🚪 4. Offboarding Inteligente e Seguro
* **Automação de Desligamento:** Ao inativar um colaborador, o sistema *automaticamente* varre o banco de dados, remove todos os hardwares e licenças atrelados a ele e os devolve para o estoque como "Disponível".
* Checklist de revogação de acessos (Onfly, ADM 365, etc).
* Armazenamento seguro da URL do **Termo de Devolução (PDF)**.

### 🔧 5. Manutenção e Auditoria
* Abertura de chamados e logs de manutenção integrados aos equipamentos.
* **Câmera de Segurança (Triggers SQL):** O banco de dados PostgreSQL possui gatilhos nativos (`audit_logs`) que gravam silenciosamente qualquer alteração estrutural, garantindo conformidade com políticas de segurança da informação.

---

## 🛠️ Tecnologias Utilizadas

**Backend:**
* [Go (Golang)](https://go.dev/) - Alta performance e concorrência.
* [Gin Web Framework](https://gin-gonic.com/) - Roteamento RESTful.
* [GORM](https://gorm.io/) - ORM para interação com o banco de dados.

**Frontend:**
* [React](https://react.dev/) + [Vite](https://vitejs.dev/) - Interface rápida e reativa.
* [Tailwind CSS](https://tailwindcss.com/) - Estilização moderna e responsiva.
* [Lucide React](https://lucide.dev/) - Biblioteca de ícones.

**Infraestrutura & Banco de Dados:**
* [PostgreSQL](https://www.postgresql.org/) - Banco de dados relacional.
* [Docker & Docker Compose](https://www.docker.com/) - Containerização do ambiente de dados.

---

## ⚙️ Como executar o projeto localmente

### Pré-requisitos
Certifique-se de ter instalado em sua máquina:
* [Docker Desktop](https://www.docker.com/products/docker-desktop/)
* [Go (1.20+)](https://go.dev/dl/)
* [Node.js (18+)](https://nodejs.org/)

### Passo a Passo

**1. Subir o Banco de Dados:**
Na raiz do projeto, inicie o container do PostgreSQL:
```bash
docker-compose up -d