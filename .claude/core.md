# gs-workshop-taskflow-b — Core

> Always loaded. Contains only what is true across all domains.
> Hard limit: 50 lines. If it grows, move the excess to a domain node.

## Domain Identity
- [ ] Did you need to repeat or rephrase any prompt?

## Tags
[UNIVERSAL] [API] [DATABASE] [AUTH] [LIBRARY] [FINTECH]

## Primary Entities
- ```bash
git clone https://github.com/pragma-works/gs-workshop-taskflow
cd gs-workshop-taskflow
git checkout condition-b
git checkout -b participant/P007    # replace P007 with your number
cp .env.example .env          # Mac/Linux
copy .env.example .env        # Windows
npm install
npm run db:push               # creates the SQLite database
npm run db:seed               # loads test users and boards
```

> **Before you write any code:** open `INTAKE.md`, fill in your developer profile answers, tick the consent box, and commit it.

## Layer Map
```
[API/CLI] → [Services] → [Domain] → [Repositories] → [Infrastructure]
Dependencies point inward. Domain has zero external imports.
```

## Invariants
- Every public function has a JSDoc with typed params and returns
- No circular imports (enforced by pre-commit hook)
- Test coverage ≥80% on all changed files