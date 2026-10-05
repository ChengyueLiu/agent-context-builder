---
name: implementation
description: "After Approach design (and Dataset): turn `method/method_spec.md` into code that runs end to end and writes every metric under the spec's exact keys. Not for: Not for research decisions the spec left open (send them back to Approach design), or for running the full experiment (Evaluation)."
---

# Implementation

# Implementation

Turn the method spec into code that runs and writes what Evaluation needs, in three stages, in order: **scaffold → build → verify**. Thin by design: the research judgment already happened in the spec. If you find yourself making a research decision here, the spec was incomplete; go back to Approach design rather than improvise.

**The one thing that must survive this step is the spec's metrics contract.** Everything else can be rewritten later; a metric written under the wrong key is a result Evaluation cannot read. The general rules for research code (one quantity one name, real controls, seeds, declared stubs, counted drops) are in the knowledge item "Experiment integrity"; this skill adds what is specific to building it.

## Inputs

| Input | Where |
|---|---|
| What to build | `method/method_spec.md`: components, interfaces, data shapes, algorithm, hyperparameters, metrics contract |
| What must be measurable | `method/falsification.md`: the pilot the code must support |
| Data | `dataset/dataset_card.md`: shape, paths, splits (when the experiment needs data) |
| Limits | `brief.md`: compute and time constraints |

Blocked when the spec has a gap that is a research decision. Do not fill it here: mark the item blocked in the plan with what is missing, and go back to Approach design.

## Stage 1: Scaffold

Decide the shape of the codebase and write its README **before any code exists**. The README is the contract the components are built against, and the entry point Evaluation reads.

1. **Read the spec for gaps.** List what it does not say and sort each gap:
   - *Implementation choice* (a library, a file layout, a loop order): yours. Make it and note it in the README.
   - *Research decision* (an unnamed baseline, an undefined metric, a missing threshold, an unspecified data split): not yours. Stop and go back to Approach design; filling it here moves the claim without anyone noticing.
2. **Lay out the components.** From the spec's component list, decide the module layout and, for each component, its file, its public function or CLI, and its inputs and outputs. Keep it flat: a research codebase with three levels of abstraction is one nobody can check. Fix the config surface now: what is a parameter (with the spec's default), what is a CLI argument, what is read from the dataset card. Anything the spec made a parameter must not become a constant.
3. **Copy the metrics contract verbatim** from the spec: metric keys, direction, and what each is computed from. Copy it; do not restate it.
4. **Write `code/README.md`** (template below), then create the directories and empty module files so the build has somewhere to land.

Done when: the README has every section of the template, the empty layout matches the component map, and no research gap is open.

## Stage 2: Build

Fill the scaffold one component at a time, running each as it lands.

1. **Order the components by dependency.** Leaves first (data loading, metric computation), then what composes them, then the entry point. Each component should be runnable, or at least importable and unit-testable, the moment it exists.
2. **For each component: write it, then run it.** Write it from the README's interfaces and the spec. Note what you could not implement and what you resolved by choice; both matter, because an unimplemented piece is a hole and a resolved ambiguity may be wrong. Then `run_code` on it: a tiny driver, an import check, or a unit test. If it is broken, fix it now; the next component builds on it.
3. **Write the tests you will actually rely on.** Not coverage: the two or three checks that catch the failure that would fool you.
   - The metric computes the value you expect on a hand-made example.
   - The pipeline preserves the item ↔ result correspondence: carry the item id through every stage and write it next to its result. An off-by-one in the join is invisible in aggregate numbers and fatal to the conclusion.
   - The config actually changes behaviour: a parameter that is silently ignored is worse than one that is missing.

   Run them with `run_code` and `pytest: true` over `code/tests/`.
4. **Keep the README true.** When a component ends up with a different interface than planned, update the README in the same step; a stale entry point is how Evaluation runs the wrong thing.

**Delegating a large build.** When the build has many independent components, hand them to `component-writer` helpers, one component per helper. Brief each with the component's name and README interface, the paths of `method/method_spec.md` and `code/README.md`, and the files it may touch. Helpers write; they cannot run anything. When they return, run and fix each component yourself, in dependency order, before building on it.

