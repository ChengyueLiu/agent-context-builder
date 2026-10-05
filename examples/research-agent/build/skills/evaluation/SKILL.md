---
name: evaluation
description: "After Implementation: run the pre-registered experiment, record every number against its claim and run, apply the decision rule literally, and update each claim's status. Not for: Not for designing the experiment or setting thresholds (Approach design), substantial code changes (Implementation), or writing up (Paper writing)."
---

# Evaluation

# Evaluation

This is the step where the research concludes something: an `open` claim in the Claims list becomes `supported`, `refuted` or `contested`. Four stages, in order: **plan → map → run → read**. The rules every number must meet (traceability, real controls, counted drops, gates before the comparison, what a result does not license) are in the knowledge item "Experiment integrity"; this skill is the procedure. The judgment is yours: how to realize the experiment, what a failure means, and whether a number is trustworthy enough to conclude on.

**The rule that governs this step: the decision rule was pre-registered in `method/falsification.md`. You execute it; you do not renegotiate it.** Reading results and then adjusting the threshold is the failure this whole chain exists to prevent. If the rule turns out to be unmeasurable, or does not decide the case in front of you, say so explicitly and stop the readout; that is a legitimate outcome. Quietly moving the line is not.

## Inputs

| Input | Where |
|---|---|
| What to test, and the rule | `method/falsification.md`: comparison, metric, decision rule, and the gating checks that separate a broken implementation from a wrong idea |
| Metrics contract | `method/method_spec.md`: metric keys, direction, how each is computed |
| Code | `code/README.md`: entry point, config surface, outputs |
| Data | `dataset/dataset_card.md`: splits, shape, known limits |
| The claim | the `open` Claims list entry whose `test:` points at the falsification |

Blocked when there is no pre-registered rule, or the code cannot produce the contract's metrics. Say which, and go back to Approach design or Implementation; do not write a criterion here. A criterion chosen after the code exists is not pre-registered, whatever the file says.

## Stage 1: Plan

Turn the rule into a run list. This is not designing an evaluation (that already happened); it makes the design executable.

1. **Copy the rule verbatim** to the top of `experiments/plan.md`, with the id of the claim it decides. Everything below serves this sentence; having it at the top stops the plan drifting into "interesting experiments".
2. **Derive the run list** the rule requires: usually the method and its control, sometimes across configs or data slices. Per run:
   - **system** (method, baseline, or a named variant) and **config**
   - **data**: which split, how many items
   - **required metric keys**: every key the rule mentions, spelled as the spec spells it
   - **held constant**: what must be identical to its comparison run (data order, seed, prompts, scoring code); this list is what makes it a control

   Add nothing the rule does not need: extra runs are not free, and they invite reading whichever one came out best.
3. **Name the gating checks** from the falsification's implementation-vs-idea section, and make them explicit run outputs where possible ("verifier agreement ≥ 0.6", "the control's own score is not degenerate", "revision count > 0").
4. **Cost it and define the pilot.** Estimate wall time and money for the full list and write it in the plan. The pilot is the smallest slice that produces every metric key, for checking the plumbing before spending the rest.

Done when: `experiments/plan.md` holds the rule verbatim with its claim id, the run list with all four fields per run, the gating checks, the cost estimate and the pilot definition.

## Stage 2: Map

Find out what the code can actually do before writing runners against assumptions about it.

1. **Map it statically.** `map_codebase` over `code/`, writing `experiments/code_map.json`: entry points, per-file CLI options, files that write structured results, the module and function inventory. Read the map, not the source.
2. **Check each planned run against the map:** which entry point runs it; which options set what the run varies (system, config, data path, seed, output path); where its results land, and in what format. Anything the plan varies that is not a CLI option or config field is hard-coded, and that blocks the run until fixed.
3. **Confirm the metric keys exist.** Check the README's metrics contract; if it is not conclusive, run the pilot entry point on a couple of items and look at the output file. A missing metric key is the most expensive thing to discover late: it invalidates every run made before someone noticed.
4. **Fix or send back what is missing** (an option, a metric, a baseline path). Make a small fix here and confirm it with `run_code`. A substantial one goes back to Implementation; note the reason in the plan.

Done when: every planned run has an entry point, options for everything it varies and a known output location, and every required metric key is confirmed in the output.

## Stage 3: Run

Execute the run list and get every number into `experiments/metrics.csv`, traceable to its claim and its run.

1. **Pilot first, always.** Run the pilot and check its output by hand: every key present, spelled right, values in a plausible range. Only then spend the rest of the budget.
2. **For each run, in this order:**
   1. Write the runner `experiments/runs/<id>/run.py`: thin; it reads the config, calls the code's entry point, and writes a results JSON. It must meet the runner contract below.
   2. `check_script` on it. A FAIL is not a style note: fix it and re-check before running.
   3. `run_code` it. On a non-zero exit, read the traceback, fix, re-run. Record a run that could not complete as `status: failed`; it is information about the method, not an absence of information.
   4. `record_result` with `claim_id`, `run_id`, `system`, `config`, `n`, `source`, and either `metric`/`value` or `from_json` over the results file. It refuses a row without a claim and a run, and an `ok` row with no value; that refusal is the point.
