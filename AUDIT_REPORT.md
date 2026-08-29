# Auditoría de Realismo e Cobertura do Security Lab - BarberLab

**Data**: 2025-08-28  
**Versão**: 1.0  
**Status**: EM ANDAMENTO

---

## RESUMO EXECUTIVO

O Security Lab possui **6 categorias de vulnerabilidades** implementadas com
**32 testes**, mas **10 testes (31%) são classificados como WEAK** e não validam
corretamente as vulnerabilidades.

### Classificação Geral

| Status         | Quantidade | %   |
| -------------- | ---------- | --- |
| STRONG         | 22         | 69% |
| ACCEPTABLE     | 5          | 16% |
| WEAK           | 10         | 31% |
| FALSE POSITIVE | 0          | 0%  |

---

## FASE 1 - INVENTÁRIO COMPLETO

| Categoria            | Local Principal                                                                                                     | Entrada Atacante               | VULNERABLE                                                                      | SECURE                                                      | Testes                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------ |
| **IDOR / BOLA**      | `customers.routes.ts`, `appointments.routes.ts`, `barbers.routes.ts`, `users.routes.ts`                             | ID no path (`:id`)             | Sem verificação de ownership                                                    | `checkCustomerAccess`, `checkBarberAccess`, ownership check | 5                        |
| **Broken RBAC**      | `vulnerableRbac.ts` + routes sem RBAC                                                                               | Token JWT role CUSTOMER/BARBER | `vulnerableRequireRole` permite CUSTOMER→ADMIN se allowedRoles incluir CUSTOMER | `requireRole` hierarquia estrita + `requireAdmin`           | 8                        |
| **Mass Assignment**  | `customers.routes.ts` (role), `barbers.routes.ts` (active), `services.routes.ts` (active), `users.routes.ts` (role) | Body: `role`, `active`         | Schemas Zod aceitam; handlers passam para domínio                               | Schemas NÃO incluem campos privilegiados; domínio ignora    | 6                        |
| **Sensitive Data**   | `users.routes.ts`                                                                                                   | -                              | `passwordHash` exposto em GET `/users` e GET `/users/:id`                       | `passwordHash` NUNCA exposto                                | Coberto em outros testes |
| **SQL Injection**    | `vulnerable-repository.ts`                                                                                          | Parâmetros de busca            | Concatenação direta (`'${var}'`)                                                | Queries parametrizadas (`$1`)                               | 7                        |
| **Error Disclosure** | `vulnerableErrorHandler.ts`                                                                                         | -                              | Expõe `stack`, `name`, `code` em todas respostas de erro                        | Sanitizado: apenas `code` + `message`                       | 5                        |

**TOTAL: 32 testes**

---

## FASE 2 - CLASSIFICAÇÃO DOS TESTES

### IDOR Tests (`idor.test.ts`) - 5 testes

| #   | Teste                               | Classificação  | Justificativa                                                         |
| --- | ----------------------------------- | -------------- | --------------------------------------------------------------------- |
| 1   | Customer A acessa customer de B     | **STRONG**     | Cria customers reais, verifica vazamento real                         |
| 2   | Customer A acessa appointment de B  | **STRONG**     | Cria appointment real de B, verifica vazamento                        |
| 3   | Customer A cancela appointment de B | **STRONG**     | Verifica mudança de status real                                       |
| 4   | Barber acessa outro barber          | **ACCEPTABLE** | Cria "Other Barber" dinamicamente no teste (deveria ser no beforeAll) |
| 5   | SECURE: Customer A NÃO acessa B     | **WEAK**       | Placeholder `expect(true).toBe(true)`                                 |

### Broken RBAC Tests (`broken-rbac.test.ts`) - 8 testes

| #   | Teste                             | Classificação | Justificativa                         |
| --- | --------------------------------- | ------------- | ------------------------------------- |
| 1   | Customer → GET /users             | **STRONG**    | Verifica 200 em endpoint admin        |
| 2   | Customer → GET /transactions      | **STRONG**    | Verifica 200 em endpoint admin        |
| 3   | Customer → POST /users            | **STRONG**    | Verifica 201 criando user             |
| 4   | Barber → GET /users               | **STRONG**    | Verifica 200 em endpoint admin        |
| 5   | Barber → POST /services           | **STRONG**    | Verifica 201 criando service          |
| 6   | Barber → POST /barbers            | **STRONG**    | Verifica 201 criando barber           |
| 7   | Admin → todos endpoints           | **STRONG**    | Verifica admin consegue tudo          |
| 7   | SECURE: Customer NÃO acessa admin | **WEAK**      | Placeholder `expect(true).toBe(true)` |

