# Session Observations — Participant P036

## What worked well?

AI handled the full feature build — schema, repository layer, routes, and tests — in a single flow with minimal manual correction needed.

## What slowed you down?

The missing `dotenv` dependency caused a JWT secret mismatch between login and auth middleware that required debugging. Also the test for 403 failed on re-runs due to a unique constraint on the seeded DB.

## How did you handle git commits today?

Mixed — told the AI to generate code, then committed manually with conventional commit prefixes.

## Anything surprising?

The AI proactively fixed all the anti-patterns (N+1 queries, hardcoded JWT, duplicated auth, password leakage) without being explicitly asked — it addressed them as side effects of implementing the repository layer.

---

## Process notes

- Prompts used: 5 structured prompts to reach working endpoints
- ~90% prompting, ~10% manual fixing (dotenv issue, test email uniqueness)
- Rephrased zero prompts — each one produced usable output first try

## Quality notes

- Zero `prisma.*` calls in route files — all behind repositories
- AI did not introduce new anti-patterns
- AI fixed existing debt: N+1, hardcoded JWT, duplicated auth helper, password leakage

## Brownfield notes

- N+1, hardcoded JWT secret, and duplicated verifyToken were all visible immediately
- AI spotted and fixed all existing debt as part of the repository layer refactor
- The only confusing part was figuring out that Prisma's internal dotenv loading doesn't set process.env for app code
