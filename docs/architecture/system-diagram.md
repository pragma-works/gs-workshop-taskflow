# System Diagram

Date: 2026-04-10
Status: Current architecture after the first hardening pass.

## Overview

The following diagram shows the main runtime structure of the application and the current separation between HTTP routes, shared infrastructure, services, Prisma, and SQLite.

```mermaid
flowchart TD
    Client[Client / API Consumer] --> Express[Express App]

    Express --> UsersRoute[Users Routes]
    Express --> BoardsRoute[Boards Routes]
    Express --> CardsRoute[Cards Routes]
    Express --> ActivityRoute[Activity Routes]
    Express --> ErrorHandler[Global Error Handler]

    UsersRoute --> Auth[Shared Auth]
    BoardsRoute --> Auth
    CardsRoute --> Auth
    ActivityRoute --> Auth

    UsersRoute --> AsyncHandler[Async Handler]
    BoardsRoute --> AsyncHandler
    CardsRoute --> AsyncHandler
    ActivityRoute --> AsyncHandler

    UsersRoute --> UserService[User Service]
    BoardsRoute --> BoardService[Board Service]
    CardsRoute --> CardService[Card Service]
    ActivityRoute --> ActivityService[Activity Service]

    Auth --> Config[Shared Config]

    UserService --> Prisma[Prisma Client]
    BoardService --> Prisma
    CardService --> Prisma
    ActivityService --> Prisma

    Prisma --> SQLite[SQLite Database]
```

## Notes

- Route handlers are now thin and delegate use-case logic to services.
- Auth, config, async wrapping, and error handling are shared cross-cutting infrastructure.
- Services still depend directly on Prisma; repository extraction is a future step.
- Activity events are persisted explicitly and are read back through the activity service.