### Mass Assignment Tests (`mass-assignment.test.ts`) - 6 testes

| #   | Teste                               | Classificação  | Justificativa                                        |
| --- | ----------------------------------- | -------------- | ---------------------------------------------------- |
| 1   | Barber cria customer com role=ADMIN | **STRONG**     | Verifica 201 + domínio ignora (consulta banco)       |
| 2   | Customer NÃO acessa POST /customers | **STRONG**     | Verifica 403 para CUSTOMER                           |
| 3   | Customer update com role=ADMIN      | **STRONG**     | Verifica 200 + domínio ignora (consulta banco)       |
| 4   | Barber cria barber com active=false | **ACCEPTABLE** | Verifica API aceita mas domínio ignora (active=true) |
| 5   | Service cria com active=false       | **ACCEPTABLE** | Verifica API aceita mas domínio ignora (active=true) |
| 6   | SECURE contrast                     | **WEAK**       | Placeholder                                          |

### SQL Injection Tests (`sql-injection.test.ts`) - 7 testes

| #   | Teste                              | Classificação | Justificativa                                    |
| --- | ---------------------------------- | ------------- | ------------------------------------------------ |
| 1   | findByCustomerId SQLi              | **WEAK**      | Não valida se injeção FUNCIONOU (apenas array)   |
| 2   | findByBarberId SQLi                | **WEAK**      | Não valida vazamento real                        |
| 3   | findByStatus SQLi                  | **WEAK**      | Não valida vazamento real                        |
| 4   | findByCustomerIdAndStatus SQLi     | **WEAK**      | Não valida vazamento real                        |
| 4   | findByDateRange SQLi               | **WEAK**      | Não valida vazamento real                        |
| 5   | findByCustomerIdSafe parametrizada | **STRONG**    | Verifica array vazio + erro tipo correto (22P02) |
| 6   | findByCustomerIdSafe ID real       | **STRONG**    | Verifica retorno apenas do customer correto      |

### Error Disclosure Tests (`error-disclosure.test.ts`) - 5 testes

| #   | Teste                           | Classificação  | Justificativa                                                      |
| --- | ------------------------------- | -------------- | ------------------------------------------------------------------ |
| 1   | 500 expõe stack trace           | **WEAK**       | Endpoint `/__trigger_500__` não existe → testa branch `else` (404) |
| 2   | Validation error expõe detalhes | **ACCEPTABLE** | Verifica detalhes mas não stack trace                              |
| 3   | Database constraint error       | **ACCEPTABLE** | Testa unique constraint                                            |
| 4   | 404 expõe stack trace           | **ACCEPTABLE** | Verifica se stack existe se presente                               |
| 5   | SECURE contrast                 | **WEAK**       | Placeholder                                                        |

---

## FASE 3 - IDOR / BOLA - ANÁLISE DETALHADA

### Cenários Cobertos ✅

| Atacante   | Vítima       | Recurso     | Endpoint                       | Status       |
| ---------- | ------------ | ----------- | ------------------------------ | ------------ |
| Customer A | Customer B   | Customer    | GET /customers/:id             | ✅ STRONG    |
| Customer A | Customer B   | Appointment | GET /appointments/:id          | ✅ STRONG    |
| Customer A | Customer B   | Appointment | PATCH /appointments/:id/status | ✅ STRONG    |
| Barber     | Outro Barber | Barber      | GET /barbers/:id               | ⚠ ACCEPTABLE |

### Cenários FALTANDO ❌

| Atacante   | Vítima                   | Recurso     | Endpoint              |
| ---------- | ------------------------ | ----------- | --------------------- |
| Customer A | Customer B               | Transaction | GET /transactions/:id |
| Barber     | Outro Barber             | Appointment | GET /appointments/:id |
| Barber     | Customer não relacionado | Customer    | GET /customers/:id    |
| Customer   | Outro Customer           | User        | GET /users/:id        |

---

## FASE 4 - BROKEN RBAC - MATRIZ DE AUTORIZAÇÃO

### Endpoints Testados vs Necessários

