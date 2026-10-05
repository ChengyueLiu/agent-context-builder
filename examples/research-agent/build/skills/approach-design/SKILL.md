---
name: approach-design
description: "After the thesis is chosen and its neighbourhood reviewed: turn it into a method under a complexity budget, freeze a spec someone else can build, and pre-register the rule that decides the claim. Not for: Not for choosing ideas (Ideation), finding data (Dataset), writing code (Implementation) or running the experiment (Evaluation)."
---

# Approach design

## Goal

Turn the selected thesis into a buildable, measurable, falsifiable method. The output is not prose about an idea; it is a spec another agent can implement, an experiment that could prove it wrong, and a claim in the Claims list that Evaluation will later settle. This skill manages process and discipline; you manage judgment: what the mechanism should be, how simple it can be, and what would falsify it.

Core rule: **do not plan a large experiment suite on top of an unstable method.** Stabilise the thesis first, then turn it into experiments.

## Inputs

| Input | Where |
|---|---|
| The question and what "better" means | `brief.md`: main question, research type, constraints, evaluation axes, exclusions |
| The thesis and the bar it must clear | `method/position.md` (from Ideation) |
| The gap | `library/landscape/gap_summary.md` |
| Baselines and evaluation practice | `library/landscape/landscape_report.md` and `library/corpus/CORPUS_PAPERS.csv`: what exists for this problem, what it is evaluated on, with which metrics; the cited papers for details |
| Already ruled out | `claims.md` entries with `reconsider-if`: paths already priced |

Blocked when there is no `method/position.md` (run Ideation), or when the thesis has never been grounded against the literature (run Literature review scoped to the thesis first).

## Three hard rules

- **Grounded, not invented.** Every claim about what exists ("no one has combined X with Y", "the standard baseline is Z") comes from the landscape report, the corpus, a `search_papers` search you ran, or a cited paper, never from your prior. Ungrounded novelty is the characteristic failure of this step.
- **Falsifiable or unfinished.** A spec without a concrete experiment that could prove it wrong is not done. "It would improve results" is not falsifiable; "it beats Z on D by ≥X on metric M, and if it does not, assumption A is wrong" is.
- **Buildable with what exists.** The minimal experiment must be runnable with data the Dataset step can produce and the compute the brief's constraints allow. If not, the design is incomplete: fix it. If only relaxing a constraint in the Project brief would fix it, that is a change to the brief, which only the user can make.

## Stages

Three stages in order: **thesis → spec → falsify**. The order is the method: a spec written on a moving thesis gets rewritten, and a decision rule written after results exist is not a pre-registration. Confirm each stage's output exists and passes its gate before starting the next.

### 1. Thesis: make it hold still before designing anything

Prerequisites: `method/position.md` and `brief.md`. Write `method/proposal.md`:

1. **Copy the problem anchor verbatim.** Copy the brief's main question, evaluation axes and exclusions into the top of `method/proposal.md` word for word. A paraphrase is where drift starts. Every later revision of this file re-copies it. At every step below, hold the design against it: if a change makes you answer a different question, it is drift, not an improvement.
2. **Name the technical gap.** One paragraph, from the gap summary and the scoped literature review: what specifically is missing or broken in the current best approach. Not "little work exists on X"; what breaks, and where.
3. **State the method thesis and argue it is the smallest.** The mechanism in one or two sentences, and why it is the smallest adequate intervention: what simpler thing you considered and why it does not reach the bottleneck. Prefer the minimal mechanism that directly fixes the bottleneck; a larger system that also works is a worse answer, because it makes attribution impossible and the result unreadable.
4. **Pick one dominant contribution**, with at most one supporting contribution. Three contributions are three papers or a mess; choose.
5. **Set a complexity budget before designing**, and treat it as binding. Fixed after the fact it is a rationalisation; fixed before, it kills bloat while bloat is still cheap to kill.

   ```markdown
   ## Complexity budget
   new components: <= N
   new dependencies: <name them, or "none">
   new hyperparameters: <= N
   added inference cost: <bound>
   what is explicitly NOT in scope: <list>
   ```
6. **Name the failure modes**: two or three ways the mechanism could fail, each with what you would *observe* when it happens. Without this, the falsify stage cannot tell a broken build from a wrong idea.

`method/proposal.md` then holds: Problem Anchor (verbatim) · Technical Gap · Method Thesis with the smallest-adequate argument · Contribution Focus · Complexity Budget · Failure Modes.

**READY gate.** Do not leave this stage until all four hold; otherwise revise here, because an unstable thesis wastes every expensive stage downstream.
- No drift: the thesis still answers the anchor's question.
- Exactly one dominant contribution.
- The design fits its own complexity budget.
- Each failure mode has an observable.

The thesis entry in the Claims list (`source: ideate`) stays `open`; note in it that the decision rule is frozen in the falsify stage.

### 2. Spec: freeze what someone else will build

Prerequisite: `method/proposal.md` past its READY gate.

