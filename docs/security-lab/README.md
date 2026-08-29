# BarberLab Security Lab

> ⚠️ **IMPORTANTE**: Este é um **Security Lab educacional**. A variante
> VULNERÁVEL contém **vulnerabilidades deliberadas** para testes autorizados
> apenas.

## 1. O que é o BarberLab

### Objetivo do Projeto

BarberLab é um sistema de gestão de barbearia construído como um **Security
Lab** com duas variantes:

- **SECURE** — Implementação segura com práticas de segurança adequadas (branch
  principal de desenvolvimento)
- **VULNERÁVEL** — Vulnerabilidades controladas para teste de ferramentas de
  segurança e educação

### Objetivo Educacional

O objetivo é demonstrar, de forma reproduzível, como vulnerabilidades comuns se
manifestam em aplicações reais e como as práticas seguras as previnem. Cada
vulnerabilidade possui:

- Implementação vulnerável isolada
- Implementação segura correspondente
- Caso de teste que comprova o contraste

### Diferença Entre Secure e Vulnerable

| Aspecto         | SECURE                                  | VULNERÁVEL                                    |
| --------------- | --------------------------------------- | --------------------------------------------- |
| Autenticação    | JWT com validação completa              | JWT sem validação de revogação/conta inativa  |
| Autorização     | RBAC estrito + verificação de ownership | RBAC frouxo, sem verificação de ownership     |
| Validação       | Zod + tipagem TypeScript estrita        | Zod aceitando campos extras (mass assignment) |
| SQL             | Queries parametrizadas                  | Concatenação direta (SQL Injection)           |
| Erros           | Sanitizados (sem stack trace)           | Stack traces e detalhes SQL expostos          |
| Dados Sensíveis | Nunca expostos (passwordHash, etc.)     | Expostos deliberadamente                      |

### Aviso Explícito

> **A VARIANTE VULNERÁVEL NUNCA DEVE SER EXPOSTA À INTERNET**
>
> - Contém vulnerabilidades de segurança deliberadas
> - Apenas para testes de segurança autorizados em ambientes isolados
> - Usar apenas em desenvolvimento local ou laboratórios controlados
> - Vulnerabilidades existem exclusivamente para testes autorizados

---

## 2. Arquitetura

```
barberlab/
├── packages/
│   ├── core/              # Domínio compartilhado (SEM vulnerabilidades)
│   ├── api-secure/        # Variante SECURE - Express 5 + segurança adequada
│   ├── api-vulnerable/    # Variante VULNERÁVEL - vulnerabilidades controladas
│   └── web/               # Frontend React + TypeScript + Vite (compartilhado)
├── docs/                  # Documentação
├── security-lab/          # Catálogo de vulnerabilidades e casos de teste
├── infra/                 # Configuração Docker
└── scripts/               # Scripts utilitários
```

### Fluxo de Dados

```
Web (React)
    ↓
API Secure (porta 3001)  OU  API Vulnerable (porta 3002)
    ↓
Core (regras de negócio compartilhadas)
    ↓
PostgreSQL
```

### Onde Ficam os Componentes

| Componente                   | Localização                                 |
| ---------------------------- | ------------------------------------------- |
| API Secure                   | `packages/api-secure/`                      |
| API Vulnerable               | `packages/api-vulnerable/`                  |
| Core (domínio compartilhado) | `packages/core/`                            |
| Web Frontend                 | `packages/web/`                             |
| Testes de Segurança          | `packages/api-vulnerable/src/security-lab/` |
| Documentação                 | `docs/` e `docs/security-lab/`              |
| Configuração Docker          | `infra/`                                    |
| Scripts                      | `scripts/`                                  |

---

## 3. Modos de Execução

### SECURE (Padrão)

- Implementação segura para produção
- Comportamento esperado em produção
- Proteções: autorização estrita, validação, queries parametrizadas, erros
  sanitizados

### VULNERÁVEL (Laboratório)

- Implementação deliberadamente vulnerável
- Usada exclusivamente para laboratório de segurança
- **NÃO** deve receber dados reais
- **NÃO** deve ser exposta à Internet

---

## 4. Guia de Instalação e Execução

### Pré-requisitos

- Node.js >= 20.0.0
- npm >= 10.0.0
- Docker & Docker Compose

### Instalação

```bash
# Clone o repositório
git clone <repository-url>
cd barberlab

# Instalar dependências
npm install

# Copiar template de ambiente
cp .env.example .env
```

### Configuração de Ambiente

O arquivo `.env` contém todas as variáveis necessárias. Principais:

```env
# API Secure
API_SECURE_PORT=3001

# API Vulnerable
API_VULNERABLE_PORT=3002

# Frontend
VITE_API_BASE_URL=http://localhost:3001

# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=barberlab
DB_USER=barberlab
DB_PASSWORD=changeme

# JWT
JWT_ACCESS_SECRET=your-super-secret-access-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
```