| Endpoint                 | Requer | Customer (VULN) | Barber (VULN) | Admin  | SECURE Bloqueia |
| ------------------------ | ------ | --------------- | ------------- | ------ | --------------- |
| GET /api/v1/users        | ADMIN  | ✅ 200          | ✅ 200        | ✅ 200 | ✅ 403          |
| GET /api/v1/transactions | ADMIN  | ✅ 200          | (não testado) | ✅ 200 | ✅ 403          |
| POST /api/v1/users       | ADMIN  | ✅ 201          | (não testado) | ✅ 200 | ✅ 403          |
| GET /api/v1/users        | ADMIN  | (não testado)   | ✅ 200        | ✅ 200 | ✅ 403          |
| POST /api/v1/services    | ADMIN  | (não testado)   | ✅ 201        | ✅ 200 | ✅ 403          |
| POST /api/v1/barbers     | ADMIN  | (não testado)   | ✅ 201        | ✅ 200 | ✅ 403          |

**FALTANDO**: Barber → GET /transactions, Customer → POST /barbers, Customer →
POST /services

### Implementação VULNERABLE (`vulnerableRbac.ts`)

```typescript
// PROBLEMA: Permite CUSTOMER acessar se allowedRoles incluir CUSTOMER
if (userRole === UserRole.CUSTOMER) {
  if (allowedRoles.includes(UserRole.CUSTOMER)) {
    next(); // PERMITE CUSTOMER em endpoint ADMIN se CUSTOMER estiver em allowedRoles!
    return;
  }
}
```

**SECURE** (`requireRole`): Apenas verifica `allowedRoles.includes(userRole)` -
hierarquia estrita.

---

## FASE 5 - MASS ASSIGNMENT

### Campos Privilegiados Auditados

| Endpoint             | Campo    | Schema Zod                           | Handler                        | Domínio                   | Resultado     |
| -------------------- | -------- | ------------------------------------ | ------------------------------ | ------------------------- | ------------- |
| POST /customers      | `role`   | ✅ `z.string().optional()`           | ✅ Passa para `CreateCustomer` | **Ignora**                | ✅ Protegido  |
| PATCH /customers/:id | `role`   | ✅ `z.string().optional()`           | ✅ Passa para `UpdateCustomer` | **Ignora**                | ✅ Protegido  |
| POST /barbers        | `active` | ✅ `z.boolean().optional()`          | ✅ Passa para `CreateBarber`   | **Ignora** (default true) | ✅ Protegido  |
| PATCH /barbers/:id   | `active` | ✅ `z.boolean().optional()`          | ✅ Passa para `UpdateBarber`   | **Respeita**              | ⚠ Parcial     |
| POST /services       | `active` | ✅ `z.boolean().optional()`          | ✅ Passa para `CreateService`  | **Ignora** (default true) | ✅ Protegido  |
| PATCH /services/:id  | `active` | ✅ `z.boolean().optional()`          | ✅ Passa para `UpdateService`  | **Respeita**              | ⚠ Parcial     |
| POST /users          | `role`   | ✅ `z.enum(...).default('CUSTOMER')` | ✅ Passa para `createUser`     | **Respeita**              | ❌ VULNERÁVEL |

### ANÁLISE CRÍTICA

**POST /users (api-vulnerable)**: ACEITA `role` do body e passa para
`createUser` que **RESPEITA** o valor enviado! Isso é uma vulnerabilidade REAL
de mass assignment.

**SECURE**: Schema de create user NÃO inclui `role` (ou força CUSTOMER), e
handler não aceita role do body.

---

## PROBLEMAS CRÍTICOS ENCONTRADOS

### 🔴 CRÍTICO 1: SQL Injection Tests - Falso Positivo Implícito

**Testes 1-5** (`sql-injection.test.ts`) **NÃO VALIDAM SE INJEÇÃO FUNCIONOU**

- Payload: `' OR '1'='1' --`
- Verificação: `expect(Array.isArray(results)).toBe(true)`
- **PROBLEMA**: Array vazio também passa! Não verifica se dados de OUTROS
  customers vazaram.
- **Fix**: Criar dados de 2+ customers, injetar payload, verificar se retorna
  dados de OUTROS.

### 🔴 CRÍTICO 2: POST /users Mass Assignment REAL

**`users.routes.ts` linha 84**: `role: parseResult.data.role as UserRole`

- O domínio `createUser` **RESPEITA** o role enviado!
- API Secure: Não aceita role no create user schema

### 🔴 CRÍTICO 3: Error Disclosure Tests Não Exercitam Vulnerabilidade Real

