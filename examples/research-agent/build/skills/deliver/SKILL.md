---
name: deliver
description: "After Paper writing: package what the project established (claims with their evidence, the paper draft, the artifacts worth keeping, verified citations, open questions) into `deliverables/` for the user to approve. Not for: Not for writing the paper or settling open claims, and not a dump of everything the project produced."
---

# Deliver

# Deliver

Package what the project actually established into a handoff someone else can use, in two stages: **assemble → package**. Everything here already exists in the workspace; the work is selecting what is provable, verifying it still resolves, and stating the boundary of what was shown. The package includes the paper draft from Paper writing.

**The honesty rule: a handoff that overstates is worse than no handoff.** Whoever picks this up will build claims on top of it, and they cannot see the runs. Every claim in the package carries its evidence, and everything open is listed as open.

## Inputs

| Input | Where |
|---|---|
| What was established | `claims.md`: the Claims list is the source; `supported` entries are the candidates |
| The question | `brief.md` |
| The paper | `paper/`: the draft and `refs.bib` from Paper writing |
| The artifacts | `library/`, `method/`, `dataset/`, `code/`, `experiments/` |
| Citations | `library/corpus/CORPUS_PAPERS.csv` |

If nothing in the Claims list is `supported` or `refuted`, the project has no established result: say so plainly in the handoff rather than packaging material as evidence. Saying so is the correct output.

## Stage 1: Assemble

Work out what the project can actually claim, by walking the Claims list and checking that every claim's evidence still resolves. These are working notes, not a file.

1. **Sort every entry into four piles:**
   - **established** (`supported`): candidates for the handoff
   - **refuted**: results, and they go in the package too
   - **open**: what was not settled, including anything the project set out to do and did not
   - **contested**: evidence both ways; the most interesting and the easiest to drop by accident
2. **Verify the evidence; do not trust the list.** For each established claim, open its evidence pointer and check that the thing it points at still says what the entry says. Pointers rot: files get rewritten, a metric gets renamed, a run gets superseded. An entry whose evidence no longer supports it is not established: demote it to `open` and say why. For claims resting on `experiments/metrics.csv`, read the actual rows: the numbers, the sample size, and whether the run's status was `ok`. If a demotion touches a sentence in the paper draft, fix the draft (Paper writing) before packaging it.
3. **Collect the boundary conditions:** every `limits:` entry and every degradation the project carried (corpus coverage, pilot scale, synthetic data, skipped sources, gates that needed retries). They are not footnotes: they define what the established claims mean, and the next reader has no other way to learn them.
4. **Pick the artifacts worth taking.** For each established claim, the artifact that would let someone check it: the landscape report, the method spec, the metrics CSV, the dataset card, the run directory. Prefer entry-point files over whole directories: a handoff nobody can navigate does not get used. Always take the paper draft and `claims.md`.

If verification demoted so much that little is left, say so plainly and treat the demotions as the finding.

## Stage 2: Package

Write the handoff and freeze what goes with it, so the package stands on its own outside this project.

1. **Write `deliverables/handoff.md`**: the six sections of the template below, in order.
2. **Export the citations.** `export_citations` with the handoff, `claims.md`, `library/landscape/landscape_report.md` and `paper/refs.bib` as `used`, writing `deliverables/references.bib`. Entries marked `% UNVERIFIED` lack an identifier: list them in the handoff so the reader knows to verify them, and never invent an id to make the file look clean.
3. **Freeze the artifacts.** Copy each artifact from stage 1's list into `deliverables/`, including the paper draft and `claims.md`. Add one line per item to `deliverables/manifest.md`: the source path, the claim id it supports, a one-line note. The manifest is what makes the copy checkable rather than just a copy. An artifact whose claim is still `open` may go in as material, labelled so, never as evidence.
4. **Read the package as an outsider.** Open only what is in `deliverables/` and ask: could someone who has never seen this project understand what was claimed, on what evidence, and what is missing? Fix what fails; usually an unexplained pointer, or a claim whose number lives only outside the package.
5. **Get the package approved.** This is a user decision point (see Decision rights): present what holds, what does not, what is open, the unverified citations, and the paper draft. Nothing leaves the project before the user approves. Then mark Deliver done in the plan with what the package covers, so a later session knows what has gone out.

Done when: the handoff has all six sections, every established claim in it carries a pointer and its number that resolve inside the package, every frozen copy has a manifest line, unverified citations are listed, and the user has approved the package.

## `deliverables/handoff.md` template

```
# Handoff — <project>

## 1. Question
The main question from the Project brief, verbatim, and one paragraph on why it mattered.

## 2. What was done
The steps actually run, a few lines each, with the numbers that characterize them
(corpus size, runs, sample sizes). Points to the paper draft.

## 3. What holds
Per established claim: the statement · the evidence (pointer + the number) · the
conditions under which it was shown. This is the section a reader builds on.

## 4. What does not hold
Refuted claims, and the assumption each one shows to be false. Do not soften this;
it is the most useful part for anyone continuing the work.

## 5. What is open
Unsettled questions, contested entries, the paths rejected along the way with their
reconsider-if conditions, the unverified citations, and the recommended next steps.
This is the map that stops the next person redoing the dead ends.

## 6. Boundaries
The collected limits: coverage, scale, synthetic data, anything that bounds section 3.
State plainly what these results do not license.
```

## Pitfalls

- Packaging the plan instead of the result: what was intended is not what was shown.
- Shipping everything the project produced instead of what the claims need: a package nobody can navigate is not used.
- Promoting an artifact whose claim is still `open` to evidence: the reader will build on it as if it were shown.
- Dropping refuted results, or burying them in the limitations: a refutation is a result the next reader needs, and silently omitting it is the one thing that makes a handoff untrustworthy.
- Leaving unverified citations unmarked: the reader will cite them as checked.
- Leaving out the degradations: coverage limits, skipped sources and pilot scale all bound what the claims mean.

## Outputs

- **Handoff** (`deliverables/handoff.md`): Six sections: question, what was done, what holds, what does not, what is open, boundaries. When to write: Deliver; the user approves the whole package (decision point 5) before it leaves the project. Write a new version, keep the old one. It counts only after the user confirms it.
- **Package references** (`deliverables/references.bib`): BibTeX from `export_citations` for everything the package cites; unverified entries marked and listed in the handoff. When to write: Deliver, package stage. Can be rewritten.
- **Package manifest** (`deliverables/manifest.md`): Per item: source path, the claim id it supports, a one-line note. When to write: Deliver, package stage, one line per frozen copy. Can be rewritten.
