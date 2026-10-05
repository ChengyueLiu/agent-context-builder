---
name: dataset
description: "After Approach design: work out what the data must make observable, search public datasets, judge each for its intended use, and pick one or, with the user's agreement, build a synthetic set. Not for: Not before `method/falsification.md` exists, and never for producing results or model outputs: this step produces stimuli only."
---

# Dataset

## Goal

Get the data the experiment needs. Work out what the claim requires the data to demonstrate, search public datasets, judge each candidate as dataset + intended use, and either pick one or abstain and, with the user's agreement, build a synthetic stimulus set to a designed strategy. This skill manages process and discipline; you manage judgment: what the claim actually requires of data, whether a candidate can carry it, and whether to abstain.

## The rule that shapes everything

> **The dataset is a stimulus artifact for a later experiment. It never contains model responses, scores, verdicts or outcomes; those are the experiment's outputs.**

A dataset that carries results is contaminated for every future evaluator. The rule is enforced in the strategy's construction variables, in the `datapoint-generator` brief, and in your review of what comes back.

## Inputs

| Input | Where |
|---|---|
| The claim and what would falsify it | `method/method_spec.md` and `method/falsification.md` (the comparison, metric and decision rule) |
| What "better" means | `brief.md` evaluation axes |
| What the field evaluates on | `library/landscape/landscape_report.md`: the recurring datasets and metrics are the default candidates |
| Constraints | `brief.md`: compute, time, licence and usage limits |

Blocked when the experiment is not specified: without knowing what will be measured, "the right data" is undefined. Run Approach design first.

## Stages

**need → search → decide → (synthesize)**, in order, never skipping ahead. Synthesize runs only when decide abstains and the user agrees; that is the design, not a fallback for laziness. After each stage, confirm its outputs exist and are non-empty: a missing file means the stage is not done, whatever you remember doing.

Research-design documents are Markdown; only the datapoints are JSON. A schema forced onto the requirement or the strategy degrades the reasoning: they are documents you argue with, not records you serialize.

### 1. Need: the data requirement, before looking at any dataset

Look first and you will find something plausible and bend the claim to fit it.

1. **Read the experiment, not the idea.** From `method/falsification.md` take the literal comparison: which systems, on what data, scored by which metric, with which decision rule. The data must make *that* measurement possible, not the general topic.
2. **Write the requirement**, four concrete fields:
   - **Phenomenon**: what must be observable for the claim to be testable at all (e.g. "instances where a first-turn tool choice is wrong and the failure is observable before the final answer").
   - **Form**: the unit and its shape: what one item contains, what the system under test receives, and what is held back.
   - **Labels / ground truth**: what must be known per item for the metric to be computable; if nothing is labelled, how the metric gets its truth.
   - **Constraints**: the size floor the decision rule needs to be readable, licence and usage limits, and anything the brief's constraints impose.

   **Do not name candidate datasets here**: naming one turns the rest of the step into an argument for it.
3. **Ask the review what the field uses.** From the evaluation-practice part of the landscape report and the corpus, list the datasets and metrics that recur for this problem, plus any dataset the user named in `brief.md` or `materials/`. They are the first candidates, and using what the field uses is itself an argument: a result on a standard benchmark travels further than one on a private set. Note where the standard sets do *not* contain your phenomenon; that gap is the reason you may end up abstaining.
4. **Draft 4-8 search phrasings** of three kinds: the phenomenon in the field's vocabulary; the task or format ("multi-turn tool call traces with failure labels"); and **mismatch probes** aimed at what would disqualify a candidate ("single-turn only", "synthetic-only"), so decide sees the risks and not just the hits.

Write `dataset/requirement.md`: phenomenon · form · labels/ground truth · constraints · what the field standardly uses · the search phrasings. Add the data requirement to the Claims list as `supported`, with evidence pointing at the report's evaluation practice and at `method/falsification.md`: it is a fact about the field, and later steps re-read it instead of re-deriving it.

### 2. Search: a pool wide enough that abstaining means "nothing exists"

