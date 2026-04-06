# How This Experiment Works

This document describes the automated infrastructure behind the workshop.
You don't need to read it to participate — it's here for transparency.

---

## The pipeline

When you push to your `participant/PXXX` branch:

```
git push origin participant/P007
         │
         ▼
GitHub Actions triggers (.github/workflows/experiment-metrics.yml)
         │
         ▼
Checks out your code on a clean Ubuntu runner
         │
         ▼
npm run score  →  scripts/score.ts analyses your repo
         │
         ▼
score.json written to your branch (committed by github-actions[bot])
         │
         ▼
Argos dashboard pulls score.json from all participant branches → live results
```

**Every push overwrites the previous score.** Re-pushing is safe and idempotent.
The `[skip ci]` tag on the bot commit prevents an infinite loop.

---

## What score.ts checks

The script runs entirely from your code — no network calls, no external dependencies.

| Check | How |
|-------|-----|
| **Self-describing** | Does README.md contain non-trivial text? |
| **Bounded** | Does `grep` find `db.prepare / db.run / db.get / db.all` inside route files? |
| **Verifiable** | Does `npm test` exit 0? Is line coverage ≥ 60%? |
| **Defended** | Does `tsc --noEmit` exit 0? |
| **Auditable** | Are ≥50% of git commits prefixed with conventional types? Is there a `.md` file with a design decision? |
| **Composable** | Scored via hidden live test after session |
| **Executable** | Scored via hidden live test after session |

---

## Why scoring is blind

`score.ts` receives no condition label (A or B). It reads only the code on your branch.
The script is identical on both condition-a and condition-b — there is no branch-specific
weighting or adjustment. Anyone can reproduce the score by cloning your branch and running
`npm run score`.

---

## Consent and participant data

Before your first code commit, you fill in `INTAKE.md`:
- A consent checkbox (your push is your agreement to participate)
- Three questions about your AI tool usage history

This data is stored in `score.json` on your branch alongside your scores.
It is used only to slice results by experience level in the analysis.
No personally identifying information is collected beyond your GitHub username.

If `INTAKE.md` is missing or consent is not ticked, the scoring pipeline will
print a warning in the Actions log. Your score is still recorded, but incomplete
intake data may result in your session being excluded from subgroup analysis.

---

## Score format

`score.json` structure:
```json
{
  "meta": { "repo": "...", "commit": "abc123", "branch": "participant/P007", "timestamp": "..." },
  "gs_scores": {
    "self_describing": { "score": 1, "max": 1 },
    "bounded":         { "score": 2, "max": 2 },
    "verifiable":      { "score": 2, "max": 2, "coveragePct": 74.3 },
    "defended":        { "score": 1, "max": 1 },
    "auditable":       { "score": 2, "max": 2 },
    "composable":      { "score": null, "max": 3, "details": "Pending live test" },
    "executable":      { "score": null, "max": 3, "details": "Pending live test" },
    "total_automated": { "score": 8, "max": 8 }
  },
  "intake": {
    "status": "complete",
    "consented": true,
    "q1": "6–18 months",
    "q2": "daily",
    "q3": "confident and systematic"
  },
  "external_metrics": {
    "tscErrors": 0,
    "eslintErrors": 2,
    "testCoverage": 74.3,
    "duplicatePct": 4.1,
    "branchCount": 12
  }
}
```