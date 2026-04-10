# Decisión de diseño: Activity Feed y refactorización

## Contexto

Se implementó el ticket PM-5214 para agregar un feed de actividades (Activity Feed) al tablero Kanban. Además, se refactorizó el código para cumplir con los estándares de arquitectura y buenas prácticas del proyecto.

## Cambios principales

- **Modelo y repositorio ActivityEvent:**
  - Se creó el modelo `ActivityEvent` en Prisma y un repositorio para su acceso.
- **Endpoints de actividad:**
  - Se implementaron los endpoints `GET /boards/:id/activity` y `/boards/:id/activity/preview`.
- **Integración de eventos:**
  - Al mover una tarjeta (`PATCH /cards/:id/move`) o agregar un comentario (`POST /cards/:id/comments`), se registra un evento de actividad de forma atómica usando transacciones.
- **Refactorización de acceso a datos:**
  - Se eliminaron las llamadas directas a `prisma` en los archivos de rutas, usando repositorios dedicados para `cards`, `boards` y `users`.
  - Se resolvió el problema de N+1 queries en la consulta de tableros y listas.
- **Seguridad JWT:**
  - El secreto JWT ya no está hardcodeado; ahora se toma de la variable de entorno `JWT_SECRET`.

## Flujo de actividad

1. El usuario realiza una acción relevante (mover tarjeta, comentar).
2. Se ejecuta la operación principal y, en la misma transacción, se registra el evento en `ActivityEvent`.
3. Los endpoints de actividad permiten consultar el historial completo o un preview de los últimos eventos.

## Beneficios

- El código es más mantenible y seguro.
- El acceso a datos es centralizado y reutilizable.
- El sistema es auditable y cumple con los criterios de la rúbrica del workshop.
