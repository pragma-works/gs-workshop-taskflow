# Guía de Testing — Taskflow API

Esta guía cubre todos los niveles de testing del proyecto: unitario (Vitest), integración (supertest) y manual (curl/Postman). Incluye la validación completa de todos los requisitos de `PROMPT_CARDS.md`.

---

## Prerequisitos

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env y asegurarse de que tenga:
# DATABASE_URL="file:./prisma/dev.db"
# JWT_SECRET="tu-secreto-aqui"
# PORT=3001

# 3. Aplicar schema y cargar datos de prueba
npx prisma db push
npm run db:seed
```

---

## 1. Tests Automatizados (Vitest)

### Ejecutar todos los tests
```bash
npm test
```

### Ejecutar con cobertura
```bash
npm run test:coverage
```

### Resultado esperado
```
 ✓ src/routes/activity.test.ts (9 tests)
   ✓ GET /boards/:id/activity > returns 401 when no Authorization header is provided
   ✓ GET /boards/:id/activity > returns 403 when caller is not a board member
   ✓ GET /boards/:id/activity > returns activity events in reverse chronological order for a member
   ✓ GET /boards/:id/activity/preview > returns events without requiring authentication
   ✓ PATCH /cards/:id/move > returns 401 when unauthenticated
   ✓ PATCH /cards/:id/move > returns 404 when card does not exist
   ✓ PATCH /cards/:id/move > creates an ActivityEvent in the same transaction when move succeeds
   ✓ PATCH /cards/:id/move > returns 500 and rolls back when the transaction fails
   ✓ PATCH /cards/:id/move > returns 404 when the target list does not exist and the transaction rolls back

 Tests  9 passed (9)
