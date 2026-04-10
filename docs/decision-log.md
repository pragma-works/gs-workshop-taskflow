# Decision Log — Activity Feed & Refactorización

## Resumen

Este documento describe los cambios clave realizados para implementar el feed de actividades (Activity Feed) y la refactorización asociada en el proyecto Kanban Taskflow, cumpliendo con los criterios de arquitectura, seguridad y mantenibilidad.

## Cambios principales

- **Modelo y repositorio ActivityEvent:**
  - Se creó el modelo `ActivityEvent` en Prisma y un repositorio para su acceso.
- **Endpoints de actividad:**
  - Se implementaron los endpoints `GET /boards/:id/activity` y `/boards/:id/activity/preview` para consultar eventos.
- **Integración de eventos:**
  - Al mover una tarjeta o agregar un comentario, se registra un evento de actividad de forma atómica usando transacciones.
- **Refactorización de acceso a datos:**
  - Se eliminaron las llamadas directas a `prisma` en los archivos de rutas, usando repositorios dedicados para `cards`, `boards` y `users`.
  - Se resolvió el problema de N+1 queries en la consulta de tableros y listas.
- **Seguridad JWT:**
  - El secreto JWT ahora se toma de la variable de entorno `JWT_SECRET`.

## Flujo de actividad

1. El usuario realiza una acción relevante (mover tarjeta, comentar).
2. Se ejecuta la operación principal y, en la misma transacción, se registra el evento en `ActivityEvent`.
3. Los endpoints de actividad permiten consultar el historial completo o un preview de los últimos eventos.

## Beneficios

- Código más mantenible y seguro.
- Acceso a datos centralizado y reutilizable.
- Sistema auditable y alineado con la rúbrica del workshop.
