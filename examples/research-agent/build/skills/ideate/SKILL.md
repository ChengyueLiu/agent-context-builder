---
name: ideate
description: "After the literature review: generate candidate theses, each with a falsifiable hypothesis and the cheapest experiment that could refute it; screen them; novelty-check the survivors with real queries; select one. Not for: Not for mapping the literature (Literature review) or turning the thesis into a spec (Approach design)."
---

# Ideation

## Goal

Take a position in a direction you have now read properly. The output is not a topic; it is a **thesis with the experiment that could kill it**, plus the record of everything else you considered and why it lost. This skill manages process; you manage judgment: what is worth proposing, what a reviewer would say, and which candidate you would actually work on.

## Inputs

| Input | Where |
|---|---|
| Direction and what "better" means | `brief.md` |
| The field | `library/landscape/landscape_report.md` |
| Gaps | `library/landscape/gap_summary.md` |
| Who does what, on which benchmark | `library/corpus/CORPUS_PAPERS.csv` and the report; `search_papers` for what the corpus does not hold |
| Already ruled out | `claims.md` entries with `reconsider-if`: paths already priced. Do not regenerate them unless their condition now holds |

Blocked when Literature review has not produced the landscape report and gap summary: ideas generated without a map are generic. Run Literature review first.

## Discipline

- **A good idea is one where the answer matters whichever way it goes.** If a negative result would not be worth writing down, the idea is weak however exciting the positive case looks.
- **No "apply X to Y"** unless the application reveals something surprising, and you say what the surprise would be.
- **Every idea carries what would kill it.** A candidate with no stated way to fail is a wish, not an idea; drop it at screening.
- **Scores order; they never decide and never enter the Claims list.** If you rate candidates, the number is a working aid inside `method/candidates.md`. It is not evidence.
- **Novelty is a search result, not an opinion.** The verdict comes from queries you actually ran, recorded verbatim (protocol in the reference).

## Stages

Three stages in order: **generate → screen → select**. Generating and judging are kept apart on purpose: judging while generating kills the unusual candidate before it is stated. Confirm each stage's output exists before starting the next.

### 1. Generate: 8-12 candidates, no judging

Read the inputs; the `reconsider-if` entries in `claims.md` are a banlist. Then write 8-12 candidates, each with all six fields, no exceptions:

1. **Summary**: one sentence.
2. **Core hypothesis**: what you expect to find and why, stated so it could turn out false.
3. **Minimum viable experiment**: the cheapest thing that would give a signal: which data, which systems compared, which metric, which baseline.
4. **Contribution type**: empirical finding, new method, theoretical result, or diagnostic.
5. **Risk**: LOW (likely works), MEDIUM (50-50), HIGH (speculative).
6. **Effort**: days, weeks, or months.

Prioritise candidates that are testable at modest cost with what this project can actually reach; likely to give a clear positive **or** negative result (both are results); differentiated from the papers in the corpus; and not "apply X to Y" without a stated surprise. Hold each against "does the answer matter whichever way it goes?" before writing it down.

Push for mechanism diversity: if three candidates would fail for the same reason, they are one candidate. Cover more than one of the gap kinds the gap summary names.

Write `method/candidates.md` (template below).

**Done when** 8-12 entries exist, each with all six fields, and at least three genuinely different mechanisms are represented.

Showing the user the full list before screening is a user decision point (see Decision rights): it is the last point at which an unusual candidate is still alive.

### 2. Screen: down to 4-6

For every candidate, in this order. A candidate that fails any one check is eliminated: record it with its reason, never drop it silently.

1. **Feasibility**: can this project actually run the minimum experiment? Data reachable, compute within budget, implementation tractable? Anything needing an unavailable dataset or a scale this project cannot reach is out.
2. **Quick novelty probe**: 2-3 targeted `search_papers` queries per candidate, with `purpose='novelty'` and the candidate id as `tag`. It only catches the obviously already-done; the full check on survivors comes in select.
3. **So-what**: if the experiment succeeds, does it change how anyone proceeds? If it fails, is the negative result worth writing down? A candidate that is only interesting when it wins fails here.

**Compare, don't rate in isolation.** Where two candidates are close, ask the question that separates them ("what would make me pick C3 over C5?") rather than giving each an absolute score. The dimensions worth comparing are in the reference. Any numeric ratings stay in `method/candidates.md`.

Update `method/candidates.md`: mark each survivor and append the Eliminated table. For each eliminated candidate that could become viable under different conditions (data appears, budget grows, a dependency ships), add an entry to the Claims list: `supported` (the elimination is a fact with evidence), the reason, and `reconsider-if`. This keeps the Claims list a map instead of a graveyard.

**Done when** 4-6 survivors are marked and every eliminated candidate has a recorded reason.

### 3. Select: novelty-check, attack, pick one