### Inicialização do PostgreSQL

```bash
# Iniciar apenas o PostgreSQL via Docker
docker compose up -d db

# Aguardar healthcheck (aprox. 10-15 segundos)
docker compose ps
# db deve aparecer como "healthy"
```

### Migrations

```bash
# Aplicar todas as migrations pendentes
npm run db:migrate

# Verificar status (dry-run)
npm run db:status

# Rollback da última migration
npm run db:rollback
```

### Seed (Dados de Desenvolvimento)

```bash
# Executar seed determinístico
npm run db:seed
```

Credenciais de desenvolvimento (senha para todos: `dev123456`):

- Admin: `admin@barberlab.local`
- Barbeiros: `joao.barbeiro@barberlab.local`, `maria.barbeira@barberlab.local`
- Clientes: `carlos.cliente@barberlab.local`, `ana.cliente@barberlab.local`,
  `pedro.cliente@barberlab.local`

> ⚠️ **NUNCA USE ESTAS CREDENCIAIS EM PRODUÇÃO**

### Execução da API Secure (Padrão)

```bash
# Modo desenvolvimento (watch)
npm run dev --workspace=@barberlab/api-secure

# Ou via Docker (inicia db + api-secure + web)
docker compose --profile secure up -d

# Health check
curl http://localhost:3001/health
# Resposta esperada: {"status":"ok","timestamp":"..."}
```

### Execução da API Vulnerable

```bash
# Modo desenvolvimento (watch)
npm run dev --workspace=@barberlab/api-vulnerable

# Ou via Docker (inicia db + api-vulnerable)
docker compose --profile vulnerable up -d

# Health check
curl http://localhost:3002/health
# Resposta esperada: {"status":"ok","timestamp":"..."}
```

### Execução da Web

```bash
# Modo desenvolvimento
npm run dev --workspace=@barberlab/web
# Disponível em http://localhost:5173

# Via Docker (requer api-secure ou api-vulnerable rodando)
docker compose --profile secure up -d web
# Disponível em http://localhost:5173
```

### Execução dos Testes

```bash
# Todos os testes (todos os packages)
npm run test

# Testes específicos
npm run test --workspace=@barberlab/api-secure
npm run test --workspace=@barberlab/api-vulnerable
npm run test --workspace=@barberlab/core
npm run test --workspace=@barberlab/web
```

---

## 5. Security Lab Tests

### Execução dos Testes de Segurança

Os testes do Security Lab **devem rodar sequencialmente** devido a locks de
migração no banco de teste:

```bash
# Rodar todos os testes do Security Lab (sequencial)
cd packages/api-vulnerable
npx vitest run --pool=forks --poolOptions.forks.singleFork

# Ou rodar categoria específica
npx vitest run src/security-lab/idor.test.ts --pool=forks --poolOptions.forks.singleFork
npx vitest run src/security-lab/broken-rbac.test.ts --pool=forks --poolOptions.forks.singleFork
npx vitest run src/security-lab/mass-assignment.test.ts --pool=forks --poolOptions.forks.singleFork
npx vitest run src/security-lab/sql-injection.test.ts --pool=forks --poolOptions.forks.singleFork
npx vitest run src/security-lab/error-disclosure.test.ts --pool=forks --poolOptions.forks.singleFork
```

### Categorias de Vulnerabilidades Testadas

| Arquivo                    | Vulnerabilidade                          | Testes |
| -------------------------- | ---------------------------------------- | ------ |
| `idor.test.ts`             | IDOR / Broken Object Level Authorization | 5      |
| `broken-rbac.test.ts`      | Broken Role Authorization                | 8      |
| `mass-assignment.test.ts`  | Mass Assignment                          | 6      |
| `sql-injection.test.ts`    | SQL Injection                            | 7      |
| `error-disclosure.test.ts` | Excessive Error Disclosure               | 5      |
| **Total**                  |                                          | **32** |

### Contraste Secure vs Vulnerable

Cada teste documenta explicitamente:

- **VULNERÁVEL**: Comportamento aceito pela API Vulnerable (ex: 200 OK)
- **SECURE**: Comportamento bloqueado pela API Secure (ex: 403 Forbidden)

---

## 6. Matriz de Vulnerabilidades

### Inventário Implementado

