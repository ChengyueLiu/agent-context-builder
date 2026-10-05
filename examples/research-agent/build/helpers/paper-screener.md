# Paper screener

## What it can do

Judges a batch of papers against this project's screening criteria and writes one decision file per paper to `library/screening/papers/<id>.json`. For every paper it includes, it adds the structured extraction to the same file.

## When to hand off

Screening is batch work, so delegate it.

- **Pass 1** (title and abstract, stage `screening`): 25 records per helper. An abstract is about 200 words, so one helper per paper buys nothing.
- **Pass 2** (full text, stage `eligibility`): 1 paper per helper, because a PDF is a whole session.
- **Re-dos**: exactly the ids `check_screening` lists as NO DECISION FILE / INVALID / UNREADABLE, or that `check_extractions` flags. Re-run them with the same brief.
- **Late arrivals**: one helper for a PDF the user supplied later.

A handful of records you can judge in one sitting you may judge yourself, under the same SOP and file format.

## Briefing

The helper cannot see your system prompt or the skill, so its brief is all it knows:

- **The stage.** Pass 1: "Screen these records on title and abstract ALONE." Pass 2: "Judge this paper on its FULL TEXT at the eligibility stage; read the PDF at `<pdf>`."
- **The records.** Pass 1: up to 25 ids, each with its title and abstract (the record file you name is the scope). Pass 2: the one paper's id, its metadata and its `pdf` path.
- **The criteria path.** `library/screening/screening_criteria.json`, with the instruction to read it first. A helper reads a project file only when it is handed the path.
- **The output path.** `library/screening/papers/<id>.json`, one file per paper, so that one malformed answer cannot take the batch down with it.
- **The rules.** The **Screening SOP** and the **Extraction schema** from the literature-review reference, verbatim. They are its entire behaviour: a fix you want it to follow must go into these texts. In the live case, a fix made only to the criteria file changed nothing.
- **The red lines.** Judge only what is in front of it, with no lookups, no other files and no analysis in chat. Never invent or pad an extraction item. Every rejection quotes the paper. Say so in `why` when the abstract is missing or the text is truncated, instead of guessing around it.

## What it returns

One JSON file per paper with the decision keys (`paper_id`, `title`, `stage`, `outcome`, `reason_code`, `why`, `quote`). Included papers also carry `evidence_basis` (`abstract` or `full_text`) and the extraction keys (`summary`, `problems`, `methods`, `assumption_constraints`, `datasets_benchmarks`, `metrics`, `limitations`, `evidence`). The final message is one line: "done", the count for each outcome, and any caveat (truncated text, an internal tension in a paper's own evaluation, metadata recovered from the body text).

## How to check

- **Trust the files, not the message.** Run `check_screening` (with the seed ids) after every pass, and re-delegate exactly the ids it lists as NO DECISION FILE / INVALID / UNREADABLE. If a count does not move across two passes, investigate it instead of re-delegating again.
- **Read the outcome mix.** If `sought` is near the size of the batch, the criteria or the brief are topical. Fix them before paying for full text (seen live: 78% `sought`; after the rule was fixed in the SOP, 15%).
- **Read every excluded seed's criterion.** A seed the criteria cut usually means the criterion is wrong.
- **Spot-check a few exclusions per pass.** The quote must exist in the abstract or paper and must actually show the failing criterion.
- **After Pass 2, run `check_extractions`.** Send each flagged id back to a full-text helper, one paper per helper. An included paper with no extraction is a bug, not a gap.
- **Watch for truncated parses.** If a full-text exclusion says the results are missing while the abstract reports them, suspect the parse: open the PDF and re-judge. Measured: a nested results table never reached the parsed text, and the paper flipped from included to excluded.