1. **Run every phrasing** with `search_datasets` into `dataset/candidates.csv` (it appends). Cover HuggingFace (`source: hf`), where public data usually lives; OpenAlex (`source: openalex`), because many benchmarks exist only as a paper with the artifact behind it, and that is still a candidate; and the field's standard datasets by name: if one does not show up in a generic search, search it directly rather than concluding it is absent.
   - **Phrase per source.** HuggingFace matches names and tags near-literally: short, name-like queries ("tool use", "multi-hop QA") find things; a four-word natural phrase finds nothing. OpenAlex handles the longer descriptive phrase. Running the same long phrase on both and concluding "no data exists" is a search failure, not a finding.
   - **Use the community's words.** Three phrasings that all use your own words are one phrasing.
2. **Run the mismatch probes too.** A candidate that looks perfect until you learn it is single-turn only should reach decide with that evidence attached.
3. **Prune the plainly irrelevant; keep the near-misses.** Decide's job is to say precisely why a near-miss fails, and that sentence is what makes an abstention credible.

Record the phrasings you ran in the search archive in `records/`, so a later reader knows the search's shape. Record what you could not search (sources that need a key, gated datasets, anything behind a login) in the `limits` of the data-requirement entry: it is a coverage limit. An empty pool after an honest search is itself the finding that leads to abstaining.

### 3. Decide: pick one, or abstain

The abstention is the highest-value act in this step: every weak shortlist silently redefines the research question.

1. **Review each serious candidate** with the candidate review in the reference, judging `dataset + intended use`, not the dataset's name: "is X good?" has no answer; "can X carry THIS claim under THIS metric?" does. Read the actual dataset card or paper; description snippets are not evidence. Cap deep reviews at about five; if more look serious, the requirement is too loose: go back and tighten it.
2. **Pick or abstain.** Pick when a candidate genuinely operationalizes the phenomenon, the metric is computable from what it contains, and the mismatches are ones you can name and live with. Otherwise abstain: write `abstain: true` and do **not** output a weak shortlist. **Never compute the decision from a score**: no threshold, no weighted average of confidences. "Does this data make the claim testable?" is a judgment; a rubric that automates it always finds something close enough.
3. **Write the card and the report.** `dataset/dataset_card.md` is the entry point every later step reads: what the data is, unit and shape, size, provenance, licence, known biases, public or synthetic, and, if picked, exactly which parts of the requirement it satisfies and which it does not. If you abstained, the card says so and points at what synthesis would build. `dataset/selection_report.md` records every candidate, kept or rejected, with the reason and the evidence it rests on, and `abstain: true/false` with the argument.
4. **Record the rejections as knowledge.** Each rejected candidate becomes a Claims list entry: `supported` (the rejection is a fact with evidence), the reason at mechanism level, and `reconsider-if` (e.g. "if the claim narrows to single-turn", "if the authors release the labelled split they promise"). Add the pick or the abstention with its reason. When abstaining, also add the entry that states what the field's public data collectively cannot do; the shared reason across rejections is usually the most valuable entry of all.

If you picked, the step ends here. If you abstained, switching to synthetic data is a user decision point (see Decision rights): it commits the project to building data. Present the serious candidates one line each with why they fail, the decision, and what synthesis would cost. Build nothing until the user agrees.

### 4. Synthesize: only after the user agreed

Prerequisites: `dataset/selection_report.md` with `abstain: true` and the user's agreement (or the user's explicit instruction to build data anyway), and `dataset/requirement.md`.

1. **Design the strategy, in Markdown.** Following the synthetic-data strategy in the reference, write `dataset/synthetic/strategy.md`: motivation fit · **strategy type** (exactly one of the seven) · data unit · topology · construction variables · quality rules · contamination controls · conceptual datapoint guidance. No JSON here: a schema at this point replaces reasoning with form-filling. The two usual mistakes: treating seeds as universal (they belong to specific strategies, not to synthetic data as such), and letting anything but construction variables into the data (no evaluator identity, no system config, no downstream metric fields; the set must stay reusable by future evaluators).
2. **Prototype yourself, then generate in batches.** Write a small prototype batch (about 10 rows) yourself and read it: does the topology actually hold (pairs really paired, strata really distinct)? Fix the strategy if not; that is cheap at 10 rows and expensive at 200. Then hand the generation to `datapoint-generator` helpers, one per stratum or variant family (directed batches beat one big undirected batch). Brief each with the strategy's path, its stratum or variant family, the number of rows, and its own output file `dataset/synthetic/datapoints.raw.<batch>.jsonl`, so parallel helpers never overwrite each other's rows. Concatenate the batches into `dataset/synthetic/datapoints.raw.jsonl`.
3. **Validate, and know what it does not prove.** Run `validate_dataset` from `datapoints.raw.jsonl` to `dataset/synthetic/datapoints.jsonl`, requiring the strategy's fields and grouping by the stratum or variant label. It checks parseability, required fields, duplicates and the distribution, and its report lists its own blind spots: it cannot tell whether the data operationalizes the claim or whether the distribution is right. Read rows yourself for that; a clean report is a floor. Report how many rows validation dropped. Check the contamination controls explicitly: no copied benchmark items, and the generator must not also be the judge in the later experiment; if it would be, say so now, because it changes the experiment design.
4. **Card it.** Update `dataset/dataset_card.md`: synthetic, which strategy and why, size, unit and topology, construction variables, known limitations, and the contamination controls applied. This is what Evaluation reads to know what it is measuring on.