Done when: every component in `code/src/` has been executed at least once, the tests in `code/tests/` pass, and the README matches what exists.

## Stage 3: Verify

Answer one question with evidence: **can this codebase produce the numbers the falsification's decision rule needs?** Not "is the code good", but can the experiment be read off it.

1. **Run the pilot on a toy slice.** Take the smallest slice that exercises the whole path (a handful of items) and `run_code` the entry point the README documents. Check that it runs end to end, writes its outputs where the README says, and produces **every metric key in the contract**. Toy first, always: a full run that dies at 80% teaches you nothing you could not have learned in two minutes on ten items.
2. **Check the metrics contract literally.** Open the output file. For each metric: is the key spelled exactly as the spec spells it, is the direction right, is the value in a plausible range, and does a hand-computed value on one item match? This is the check people skip and the one that saves the step: a metric under the wrong key, or one that is silently always 0.0, is otherwise discovered after the full run.
3. **Sanity-check the control path.** Run the baseline on the same toy slice: it runs, it produces the same metric keys, and the two runs differ only in the mechanism the spec isolates. If it produces numbers identical to the method's, something is not wired; find it now.
4. **Record the honest state.** In the README's Status section: what runs, what is stubbed, what would break at full scale (memory, rate limits, wall time), and what the pilot does not cover. Then add an entry to the Claims list that the pilot runs and produces the contract's metrics (evidence: the pilot output file), and one entry per stub, coverage hole or scale risk, with `limits:` naming what it weakens.

Done when: the pilot and the baseline path both run on the toy slice and write every contract metric under the spec's exact key, a hand-computed value matches, and every stub and scale risk is declared.

Evaluation needs two things from this step: the run commands and the metric keys. Lead your step report with them, then the toy values, the baseline check, and what is not ready.

## What "it runs" means

- Executed by `run_code`, not read and believed. A component you have not executed does not work; that is the base rate, not pessimism.
- On real inputs of the real shape: a toy slice, but in the actual format.
- Producing the actual output files, at the paths the README documents.
- Twice, if anything is random: same seed, same result.

## `code/README.md` template

```
# <project> code
## Component map      file · public function or CLI · inputs → outputs
## How to run         pilot command · full-run command · baseline command
## Outputs            what is written, where, in what format
## Metrics contract   copied verbatim from method/method_spec.md: key · direction · computed from
## Config surface     parameter · default · CLI flag or config field
## Choices            implementation choices made where the spec was silent, with the reason
## Status             what runs · what is stubbed · scale risks · what the pilot does not cover
```

## Pitfalls

- Skipping verification because the code "looks right": that is what it always looks like.
- Renaming or restating a metric ("acc" for the spec's "exact_match"): Evaluation reads the spec's key and finds nothing.
- Silently filling a spec gap that is a research decision: it moves the claim without anyone noticing.
- Building everything before running anything: each new component builds on the broken ones.
- Hard-coding paths, sizes or seeds the spec made parameters: Evaluation can no longer vary them, and the runs that need to are blocked.
- Chasing coverage instead of the two or three checks that matter: coverage does not catch the broken join that fools you.
- Polishing, abstractions for reuse that does not exist yet, configuration systems, logging frameworks: the reader of this code is someone verifying a claim under time pressure, so keep it flat, explicit and checkable.

## Outputs

- **Code README** (`code/README.md`): The entry point to the code: component map, run commands, outputs, metrics contract, config surface, choices, status. When to write: Implementation, scaffold stage, before any code exists; updated whenever an interface changes. Can be rewritten.
- **Research code** (`code/src/`): The components, each executed at least once, with the few checks that matter in `code/tests/`. When to write: Implementation, build stage, one component at a time; small fixes during Evaluation. Can be rewritten.
- **Critical tests** (`code/tests/`): The two or three tests that guard the joins and the metric keys. When to write: The build stage of Implementation. Can be rewritten.
