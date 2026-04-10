# Session Observations — Participant PXXX

Fill this in during your last commit (when you get the 15-minute warning).
One sentence per question — no pressure to write more.

## What worked well?

<!-- Replace with one sentence: what felt smooth or productive today? -->

## What slowed you down?

<!-- Replace with one sentence: friction, confusion, or time sinks? -->

## How did you handle git commits today?

<!-- Replace with one of: typed commands manually / told the AI / mixed -->

## Anything surprising?

<!-- Optional: anything the AI did or didn't do that you didn't expect? -->

## After all five prompts: anti-pattern review

README.md does not contain an explicit anti-pattern list, so this review uses the anti-patterns identified in the first structural pass plus README's "what good looks like" criteria.

Fixed as a side effect of implementing the activity feed:
- The activity feed schema gap was closed by adding `ActivityEvent` and relations to `Board`, `User`, `Card`, and `List`.
- The activity route stub was replaced with implemented `/boards/:id/activity` and `/boards/:id/activity/preview` endpoints.
- The activity router is now mounted under `/boards`.
- Card moves now update the card and create the move activity event in one transaction.
- The new activity feed query avoids database queries in a loop by using Prisma `include`.
- The new activity feed and move behavior have Vitest coverage.

Anti-patterns that survived:
- JWT verification is still copy-pasted across route files.
- The JWT secret is still hardcoded instead of coming from an environment variable.
- Route handlers still contain business logic and direct Prisma access.
- There is still no global JSON error handler.
- The Prisma client is still a global singleton with no explicit lifecycle management.
- Existing board and card routes still contain N+1 query patterns outside the new activity feed.
- Several routes still lack ownership or board membership checks, including card fetch, card create, card move, card delete, and member add ownership authorization.
- User registration and lookup still return the password hash.
- Comment creation still does not create an activity event.