Add to the Claims list what was built and why (with pointers), and an honest limits entry: synthetic data supports a *pilot*, and a result on it is weaker evidence than the same result on standard data. Say so now, not when the result is in.

Downstream: Implementation builds against `dataset/dataset_card.md`; Evaluation measures on these rows and inherits their limits.

## Outputs

- `dataset/requirement.md`: the data requirement and the search phrasings.
- `dataset/candidates.csv`: every candidate the searches returned (candidate_id · source · name · url · description · size hint · popularity · licence · tags).
- `dataset/dataset_card.md`: the entry point for every later step.
- `dataset/selection_report.md`: every candidate, kept or rejected, with reason and evidence; `abstain: true/false` with the argument.
- `dataset/synthetic/`, only after abstaining: `strategy.md`, `datapoints.raw.jsonl` (as generated), `datapoints.jsonl` (validated), and the validation `*.report.json`.
- Claims list entries: the requirement, each rejected candidate, the pick or abstention, what the public data lacks, and the synthetic set's limits.

## Pitfalls

- Synthesizing before abstaining: it replaces data that may already exist and commits the project without the user's agreement.
- Recommending the closest dataset instead of abstaining: a weak shortlist silently redefines the claim, and every later step builds on data that cannot answer the question.
- Judging a dataset by its name or popularity: the same dataset can be right for one use and useless for another.
- Rows that carry responses, scores or verdicts: the dataset is contaminated for every evaluator, including yours.
- Treating a clean `validate_dataset` report as proof the data is right: it checks syntax and duplicates, nothing about your claim.
- Using generated data as evidence that the claim is true: it is stimulus; only the experiment is evidence.

## Outputs

- **Data requirement** (`dataset/requirement.md`): Phenomenon, form, labels/ground truth, constraints, what the field standardly uses, and the search phrasings. When to write: Dataset, need stage, before any dataset is looked at; tightened if decide finds it too loose. Can be rewritten.
- **Dataset candidates** (`dataset/candidates.csv`): One row per candidate: candidate_id, source, name, url, description, size hint, popularity, licence, tags. When to write: Dataset, search stage; each `search_datasets` call appends. Append only.
- **Dataset card** (`dataset/dataset_card.md`): The entry point later steps read: what the data is, unit and shape, size, provenance, licence, known biases, public or synthetic, and which parts of the requirement it meets. When to write: Dataset, decide stage; updated after synthesize. Can be rewritten.
- **Dataset selection report** (`dataset/selection_report.md`): Every candidate, kept or rejected, with reason and evidence; abstain true/false with the argument. When to write: Dataset, decide stage. An abstention goes to the user before any data is built. Can be rewritten.
- **Synthetic data strategy** (`dataset/synthetic/strategy.md`): Markdown design: strategy type, data unit, topology, construction variables, quality rules, contamination controls, datapoint guidance. When to write: Dataset, synthesize stage, only after the user agreed to synthetic data; fixed after the prototype batch if needed. Can be rewritten.
- **Synthetic datapoints** (`dataset/synthetic/`): Stimuli only: per-batch raw files merged into datapoints.raw.jsonl, the validated datapoints.jsonl, and the validation report. When to write: Dataset, synthesize stage, after the strategy and an inspected prototype batch. Can be rewritten.

## Reference

Read [reference.md](reference.md) in this folder when you need it.