1. **Novelty check with real queries.** For each survivor, follow the novelty-check protocol in the reference. The verdict is `new` (name the closest work and the differentiator), `done` (cite it; the candidate is dead, record why) or `adjacent` (state precisely what is left undone), and it carries the queries you ran. A candidate whose novelty rests on searches you did not run is not checked; say so rather than guess.
2. **Devil's advocate, one pass, in character.** For the survivors together, answer as a hostile reviewer: the strongest objection to each; the most likely failure mode; how you would rank them for a serious venue; which two or three you would actually work on. Record the objection on each candidate, then **fold it back into the experiment**: if the reviewer says "your signal may just be measuring implementation variety", the minimum experiment gains the ablation that separates the two. An objection that changes nothing was not taken seriously.
3. **Pick one**, deciding on these in order:
   1. A kill criterion exists: what would refute it is stated and reachable.
   2. The answer matters either way: the negative result is worth writing down.
   3. The cheapest disconfirming test: how fast you can find out you are wrong.
   4. Feasibility, as the tie-break, not the lead criterion.

Write `method/position.md` (template below).

Picking the thesis is a user decision point (see Decision rights): present your pick with the runners-up and why each lost, and move on only with the user's choice. Everything downstream (the scoped literature review, the dataset, the code, the experiment) is scoped to this thesis; it is the cheapest thing to change now and the most expensive later.

Then add to the Claims list:
- The chosen thesis as an `open` entry, `source: ideate`, with `test:` pointing at its minimum experiment, noting that the pre-registered rule itself is frozen in Approach design (falsify stage).
- Each runner-up as a `supported` entry with why it lost and `reconsider-if`.

**Done when** `method/position.md` exists with a thesis, a named bar and the runners-up; every survivor in `method/candidates.md` carries a novelty verdict with its queries and a reviewer objection folded into its experiment.

Next: Literature review, scoped to the thesis's neighbourhood.

## Outputs

- `method/candidates.md`: every candidate with its six fields, survivors marked, the Eliminated table with reasons, and each survivor's novelty verdict and objection.
- `method/position.md`: the selected thesis and the bar it must clear; read by Approach design.
- Claims list entries: the thesis (`open`, with `test`), and the eliminated candidates and runners-up with `reconsider-if`.

## Pitfalls

- Judging while generating: it kills the unusual candidate before it is stated.
- A novelty verdict without the queries you ran: unrecorded queries make novelty an assertion, not a finding.
- Letting a score decide: a rubric used as a decision always finds a winner; scores order candidates and are not evidence.
- Carrying a candidate with no stated way to fail: no result could ever count against it, so it cannot become evidence.
- Three candidates that would fail for the same reason: they are one candidate, and the list only looks diverse.
- An objection recorded but not folded into the experiment: the reviewer raises it again after the experiment has run.

## Templates

`method/candidates.md`, at generate:

```markdown
# Candidates — <direction>

Generated: <N>. Stage: generate (not yet screened).
Source map: library/landscape/landscape_report.md · gaps: library/landscape/gap_summary.md

## C1 — <title>
summary: <one sentence>
hypothesis: <what you expect and why — falsifiable>
minimum experiment: <data · systems · metric · baseline>
contribution: empirical | method | theory | diagnostic
risk: LOW | MEDIUM | HIGH
effort: days | weeks | months
attacks gap: G<k>
```

Appended at screen:

```markdown
## Eliminated

| Candidate | Reason |
|---|---|
| C4 | already done — <id>, same mechanism and benchmark |
| C7 | needs a scale this project cannot reach (<what>) |
| C9 | result would not change anything either way |
```

Appended to each survivor at select:

```markdown
novelty: adjacent
  queries run: "<query 1>" (arxiv, 41 hits) · "<query 2>" (semantic_scholar, 12 hits) · "<query 3>" (corpus, 3 hits)
  closest: <id> — <what they did> — stopped at <what they did not do>
  differentiator: <the one sentence that says why this is not that>
objection: "<the strongest thing against it, in the reviewer's voice>"
experiment strengthened: <the control or ablation added because of it>
```

`method/position.md`:

```markdown
# Position

## Thesis
<one sentence — the claim this project will try to refute>

## Gap it attacks
G<k> from library/landscape/gap_summary.md — <one line>

## The bar
beat: <system/baseline, named>
on: <data>
by: <metric> — <how much counts as beating it>

## Why this one
<2-3 sentences: kill criterion, why the answer matters either way, cost to find out>

## Runners-up
C<k> — <why it lost> — reconsider-if <condition>
```

## Outputs

- **Idea candidates** (`method/candidates.md`): Every candidate with its six fields, survivors marked, the eliminated table with reasons, and each survivor's novelty verdict (with queries) and reviewer objection. When to write: Written at the end of Ideation's generate stage, when the full list goes to the user before screening; updated at screen and select. Can be rewritten. It counts only after the user confirms it.
- **Position** (`method/position.md`): The thesis, the gap it attacks, the bar (what to beat, on which data, by which metric and margin), why this one, and the runners-up with reconsider-if. When to write: At the end of Ideation's select stage; the user picks the thesis. Write a new version, keep the old one. It counts only after the user confirms it.

## Reference

Read [reference.md](reference.md) in this folder when you need it.