```

### Cobertura objetivo
- **≥ 60% de líneas** en `src/` (requerido para `Verifiable` 2/2 en score)
- Ver reporte en `.score-coverage/index.html` tras ejecutar `test:coverage`

---

## 2. Validación de Requisitos por Prompt

### Prompt 2 — Schema: `ActivityEvent`

Verificar que el modelo existe en la DB:

```bash
# Ver todas las tablas del schema aplicado
npx prisma studio
# Abrir http://localhost:5555 → verificar tabla ActivityEvent
```

**Campos requeridos:**

| Campo       | Tipo       | Nullable |
|-------------|------------|----------|
| id          | Int (PK)   | No       |
| eventType   | String     | No       |
| boardId     | Int (FK)   | No       |
| actorId     | Int (FK)   | No       |
| cardId      | Int (FK)   | Sí       |
| fromListId  | Int (FK)   | Sí       |
| toListId    | Int (FK)   | Sí       |
| createdAt   | DateTime   | No       |

---

### Prompt 3 — PATCH /cards/:id/move (transacción atómica)

**Caso éxito:**
```bash
# 1. Login para obtener token
TOKEN=$(curl -s -X POST http://localhost:3001/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@test.com","password":"password123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# 2. Mover card 1 a lista 3 (Done)
curl -s -X PATCH http://localhost:3001/cards/1/move \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"targetListId": 3, "position": 0}' | python -m json.tool
```

**Respuesta esperada:**
```json
{
  "ok": true,
  "event": {
    "id": 1,
    "eventType": "card_moved",
    "cardId": 1,
    "fromListId": 1,
    "toListId": 3,
    "actorId": 1,
    "boardId": 1,
    "createdAt": "2026-..."
  }
}
```

**Caso sin auth → 401:**
```bash
curl -s -X PATCH http://localhost:3001/cards/1/move \
  -H "Content-Type: application/json" \
  -d '{"targetListId": 3, "position": 0}'
# → {"error":"Unauthorized"}
```

**Caso lista inexistente → 500 (rollback):**
```bash
curl -s -X PATCH http://localhost:3001/cards/1/move \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"targetListId": 9999, "position": 0}'
# → {"error":"Move failed","details":"..."}
```

**Verificar que la transacción es atómica:**
```bash
# Verificar que el ActivityEvent fue creado en la misma operación
curl -s http://localhost:3001/boards/1/activity/preview | python -m json.tool
# Debe aparecer el evento con eventType "card_moved"
```

---

### Prompt 4 — Activity Feed

#### GET /boards/:id/activity (autenticado)

```bash
# Sin token → 401
curl -s http://localhost:3001/boards/1/activity
# → {"error":"Unauthorized"}

# Con token de no-miembro → 403
TOKEN_STRANGER=$(curl -s -X POST http://localhost:3001/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"stranger@test.com","password":"pass123","name":"Stranger"}' | grep -o '"id":[0-9]*')
# (registrar y usar su token para board ajeno)

# Con token válido → 200 con eventos
curl -s http://localhost:3001/boards/1/activity \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool
```

**Shape de respuesta requerida (campos PLANOS):**
```json
[
  {
    "id": 1,
    "eventType": "card_moved",
    "boardId": 1,
    "actorId": 1,
    "cardId": 1,
    "fromListId": 1,
    "toListId": 3,
    "createdAt": "2026-...",
    "actorName": "Alice",
    "cardTitle": "User auth flow",
    "fromListName": "Backlog",
    "toListName": "Done"
  }
]
```

> ⚠️ **Importante:** Los campos deben ser `actorName`, `cardTitle`, `fromListName`, `toListName` como strings planos — NO objetos anidados como `actor: { name }`.

#### GET /boards/:id/activity/preview (sin auth)

```bash
# Sin token → 200 (endpoint público para testing)
curl -s http://localhost:3001/boards/1/activity/preview | python -m json.tool

# Verificar orden cronológico inverso
# El primer elemento debe tener el createdAt más reciente
```

---

### Prompt 5 — Tests: Matriz de cobertura

| Caso | Endpoint | Test | Estado |
|------|----------|------|--------|
| Sin auth → 401 | `GET /boards/:id/activity` | `returns 401 when no Authorization header` | ✅ |
| No miembro → 403 | `GET /boards/:id/activity` | `returns 403 when caller is not a board member` | ✅ |
| Orden desc | `GET /boards/:id/activity` | `returns activity events in reverse chronological order` | ✅ |
| Sin auth → 200 | `GET /boards/:id/activity/preview` | `returns events without requiring authentication` | ✅ |
| Sin auth → 401 | `PATCH /cards/:id/move` | `returns 401 when unauthenticated` | ✅ |
| ActivityEvent en TX | `PATCH /cards/:id/move` | `creates an ActivityEvent in the same transaction` | ✅ |
| Card inexistente → 404 | `PATCH /cards/:id/move` | `returns 404 when card does not exist` | ✅ |
| Lista inexistente → 404 | `PATCH /cards/:id/move` | `returns 404 when target list does not exist and rolls back` | ✅ |
| TX falla → 500 | `PATCH /cards/:id/move` | `returns 500 and rolls back when transaction fails` | ✅ |

---

## 3. Testing Manual Completo (flujo end-to-end)

Levanta el servidor antes de ejecutar estos comandos:

```bash
npm run dev
```

### Paso 1 — Registro y login

```bash
# Registrar usuario (sin password en respuesta)
curl -s -X POST http://localhost:3001/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass123","name":"Test User"}' | python -m json.tool
# ✅ Verificar: campo "password" NO aparece en la respuesta

# Login
curl -s -X POST http://localhost:3001/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@test.com","password":"password123"}' | python -m json.tool
# ✅ Verificar: respuesta tiene { "token": "eyJ..." }

# Guardar token (PowerShell)
$TOKEN = (curl -s -X POST http://localhost:3001/users/login `
  -H "Content-Type: application/json" `
  -d '{"email":"alice@test.com","password":"password123"}' | ConvertFrom-Json).token
```

### Paso 2 — Boards

```bash
# Listar boards del usuario (sin N+1)
curl -s http://localhost:3001/boards \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool

# Ver board completo con listas, cards, comentarios, labels (una sola query)
curl -s http://localhost:3001/boards/1 \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool

# Crear nuevo board
curl -s -X POST http://localhost:3001/boards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "Mi nuevo board"}' | python -m json.tool

# Agregar miembro (solo owners)
curl -s -X POST http://localhost:3001/boards/1/members \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"memberId": 2}' | python -m json.tool
```

### Paso 3 — Cards

```bash
# Ver card con comentarios y labels (sin N+1)
curl -s http://localhost:3001/cards/1 \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool

# Crear card
curl -s -X POST http://localhost:3001/cards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title": "Nueva tarea", "listId": 1}' | python -m json.tool

# Mover card (atómico con ActivityEvent)
curl -s -X PATCH http://localhost:3001/cards/1/move \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"targetListId": 2, "position": 0}' | python -m json.tool

# Comentar
curl -s -X POST http://localhost:3001/cards/1/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"content": "Revisado y aprobado"}' | python -m json.tool

# Eliminar (solo miembros)
curl -s -X DELETE http://localhost:3001/cards/1 \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool
```

### Paso 4 — Activity Feed

```bash
# Feed autenticado (campos planos requeridos)
curl -s http://localhost:3001/boards/1/activity \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool
# ✅ Verificar: cada evento tiene actorName, cardTitle, fromListName, toListName

# Preview sin auth
curl -s http://localhost:3001/boards/1/activity/preview | python -m json.tool
# ✅ Verificar: mismo shape, no requiere token

# Verificar orden cronológico inverso
# El primer elemento debe tener el createdAt más reciente
```

---

## 4. Validación de Seguridad

```bash
# ✅ JWT secret desde env var (NO hardcodeado)
grep -r "super-secret" src/   # → sin resultados

# ✅ Password no expuesto
curl -s http://localhost:3001/users/register \
  -X POST -H "Content-Type: application/json" \
  -d '{"email":"new@test.com","password":"pass123","name":"New"}' | python -m json.tool
# → No debe aparecer "password" en la respuesta

# ✅ Solo owners pueden agregar miembros
# Usar token de Bob (role: member) para agregar a board 1
TOKEN_BOB=$(curl -s -X POST http://localhost:3001/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"bob@test.com","password":"password123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

curl -s -X POST http://localhost:3001/boards/1/members \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_BOB" \
  -d '{"memberId": 99}' | python -m json.tool
# → {"error":"Only board owners can add members"}
```

---

## 5. Ejecutar Score Automatizado

```bash
# Verificar puntaje completo del proyecto
npm run score
```

**Score esperado:**

| Propiedad | Puntos | Criterio |
|-----------|--------|----------|
| Self-describing | 1/1 | README actualizado con descripción del feature |
| Bounded | 2/2 | 0 llamadas `prisma.*` en archivos de rutas |
| Verifiable | 2/2 | Tests pasan + cobertura ≥ 60% |
| Defended | 1/1 | 0 errores TypeScript (`npx tsc --noEmit`) |
| Auditable | 2/2 | ≥50% commits convencionales + ADR presente |
| **Total automático** | **8/8** | |
| Composable | ?/3 | Pendiente live test (arquitectura limpia) |
| Executable | ?/3 | Pendiente live test (contratos HTTP) |

```bash
# Ver resultado
cat score.json | python -m json.tool
```

---

## 6. Checklist de verificación final

Antes del push final, verificar:

- [ ] `npx tsc --noEmit` → sin errores
- [ ] `npm test` → todos los tests pasan (9/9)
- [ ] `npm run test:coverage` → cobertura ≥ 60%
- [ ] `curl .../users/register` → respuesta sin campo `password`
- [ ] `curl .../boards/1/activity/preview` → tiene `actorName`, `cardTitle`, `fromListName`, `toListName`
- [ ] `PATCH /cards/:id/move` → responde `{ ok: true, event: {...} }` y crea ActivityEvent
- [ ] `INTAKE.md` → consent marcado y preguntas respondidas
- [ ] `docs/decisions/adr-001-repository-layer.md` → existe
- [ ] Commits con prefijos `feat/fix/refactor/test/chore/docs`
