# ADR-001: Capa de Repositorios para acceso a datos

**Estado:** Aceptado  
**Fecha:** 2026-04-10

## Contexto

El código original accedía directamente a `prisma.*` desde los route handlers de Express. Esto generaba tres problemas concretos:

1. **Acoplamiento fuerte** entre la capa HTTP y la capa de datos, haciendo imposible testear la lógica sin levantar una base de datos real.
2. **N+1 queries** ocultos en bucles `for`, imposibles de detectar sin revisar cada handler individualmente.
3. **Duplicación de lógica** de autenticación y autorización en cada archivo de rutas.

## Decisión

Se introduce una capa `src/repositories/` con módulos por entidad (`userRepository`, `boardRepository`, `cardRepository`, `activityRepository`). Cada módulo encapsula todas las consultas Prisma relacionadas con esa entidad.

Las rutas Express solo invocan funciones del repositorio correspondiente; nunca importan `prisma` directamente.

## Consecuencias

**Positivas:**
- Las rutas son testeables con mocks de los repositorios (sin DB real).
- Las queries N+1 se eliminan centralizando el uso de `include` en un solo lugar.
- Un cambio de ORM o de base de datos solo afecta a `src/repositories/`, no a las rutas.

**Negativas:**
- Añade una capa de indirección que aumenta levemente la cantidad de archivos.
- Los repositorios siguen dependiendo de Prisma; no son agnósticos al ORM (trade-off aceptado para este proyecto).

## Alternativas consideradas

- **Service layer completo (Hexagonal Architecture):** descartado por ser excesivo para el tamaño actual del proyecto.
- **Mantener Prisma en rutas con helpers:** descartado porque no resuelve el problema de testabilidad.