1. **Write `method/method_spec.md` to the spec contract** in the reference, so the implementer never has to guess: commitment; components and interfaces with data shapes; the algorithm at a level someone else could re-derive step by step, not intent-level; every hyperparameter with a default and why; the metric contract; baselines and comparison protocol; failure modes with the signal you would actually look at; unknowns, listed plainly, never a guess dressed as a decision.

   The **metric contract** gives each metric its canonical key, its direction (is higher better?), how it is computed, and what must be logged. `code/README.md` and `experiments/plan.md` copy these four verbatim later; restating them is how they drift apart (one quantity, one name: see Experiment integrity).
2. **Stay inside the complexity budget.** Over budget means one of two things, and you must say which: the budget was wrong (revise it deliberately, in writing, in `method/proposal.md`) or the design bloated (cut it). Silently exceeding it defeats the point of having set it.
3. **Feasibility gate: check, do not assume.**
   - Data: can the Dataset step actually produce what this needs? Check `dataset/` if it exists; otherwise state exactly what must be built.
   - Compute and time: inside the brief's constraints?
   - Measurement: is every metric in the contract computable from what the spec says to log?

   Any failing check means the design is not finished: fix the spec, or, if only the brief's constraints stand in the way, raise it with the user (see the hard rules). Never pass on a spec that cannot be run.

### 3. Falsify: the cheapest experiment that could kill it, with its rule frozen

Prerequisite: `method/method_spec.md`. Write `method/falsification.md`:

1. **The minimal experiment.** Not the full evaluation; the cheapest thing that could prove the approach wrong:
   - comparison: this approach vs which baseline, named;
   - data: which dataset, what size;
   - metric: from the spec's metric contract, copied verbatim;
   - scale: a fraction of the full evaluation.
2. **The pre-registered decision rule**, written as a sentence a machine could execute, with the numbers in it:

   ```
   Δrecall@10 >= +0.03  → supported
   Δrecall@10 <= -0.03  → refuted
   otherwise            → tie-break on nDCG@10 (±0.02), then runtime
   ```

   This is the hinge of the project. Evaluation reads it literally and may not renegotiate it, and neither may you once it is written (pre-registration: see Experiment integrity). If Ideation left an *expected* outcome ("+8-12 points"), that is a prediction, not a rule: pick the number below which you would genuinely abandon the thesis, and write that.
3. **Broken-implementation vs wrong-idea gate.** State what you would see if the *implementation* is broken rather than the *idea* wrong, using the failure-mode observables from the spec: for example, the baseline itself fails a sanity check, the metric disagrees with a hand-computed example, or the configuration provably does not change behaviour. The two need opposite responses, and telling them apart after the fact is nearly impossible. Evaluation runs this gate first; a number that fails it is not a result.
4. **Budget, risks, retreat.** What running this costs; the top 2-3 risks, each with an early signal ("if the pilot shows …, this is failing"); and the retreat, what you fall back to. A design with no retreat becomes sunk cost.

Then update the thesis entry in the Claims list:

```
test: method/falsification.md#rule · rule: <the rule, verbatim>
```

It stays `open` until Evaluation produces evidence. That transition, open to supported or refuted by this rule, is what "the research concluded something" means.

Downstream: Dataset reads what data the experiment needs, Implementation builds from `method/method_spec.md`, and Evaluation judges against this rule.

## Outputs

- `method/proposal.md`: the stabilised thesis: anchor verbatim, technical gap, thesis with the smallest-adequate argument, contribution focus, complexity budget, failure modes.
- `method/method_spec.md`: what to build and what to measure; read by Implementation and Evaluation.
- `method/falsification.md`: minimal experiment, pre-registered rule, broken-vs-wrong gate, budget, risks with early signals and the retreat; read by Dataset and Evaluation.
- The thesis entry in the Claims list, updated with its `test` and rule.

## Pitfalls

- Specifying a thesis that is still moving: the spec gets rewritten and every experiment planned on it is wasted.
- A decision rule without numbers in it: it cannot be applied literally, so it ends up decided after the results, which is not evidence.
- Exceeding the complexity budget silently instead of revising it in writing: the budget only kills bloat if crossing it is a visible decision.
- Unknowns dressed as decisions: the implementer builds on a guess nobody knows was a guess.
- Designing before the gap is grounded: you get a plausible approach to a problem the field already solved.
- A spec only its author could implement (missing interfaces, data shapes, or "how do I know it worked"): the implementer guesses, and the result measures the guess.
- Designing the paper's story instead of the approach: the story is written from the results in Paper writing; shaping the method around a narrative now bends the design.

## Outputs

- **Proposal** (`method/proposal.md`): Problem anchor verbatim, technical gap, method thesis with the smallest-adequate argument, contribution focus, complexity budget, failure modes. When to write: Approach design, thesis stage; revised when the thesis or the complexity budget changes, re-copying the anchor each time. Can be rewritten.
- **Method spec** (`method/method_spec.md`): What to build and measure: components and interfaces with data shapes, algorithm, hyperparameters, metric contract, baselines, failure modes, unknowns. When to write: Approach design, spec stage, after the proposal passes its READY gate. Write a new version, keep the old one.
- **Falsification plan** (`method/falsification.md`): Minimal experiment, the pre-registered decision rule (frozen once written), broken-vs-wrong gate, budget, risks with early signals, retreat. When to write: Approach design, falsify stage, before any result exists. Write a new version, keep the old one.

## Reference

Read [reference.md](reference.md) in this folder when you need it.
