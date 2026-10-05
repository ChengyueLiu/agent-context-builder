# Claim route

## When to choose it

When the project puts forward a thesis and tests it with experiments: a new method, an empirical finding, or a diagnostic. Not for writing a survey of the literature.

## Steps

1. **Alignment** (`alignment`) → `brief.md`. *User decision: confirm the Project brief.*
2. **Literature review** (`literature-review`) → `library/`: corpus, landscape report, gap summary.
3. **Ideation** (`ideate`) → `method/candidates.md`, `method/position.md`. *User decisions: see the full list of candidates before screening; pick the thesis.*
4. **Literature review, scoped to the thesis** (`literature-review`) → the thesis's neighbourhood, added to `library/`.
5. **Approach design** (`approach-design`) → `method/proposal.md`, `method/method_spec.md`, `method/falsification.md`.
6. **Dataset** (`dataset`) → `dataset/`: dataset card and selection report. *User decision: switch to synthetic data when no suitable dataset exists.*
7. **Implementation** (`implementation`) → `code/`.
8. **Evaluation** (`evaluation`) → `experiments/`: metrics and summary; claim statuses updated in `claims.md`.
9. **Paper writing** (`writing`) → `paper/`.
10. **Deliver** (`deliver`) → `deliverables/`. *User decision: approve the handoff package before it leaves the project.*

Run a retrospective (`review`) at the end of each step.

## Starting point

Whatever the user brings, start with Alignment. With only a direction, scope the problem from scratch. With an idea, scope it and test it at Ideation. With work in progress (a plan, code, data, a draft), read it first, record in the brief which steps it already covers, and continue from the first step whose output is missing.

## Deliverables

- The handoff package in `deliverables/`: claims with their evidence chains, the paper draft, the artifacts worth taking away, verified citations, and an honest list of open questions.
- The Claims list: every claim with its status and evidence.
- The experiment records: enough to reproduce every number.

## Done criteria

Done = every claim in the Claims list is supported, refuted, or contested, with its evidence recorded; the paper draft and the handoff package are written; and the user has approved the package.

A refuted thesis is a result, not a failure. Honestly reporting that a claim doesn't hold up is worth more than scraping together support for it.

## Fallback

If the novelty check finds the thesis already done, or Evaluation refutes it, go back to Ideation with what you learned. If a gating check fails, the implementation is broken: go back to Implementation, fix it, re-run, and conclude nothing about the claim. If the problem itself has to change, go back to Alignment and get the brief confirmed again.
