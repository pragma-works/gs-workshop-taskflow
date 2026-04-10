# Session Observations — Participant PXXX

Fill this in during your last commit (when you get the 15-minute warning).
One sentence per question — no pressure to write more.

## What worked well?

Refactoring database access into a repository layer and centralizing JWT auth made implementing the Activity Feed and transactional helpers straightforward and testable.

## What slowed you down?

Prisma/SQLite schema quirks (Json not supported) and missing DATABASE_URL plus initial tsc/ts-node setup caused the most delays.

## How did you handle git commits today?

Mixed: used the AI to draft changes and commit messages, and ran git commands locally for actual commits.

## Anything surprising?

Storing activity.meta as a string for SQLite compatibility required careful stringify/parse handling in repositories and routes; tests revealed a few FK timing issues that needed cleanup ordering.
