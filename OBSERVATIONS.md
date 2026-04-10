# Session Observations — Participant P054

Fill this in during your last commit (when you get the 15-minute warning).
One sentence per question — no pressure to write more.

## What worked well?

Iterating through the prompt cards with the AI felt productive — schema changes, route rewrites, and tests were all handled in focused steps without losing context between them.

## What slowed you down?

Switching between PowerShell and Git Bash caused small friction around token handling and curl syntax, and the Prisma client needed a manual `prisma generate` after the schema change before TypeScript would compile.

## How did you handle git commits today?

told the AI

## Anything surprising?

The AI caught that `activity.ts` was never mounted in `index.ts` and fixed it without being asked, and it also correctly handled the named relations needed for `List` being referenced twice by `ActivityEvent` (fromList / toList).