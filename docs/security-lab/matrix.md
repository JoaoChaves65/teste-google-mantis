# Matriz de Vulnerabilidades - BarberLab Security Lab

## Inventário de Seams Existentes (api-secure)

| Seam               | Localização                                      | Descrição                       | Status |
| ------------------ | ------------------------------------------------ | ------------------------------- | ------ |
| Auth Middleware    | `api-secure/src/http/middleware/auth.ts`         | JWT validation, role extraction | Secure |
| Auth Routes        | `api-secure/src/auth/routes.ts`                  | Login, refresh, logout, me      | Secure |
| V1 Router          | `api-secure/src/api/v1/index.ts`                 | API v1 routes aggregation       | Secure |
| Customer Routes    | `api-secure/src/api/v1/customers.routes.ts`      | CRUD customers                  | Secure |
| Barber Routes      | `api-secure/src/api/v1/barbers.routes.ts`        | CRUD barbers                    | Secure |
| Service Routes     | `api-secure/src/api/v1/services.routes.ts`       | CRUD services                   | Secure |
| Appointment Routes | `api-secure/src/api/v1/appointments.routes.ts`   | CRUD appointments + status      | Secure |
| Transaction Routes | `api-secure/src/api/v1/transactions.routes.ts`   | CRUD transactions               | Secure |
| User Routes        | `api-secure/src/api/v1/users.routes.ts`          | CRUD users (admin)              | Secure |
| RBAC Middleware    | `api-secure/src/http/middleware/rbac.ts`         | Role-based access control       | Secure |
| Auth Middleware    | `api-secure/src/http/middleware/auth.ts`         | JWT validation                  | Secure |
| Error Handler      | `api-secure/src/http/middleware/errorHandler.ts` | Sanitized error responses       | Secure |
| Api Client         | `packages/web/src/lib/api/client.ts`             | Frontend API client             | Secure |

## Matriz de Vulnerabilidades Implementadas

| Vulnerabilidade      | Secure         | Vulnerable               | Seam Vulnerable                         | Teste                                   | Status      |
| -------------------- | -------------- | ------------------------ | --------------------------------------- | --------------------------------------- | ----------- |
| **IDOR / BOLA**      | Bloqueia (403) | Permite acesso (200)     | `api-vulnerable/src/api/v1/*.routes.ts` | `security-lab/idor.test.ts`             | ✅ 5 testes |
| **Broken RBAC**      | Bloqueia (403) | Permite acesso (200/201) | `vulnerableRbac.ts` + routes            | `security-lab/broken-rbac.test.ts`      | ✅ 8 testes |
| **Mass Assignment**  | Rejeita/Ignora | Aceita + domínio ignora  | Schemas Zod + handlers                  | `security-lab/mass-assignment.test.ts`  | ✅ 6 testes |
| **SQL Injection**    | Parametrizado  | Concatenação direta      | `VulnerableAppointmentRepository`       | `security-lab/sql-injection.test.ts`    | ✅ 7 testes |
| **Error Disclosure** | Sanitizado     | Expõe stack trace/SQL    | `vulnerableErrorHandler.ts`             | `security-lab/error-disclosure.test.ts` | ✅ 5 testes |
| **Sensitive Data**   | Nunca exposto  | `passwordHash` exposto   | `users.routes.ts`                       | Incluído nos testes                     | ✅          |

**Total: 32 testes passando**

## Seams Vulneráveis Implementados (api-vulnerable)

| Vulnerabilidade  | Seam Alvo                                | Implementação                                                            |
| ---------------- | ---------------------------------------- | ------------------------------------------------------------------------ |
| IDOR             | Routes sem verificação de ownership      | `api-vulnerable/src/api/v1/*.routes.ts`                                  |
| Broken RBAC      | RBAC Middleware / Routes sem verificação | `api-vulnerable/src/http/middleware/vulnerableRbac.ts`                   |
| Mass Assignment  | Schemas Zod aceitando campos extras      | `createCustomerSchema`, `createBarberSchema`, etc.                       |
| SQL Injection    | Repository com concatenação              | `core/src/infrastructure/database/repositories/vulnerable-repository.ts` |
| Error Disclosure | Error Handler sem sanitização            | `api-vulnerable/src/http/middleware/vulnerableErrorHandler.ts`           |
| Sensitive Data   | Handler expõe passwordHash               | `api-vulnerable/src/api/v1/users.routes.ts`                              |

## Detalhamento por Vulnerabilidade

### A. IDOR / Broken Object Level Authorization

**Seam:** `api-vulnerable/src/api/v1/customers.routes.ts`,
`appointments.routes.ts`, `barbers.routes.ts`, `users.routes.ts`

**Comportamento VULNERÁVEL:**

- GET `/customers/:id` — Customer A acessa customer de Customer B (200 OK)
- GET `/appointments/:id` — Customer A acessa appointment de Customer B (200 OK)
- PATCH `/appointments/:id/status` — Customer A cancela appointment de Customer
  B (200 OK)
- GET `/barbers/:id` — Barber acessa dados de outro barber (200 OK)

**Comportamento SECURE:** 403 Forbidden em todos os casos acima

**Testes:** `security-lab/idor.test.ts` (5 testes)

---

### B. Broken Role Authorization

**Seam:** `api-vulnerable/src/http/middleware/vulnerableRbac.ts` + routes

**Comportamento VULNERÁVEL:**