3. **Read the gating checks first.** A failed gate stops the readout: fix, re-run, then proceed. If the gates cannot be passed at all, stop: that is a finding about the implementation, not a result.
4. **Log the drops and degradations.** Count the items that errored, timed out or were skipped, and why, in the run's log and in the rows' `n` and `note`. Add degradations (drops, timeouts, a gate that needed several attempts) to the Claims list now, each with `limits:`, so the conclusion inherits them.

Each run directory holds `run.py`, `results.json` and the stdout log.

Done when: every planned run is recorded in `metrics.csv` (failed ones as failed), the gates have passed, and the drops are counted.

### Runner contract (what `check_script` enforces)

FAIL, do not run as is:
- no `main()`, or `main()` never called under a `__main__` guard: one entry, one path
- no structured output (JSON or CSV): a number printed in prose is a number nobody can re-read
- a silent `except: pass`: a failed run would look like a successful one
- a metrics dict built only from literal constants: a hard-coded result is a fabricated result, however well-intentioned the placeholder

WARN, run but know it:
- randomness imported but nothing seeded: the runs will not be reproducible
- a subprocess that discards stderr: a child that dies quietly takes the explanation with it
- no CLI surface: fine for a fixed pilot, a smell for a comparison that must vary exactly one thing

## Stage 4: Read

Apply the pre-registered rule literally and mark the claim.

1. **Confirm the gates passed.** If any failed, stop: the readout is invalid, the finding is about the implementation, and the claim is not marked.
2. **Compute the rule's quantities, then apply the rule.** Read the rows from `metrics.csv`, not your memory of the run; compute exactly the deltas the rule names and write them next to their thresholds. Then:
   - **supported**: the rule's success condition is met.
   - **refuted**: the failure condition is met. This is a real result: the assumption the falsification named is what is false.
   - **contested**: the rule's inconclusive band, or the runs disagree.

   If the rule does not decide this case (a situation it did not anticipate), say so explicitly and leave the claim `open` with the reason. A rule that failed to anticipate is a fact about your design; recording it honestly is worth more than a conclusion fitted afterwards, and a rule written now is not pre-registered for these numbers.
3. **Mark the claim.** Update its Claims list entry: `status:` from `open` to the verdict, `evidence:` pointing at `experiments/metrics.csv` and the run directory, and the numbers in one line. Keep the `test:` line; it is the record of what was pre-registered. Then check the neighbours: an entry this result contradicts becomes `contested`, with a pointer to it.
4. **Write `experiments/summary.md`** (template below). Above all, state what this result does **not** license.
5. **Decide what comes next** and say why in the summary: proceed to Paper writing, scale up, fix and re-run, revise the approach (back to Approach design, where the rejected candidates and their `reconsider-if` conditions are waiting), or stop. A `refuted` verdict goes to Paper writing like any other; when you report it, say plainly that it is a result, not a failure.

Done when: the claim's status is the rule applied to the recorded rows (or stays `open` with the reason), its evidence points at those rows, and the summary is written.

### `experiments/summary.md` template

```
# Evaluation summary — <claim id>
Rule (verbatim):
Runs:          id · system · config · data · n · status
Gates:         check · value · pass/fail
Numbers:       quantity · value · threshold
Verdict:       supported | refuted | contested | not decided by the rule — one sentence
Drops and degradations:
What this does not license:
Next step:     one, and why
```

### `experiments/metrics.csv`

One row per claim, run, system, config and metric, with the columns `recorded_at, claim_id, run_id, system, config, metric, value, n, status (ok | partial | failed), source, note`. It is written only through `record_result`, and only appended: five runs are five comparable data points. Everything later reads this file; a number outside it cannot support a Claims list entry.

## Pitfalls

- Running before mapping the code: you end up guessing commands and config, and a run against a guessed option silently measures the default.
- Reporting a null without the power to detect the effect: too few items cannot tell "no effect" from "not enough data", so say what effect size the runs could have detected.

## Outputs

- **Evaluation plan** (`experiments/plan.md`): The pre-registered rule verbatim with its claim id, the run list, gating checks, cost estimate and pilot. When to write: Evaluation, plan stage, before any run. Write a new version, keep the old one.
- **Code map** (`experiments/code_map.json`): Each experiment's entry point, parameters, and where its results land. When to write: The map stage of Evaluation. Can be rewritten.
- **Metrics table** (`experiments/metrics.csv`): One row per claim, run, system, config and metric, with n, status and source. When to write: After every run, through `record_result`. Append only.
- **Run directories** (`experiments/runs/`): Each run's `run.py`, `results.json` and stdout log. When to write: One directory per run, written when the run executes. Append only.
- **Evaluation summary** (`experiments/summary.md`): Runs, gates, numbers against thresholds, verdict, drops, what the result does not license, next step. When to write: Evaluation, read stage, after the rule has been applied. Write a new version, keep the old one.