| Vulnerabilidade             | Seam Local                                                               | Teste                      | Status      |
| --------------------------- | ------------------------------------------------------------------------ | -------------------------- | ----------- |
| **IDOR / BOLA**             | `api-vulnerable/src/api/v1/*.routes.ts`                                  | `idor.test.ts`             | ✅ 5 testes |
| **Broken RBAC**             | `api-vulnerable/src/http/middleware/vulnerableRbac.ts`                   | `broken-rbac.test.ts`      | ✅ 8 testes |
| **Mass Assignment**         | Schemas Zod + handlers                                                   | `mass-assignment.test.ts`  | ✅ 6 testes |
| **SQL Injection**           | `core/src/infrastructure/database/repositories/vulnerable-repository.ts` | `sql-injection.test.ts`    | ✅ 7 testes |
| **Error Disclosure**        | `api-vulnerable/src/http/middleware/vulnerableErrorHandler.ts`           | `error-disclosure.test.ts` | ✅ 5 testes |
| **Sensitive Data Exposure** | `api-vulnerable/src/api/v1/users.routes.ts`                              | Incluído nos testes        | ✅          |

### Seams Vulneráveis Isolados

```
api-vulnerable/
├── src/
│   ├── http/middleware/
│   │   ├── vulnerableAuth.ts          # Auth sem validação de revogação/conta inativa
│   │   ├── vulnerableRbac.ts          # RBAC frouxo (sem ownership check)
│   │   └── vulnerableErrorHandler.ts  # Stack traces expostos
│   └── api/v1/
│       ├── users.routes.ts            # Expõe passwordHash, sem ownership
│       ├── customers.routes.ts        # IDOR + mass assignment (role)
│       ├── barbers.routes.ts          # IDOR + mass assignment (active)
│       ├── services.routes.ts         # Mass assignment (active)
│       ├── appointments.routes.ts     # IDOR (sem ownership)
│       └── transactions.routes.ts     # Sem RBAC admin
```

### Vulnerabilidades no Core (Isoladas)

```
core/src/infrastructure/database/repositories/vulnerable-repository.ts
├── findById()           → concatenação direta
├── findByCustomerId()   → concatenação direta
├── findByBarberId()     → interpolação
├── findByStatus()       → template string
├── findByCustomerIdAndStatus() → concatenação múltipla
├── findByDateRange()    → concatenação
└── Métodos seguros (Safe):
    ├── findByIdSafe()
    ├── findByCustomerIdSafe()
```

---

## 7. Comandos de Verificação

### Qualidade de Código

```bash
# Lint completo
npm run lint

# Verificar formatação
npm run format:check

# Corrigir formatação
npm run format

# Type checking
npm run typecheck

# Verificar boundaries de importação
npm run check:boundaries

# Build completo
npm run build
```

### Auditoria de Segurança

```bash
# Verificar vulnerabilidades em dependências
npm audit

# Audit detalhado
npm audit --json
```

### Testes de Banco de Dados

```bash
# Testes de integração do banco
npm run db:test

# Reset completo do banco de desenvolvimento
docker compose down -v db && docker compose up -d db && npm run db:migrate && npm run db:seed
```

---

## 8. Troubleshooting

### Testes do Security Lab Falhando

Se os testes falharem com "Another migration is already running":

- Execute sequencialmente: `--pool=forks --poolOptions.forks.singleFork`
- Não rode testes em paralelo

### Banco de Dados

```bash
# Reset completo
docker compose down -v db
docker compose up -d db
npm run db:migrate
npm run db:seed
```

### TypeScript Errors

```bash
# Limpar cache de build
rm -rf packages/*/dist
npm run build
```

### Boundary Check Failures

```bash
npm run check:boundaries
```

---

## 9. Referências

### Documentação Relacionada

- [Architecture](docs/architecture.md) — Arquitetura do sistema
- [Development](docs/development.md) — Guia de desenvolvimento
- [Database](docs/database.md) — Schema, migrations, seed
- [Security Lab Matrix](docs/security-lab/matrix.md) — Matriz de
  vulnerabilidades

### Scripts Úteis

```bash
# Ver scripts disponíveis
npm run

# Package-specific
npm run dev --workspace=@barberlab/api-secure
npm run dev --workspace=@barberlab/api-vulnerable
npm run dev --workspace=@barberlab/web
```

---

## 10. Contribuindo para o Security Lab

### Adicionar Nova Vulnerabilidade

1. Implementar em `api-vulnerable/` em seam isolado
2. Adicionar teste em `security-lab/nova-vulnerabilidade.test.ts`
3. Documentar em `docs/security-lab/matrix.md`
4. Verificar contraste com `api-secure`
5. Rodar `npm run test` e `npm run check:boundaries`

### Princípios

- Vulnerabilidades **devem** ser isoladas e documentadas
- **Nunca** introduzir vulnerabilidades no `core` ou `api-secure`
- Cada vulnerabilidade **deve** ter teste reproduzível
- Testes **devem** demonstrar: SECURE bloqueia, VULNERÁVEL permite

---

_Documentação mantida pelo time BarberLab Security Lab. Última
atualização: 2025._