- Customer acessa GET `/api/v1/users` (admin only) → 200 OK
- Customer acessa GET `/api/v1/transactions` (admin only) → 200 OK
- Customer acessa POST `/api/v1/users` (admin only) → 201 Created
- Barber acessa GET `/api/v1/users` (admin only) → 200 OK
- Barber acessa POST `/api/v1/services` (admin only) → 201 Created
- Barber acessa POST `/api/v1/barbers` (admin only) → 201 Created

**Comportamento SECURE:** 403 Forbidden em todos os casos acima

**Testes:** `security-lab/broken-rbac.test.ts` (8 testes)

---

### C. Mass Assignment / Privilege Manipulation

**Seam:** Schemas Zod + handlers em `customers.routes.ts`, `barbers.routes.ts`,
`services.routes.ts`

**Comportamento VULNERÁVEL:**

- Customer cria customer com `role: ADMIN` → API aceita (201), mas domínio
  ignora (role permanece CUSTOMER)
- Barber cria customer com `role: ADMIN` → API aceita, domínio ignora
- Customer atualiza customer com `role: ADMIN` → API aceita (200), domínio
  ignora
- Barber cria barber com `active: false` → API aceita, domínio ignora
  (active=true)
- Barber cria service com `active: false` → API aceita, domínio ignora
  (active=true)

**Comportamento SECURE:** Domínio ignora campos sensíveis; Secure API não aceita
esses campos ou retorna erro

**Testes:** `security-lab/mass-assignment.test.ts` (6 testes)

---

### D. Sensitive Data Exposure

**Seam:** `api-vulnerable/src/api/v1/users.routes.ts`

**Comportamento VULNERÁVEL:**

- GET `/api/v1/users` — Retorna `passwordHash` de todos usuários
- GET `/api/v1/users/:id` — Retorna `passwordHash` do usuário

**Comportamento SECURE:** `passwordHash` nunca aparece em respostas

**Testes:** Coberto nos testes de contraste dos outros arquivos

---

### E. SQL Injection

**Seam:**
`core/src/infrastructure/database/repositories/vulnerable-repository.ts`

**Comportamento VULNERÁVEL (métodos inseguros):**

- `findById()` — Concatenação direta: `WHERE id = '${id}'`
- `findByCustomerId()` — Concatenação direta:
  `WHERE customer_id = '${customerId}'`
- `findByBarberId()` — Interpolação: `WHERE barber_id = '${barberId}'`
- `findByStatus()` — Template string: `WHERE status = '${status}'`
- `findByCustomerIdAndStatus()` — Concatenação múltipla
- `findByDateRange()` — Concatenação de datas

**Comportamento SECURE (métodos Safe):**

- `findByIdSafe()` — Query parametrizada: `WHERE id = $1`
- `findByCustomerIdSafe()` — Query parametrizada: `WHERE customer_id = $1`

**Testes:** `security-lab/sql-injection.test.ts` (7 testes)

---

### E. Excessive Error Disclosure

**Seam:** `api-vulnerable/src/http/middleware/vulnerableErrorHandler.ts`

**Comportamento VULNERÁVEL:**

- Erros 500 expõem `stack trace` completo
- DomainErrors expõem detalhes internos (`name`, `code`, `stack`)
- Erros de banco expõem detalhes SQL
- Erros 404 expõem stack trace

**Comportamento SECURE:** Erros sanitizados (sem stack, sem detalhes internos)

**Testes:** `security-lab/error-disclosure.test.ts` (5 testes)

---

## Seams Para Implementação Vulnerable (Status Atual)

| Vulnerabilidade  | Seam Alvo                                | Implementação                                          | Status      |
| ---------------- | ---------------------------------------- | ------------------------------------------------------ | ----------- |
| IDOR             | Routes sem verificação de ownership      | `api-vulnerable/src/api/v1/*.routes.ts`                | ✅ Completo |
| Broken RBAC      | RBAC Middleware / Routes sem verificação | `api-vulnerable/src/http/middleware/vulnerableRbac.ts` | ✅ Completo |
| Mass Assignment  | Create/Update DTOs sem validação         | Schemas Zod + handlers                                 | ✅ Completo |
| SQL Injection    | Repository com concatenação              | `VulnerableAppointmentRepository` isolado              | ✅ Completo |
| Error Disclosure | Error Handler sem sanitização            | `VulnerableErrorHandler` isolado                       | ✅ Completo |
| Sensitive Data   | Handler expõe passwordHash               | `api-vulnerable/src/api/v1/users.routes.ts`            | ✅ Completo |

## Arquitetura da api-vulnerable (Atual)

A api-vulnerable:

1. Estende a estrutura da api-secure mas com implementações vulneráveis
2. Usa os mesmos domain/core/shared do core package
3. Tem suas próprias rotas, middlewares e handlers vulneráveis
4. Isola vulnerabilidades em arquivos/seams específicos
5. **Não afeta a api-secure** (build-time isolation via boundaries)

## Testes de Contraste

Cada vulnerabilidade possui testes demonstrando:

- **VULNERÁVEL**: Comportamento aceito (200, 201, dados expostos)
- **SECURE**: Comportamento bloqueado (403, 400, dados sanitizados)

Executar testes:

```bash
cd packages/api-vulnerable
npx vitest run --pool=forks --poolOptions.forks.singleFork
```

---

_Última atualização: 2025 - Todas as 6 categorias implementadas com 32 testes
passando._
