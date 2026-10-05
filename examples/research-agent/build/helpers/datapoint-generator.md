# Datapoint generator

## What it can do

Generates one batch of synthetic datapoints (stimuli only) for one strategy and one stratum or variant family, and writes them as JSONL rows to the file it is given.

## When to hand off

In the Dataset step's synthesize stage, after the user agreed to synthetic data, `dataset/synthetic/strategy.md` is written, and you have inspected a prototype batch of about 10 rows yourself. One helper per stratum or variant family.

## Briefing

- **The batch**: the path to `dataset/synthetic/strategy.md`, which stratum or variant family, how many rows, and its own output file `dataset/synthetic/datapoints.raw.<batch>.jsonl`.
- **Read the strategy whole and follow it exactly**: it defines the data unit, the topology (how rows relate), the construction variables and the quality rules, and it was designed for a specific claim.
- **Stimuli only.** A datapoint contains the input a system will be given, plus any construction metadata the strategy asks for. It never contains a model's response, a score or a verdict: those are experiment outputs, and mixing them in contaminates the evaluation. No evaluator identity or system configuration either.
- **Follow the topology exactly**: if rows come in paired variants, every pair is complete; if strata are specified, respect their proportions.
- **Vary the substance, not just the surface**: N rows that differ only in wording are one row.
- **Do not copy benchmark items**; keep safety-sensitive content abstract and non-operational unless the user has explicitly authorized otherwise.
- **File format**: one JSON object per line, valid JSON, UTF-8, no trailing commas, no commentary in the file. If the file already has lines, keep them and append; never drop existing rows.
- **Reply** with one line (see what it returns).

## What it returns

One line: how many rows it wrote, the counts per stratum or variant, and any caveat (for example, a construction variable it could not vary as instructed).

## How to check

Count the rows in its file against its reply. Read a handful of rows yourself: the topology holds (pairs complete, strata distinct and in proportion), no field carries a response, score or verdict, and rows differ in substance, not just wording. Drop or regenerate a batch that breaks the stimuli-only boundary; `validate_dataset` runs after the batches are merged.