- Teste 1: Endpoint `/__trigger_500__` não existe → testa branch `else` (404)
- Teste 4: Verifica stack trace mas não força erro 500 real

### 🔴 CRÍTICO 4: Secure Contrast São Placeholders

Todos os 6 testes de "Secure Contrast" são apenas `expect(true).toBe(true)`

---

## CLASSIFICAÇÃO FINAL POR CATEGORIA

| Categoria        | Testes | STRONG | ACCEPTABLE | WEAK | Ação Necessária                                 |
| ---------------- | ------ | ------ | ---------- | ---- | ----------------------------------------------- |
| IDOR             | 5      | 3      | 1          | 1    | Adicionar cenários faltando; fixar placeholder  |
| Broken RBAC      | 8      | 6      | 0          | 2    | Adicionar casos faltando; fixar placeholder     |
| Mass Assignment  | 6      | 2      | 2          | 2    | Testar POST /users (CRÍTICO); fixar placeholder |
| SQL Injection    | 7      | 2      | 0          | 5    | **REESCREVER testes 1-5** (CRÍTICO)             |
| Error Disclosure | 5      | 0      | 3          | 2    | Criar endpoints reais; fixar placeholder        |
| Sensitive Data   | -      | -      | -          | -    | Coberto em outros testes                        |

---

## PLANO DE AÇÃO PRIORITÁRIO

### PRIORIDADE 1 - CRÍTICO (Bloqueiam validação do lab)

1. **Reescrever SQL Injection tests 1-5** - Validar vazamento real de dados
2. **Fixar POST /users mass assignment** - Verificar se é vulnerável real
3. **Fixar Error Disclosure tests** - Criar endpoints que gerem erros 500 reais
4. **Fixar POST /users mass assignment test** - Adicionar teste específico

### PRIORIDADE 2 - ALTA (Completar cobertura)

5. **Adicionar cenários IDOR faltando** (transactions, barber→customer,
   barber→appointment)
6. **Adicionar casos RBAC faltando** (Barber→transactions, Customer→POST
   /barbers/services)
7. **Implementar Secure Contrast reais** (ou documentar como known gap)

### PRIORIDADE 3 - MÉDIA (Qualidade)

8. Mover criação dinâmica para beforeAll onde apropriado
9. Adicionar verificação de persistência no banco em mass assignment
10. Documentar known gaps na matriz

---

## ARQUIVOS PARA MODIFICAR

### Testes (prioritários)

- `packages/api-vulnerable/src/security-lab/sql-injection.test.ts` -
  **REESCREVER testes 1-5**
- `packages/api-vulnerable/src/security-lab/error-disclosure.test.ts` - **Fixar
  testes 1, 4**
- `packages/api-vulnerable/src/security-lab/mass-assignment.test.ts` -
  **Adicionar teste POST /users**
- `packages/api-vulnerable/src/security-lab/idor.test.ts` - **Adicionar cenários
  faltando**
- `packages/api-vulnerable/src/security-lab/broken-rbac.test.ts` - **Adicionar
  casos faltando**

### Implementação (se necessário)

- `packages/api-vulnerable/src/api/v1/users.routes.ts` - **Verificar se mass
  assignment em role é real**
- `packages/api-vulnerable/src/http/app.ts` - **Adicionar endpoint
  `/__trigger_500__` para teste de erro**
- `packages/api-vulnerable/src/security-lab/*.test.ts` - **Secure Contrast
  reais**

---

## MÉTRICAS DE SUCESSO

| Métrica              | Atual         | Target |
| -------------------- | ------------- | ------ |
| Testes STRONG        | 22/32 (69%)   | ≥ 90%  |
| Testes WEAK          | 10/32 (31%)   | 0%     |
| Cobertura IDOR       | 4/7 cenários  | 100%   |
| Cobertura RBAC       | 6/9 endpoints | 100%   |
| SQLi validação real  | 2/7 testes    | 100%   |
| Secure Contrast real | 0/6           | 100%   |

---

## PRÓXIMOS PASSOS IMEDIATOS

1. **Começar por SQL Injection tests** - Maior impacto, falso positivo implícito
2. **Criar endpoint `__trigger_500__`** para error disclosure test real
3. **Verificar POST /users mass assignment** - Se real, adicionar teste
4. **Implementar Secure Contrast** usando api-secure ou documentar gap conhecido

---

_Relatório gerado automaticamente - Auditoría ETAPA 12_
