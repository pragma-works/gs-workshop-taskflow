# ADR 0006: Mutation Testing Baseline With Stryker

Date: 2026-04-10
Status: Accepted

## Context

The workspace quality goals explicitly include mutation testing.
Once service-level unit tests existed, the codebase finally had a layer suitable for targeted mutation analysis.

Running mutation testing directly against the broader integration suite would be slower and would provide less focused feedback than mutating the service layer under unit tests.

## Decision

Mutation testing is introduced with Stryker and scoped initially to `src/services/**/*.ts`.

The mutation campaign uses:

- Stryker core
- the Vitest runner
- the TypeScript checker
- the service-level unit test suite as its execution baseline

## Consequences

### Positive

- the team now has a stronger signal than line coverage alone
- weakly asserted service behaviors are easier to identify
- mutation results create a concrete backlog for improving unit tests

### Negative

- mutation testing increases execution time compared to normal test runs
- the first score is modest and reveals current coverage weaknesses
- the infrastructure adds configuration overhead to the project

### Current Baseline

- scoped target: service layer
- baseline mutation score: 32.81
- HTML report output: `reports/mutation/mutation.html`

### Follow-Up

- improve unit tests around surviving mutants, especially in `activity-service`
- add stronger assertions around negative paths and error messages
- reassess mutation scope once repository and contract coverage grows
