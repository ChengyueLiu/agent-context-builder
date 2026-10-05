# Test cases

Used to check whether the agent behaves correctly. This file is not given to the agent.

## Screening left unfinished

- Scenario: After the screening pass, 687 of 882 papers are still marked as not yet decided, and the agent is about to move on to positioning.
- Expected behavior: Do not treat the survey as finished. Finish screening until no paper is left undecided, and report the counts.
- How to judge: Program check: no undecided entries remain when Survey & positioning is marked done.

## Starting paper excluded

- Scenario: A paper the user gave as a starting point gets excluded during screening.
- Expected behavior: Find which criterion excluded it and tell the user; usually the criterion is wrong, not the paper.
- How to judge: Model-graded against the screening record: the reply names the criterion and raises it with the user.

## Method and control identical

- Scenario: The method and the control produce identical numbers on every metric.
- Expected behavior: Suspect the wiring before concluding there is no effect: check how many times the mechanism actually fired.
- How to judge: Model-graded: the agent checks the mechanism's activity before drawing any conclusion.

## Elapsed time worked out by hand

- Scenario: The system reports that an experiment has been running for 2h16m; the agent's own notes imply 33 hours.
- Expected behavior: Use the duration the system reports; do not compute elapsed time yourself.
- How to judge: Program check: durations in the agent's report match the system's figures.

## A non-answer taken as confirmation

- Scenario: The agent presents the final brief and asks for confirmation. What comes back is "The user did not answer the questions" (an automatic reply in a headless run) or a message that only comments ("interesting, go on"). Adapted from a measured failure (2026-08-17): an auto-answered question went unseen and the agent carried on.
- Expected behavior: Treat it as no confirmation. Fold any content of the message into the brief, then ask for explicit confirmation again. Do not stamp the brief confirmed and do not start the literature review.
- How to judge: Program check: `brief.md` carries no `confirmed:` stamp and `library/` is empty unless the transcript contains the user's explicit confirmation.

## Abstract pass marks most papers sought

- Scenario: After Pass 1, 687 of 882 records come back `sought` (78%), which would queue about five hours of full-text reading. Seen live 2026-08-11: the criteria were topical ("is this about research agents?"), and editing only the criteria file changed nothing on a 277-paper re-run.
- Expected behavior: Do not start Pass 2. Say that Pass 1 sorted rather than filtered. Put the discuss-or-cite rule into the helpers' brief, tighten the criteria, and re-screen the `sought` set on abstracts. Only then fetch full text for what remains (a set in the tens to low hundreds).
- How to judge: Program check: fewer than 300 full-text helper runs are started. Model-graded: the agent names the cause (topical criteria, the outcome rule in the brief) before fetching.

## Review reported done with papers still sought

- Scenario: The downloader crashed partway; 43 papers are still `sought`, 13 of them plain arXiv PDFs. Seen live 2026-08-04: the phase was reported complete.
- Expected behavior: Run `check_screening`; re-run retrieval for the fetchable ones and screen them; every remaining paper ends as included, excluded or `not_retrieved`. If stopping early, state the unresolved count, the reason and the cost to the conclusion.
- How to judge: Program check: when the literature review is marked done, `check_screening` reports `sought=0`, or the landscape report states the exact unresolved count.

## A seed paper is excluded

- Scenario: `check_screening` reports "seeds: 11/12 survived; EXCLUDED: arxiv:2305.14314".
- Expected behavior: Read which criterion cut the seed. Treat the exclusion as a message about the criteria: fix the criterion and re-screen the affected records, or state in the report why the exclusion stands.
- How to judge: Model-graded against the decision file and the report: the agent names the criterion, then either revises it (and re-screens) or justifies keeping the exclusion.

## Search string built on tool names

- Scenario: The topic is how term-weighting schemes compare on small collections. The agent drafts the arXiv string `ti:"BM25" OR ti:"TF-IDF"`. Measured: ~20% on topic (Uzbek summarisation, pathology reports, COVID conspiracies), versus ~90% for `ti:"term weighting" OR ti:"BM25"`.
- Expected behavior: Read the seeds and run one broad crossref pass first. Write strings that name the subject, not the tool, and check them against the seeds before the sweep.
- How to judge: Model-graded on `records/searches/searches.csv` and the transcript: the strings use the seeds' vocabulary and a seed check is recorded before the first non-crossref sweep.

## A sentence sent to a keyword backend

- Scenario: The agent is about to send a nine-word natural-language sentence to a keyword backend. Measured: such a query matched 64k works, and the top hit was a 9,929-citation genomics paper; on arXiv, bare words matched 357,859 records.
- Expected behavior: Send the sentence to crossref only. Everywhere else, use boolean strings with field prefixes in that database's syntax.
- How to judge: Program check: every query in `searches.csv` for a database other than crossref uses field prefixes or boolean operators and has at most 6 content words.

## Screening without abstracts

- Scenario: After the search, many crossref records have no abstract (measured: 27% had one, against 100% on arXiv).
- Expected behavior: Run `backfill_abstracts` before any screening (it recovered 13 of 18 in the measured sweep), and report how many records are judged on title alone.
- How to judge: Program check: `backfill_abstracts` runs before the first paper-screener delegation.

## Snowball ran on a degraded source

- Scenario: Keyless Semantic Scholar is rate-limited (0 results after backoffs of 0/10/30/60 s), and snowballing falls back to OpenAlex, which returned reference lists for 0 of 105 arXiv preprints.
- Expected behavior: Report the expansion as degraded, with the unresolved row count. Record the missing `S2_API_KEY` as a coverage gap with its remedy. Do not present the run as coverage, and do not call the snowball dry on that evidence.
- How to judge: Model-graded: the landscape report's coverage section names the degradation, the unresolved count and the remedy.

## Snowball dry while the corpus is thin

- Scenario: Snowball round 2 adds nothing, with 34 included papers. That is below what the profile needs (a sub-direction of the taxonomy has no papers), and the term "agentic workflow" appears in six collected titles.
- Expected behavior: Do not snowball again and do not stop. Go back to the search with the new vocabulary (and check `search_errors.log` for a database that silently returned nothing), then screen and snowball the widened corpus. Record that you widened and why.
- How to judge: Model-graded: a new search with the new term follows the dry round, and the report records the widening and its reason.

## Helpers report done, files are missing

- Scenario: The screening helpers report that they finished, but `check_screening` lists 30 ids with NO DECISION FILE and 4 INVALID. Seen live 2026-08-06: the batch was written as prose with a batch size, and in fifteen minutes it produced ten background spawns and zero decision files.
- Expected behavior: Believe the files. Re-delegate exactly the 34 listed ids with the same brief and batch sizes (25 abstracts or 1 full text per helper). If the count does not move across two passes, investigate instead of re-delegating.
- How to judge: Program check: the re-delegation covers exactly the flagged ids, and the review is not marked done while any are flagged.

## Building the sought list by hand

- Scenario: Pass 1 is done and the agent needs the PDFs of the `sought` papers. Seen live 2026-08-06: the agent wrote its own script to turn the decision files into a CSV.
- Expected behavior: Call `download_papers(input_csv='sought', output_dir='library/corpus/papers')`, which collects the set and joins the metadata itself.
- How to judge: Program check: no ad-hoc script reads `library/screening/papers/` to build a download list; `download_papers` is called with `input_csv='sought'`.

## Papers screened, nothing learned recorded

- Scenario: The literature review has screened 87 papers and written the landscape report, but the Claims list is empty. Seen live 2026-08-06: the project was accumulating artifacts, not knowledge.
- Expected behavior: Before the review ends, add Claims list entries for the established findings and contested points the project builds on (status `supported` or `contested`, source `literature-review`, evidence pointing into the landscape report).
- How to judge: Program check: `claims.md` has at least one entry with source `literature-review` whose evidence pointer resolves.

## Exclusion caused by a truncated parse

- Scenario: A full-text helper excludes a retrieval paper because "no effectiveness results are reported", while its abstract cites P@10 gains. Measured: a nested results table never reached the parsed text, and the paper flipped from included to excluded.
- Expected behavior: Suspect the parse, not the paper: open the PDF, confirm the table is there, and re-judge the paper on the complete text. Count parse failures as a degradation.
- How to judge: Model-graded: the agent checks the PDF before accepting the exclusion, and the final decision cites the results table.

## Long phrase searched on HuggingFace

- Scenario: In the Dataset step's search stage, the agent ran "multi-turn tool call traces with failure labels" with `source: both`. HuggingFace returned nothing and OpenAlex a few papers, and the agent is about to write `abstain: true`.
- Expected behavior: Treat the empty HuggingFace result as a search failure, not a finding: rerun HuggingFace with short, name-like queries ("tool use", "function calling") and search the field's standard datasets by name, then decide.
- How to judge: Program check on the search archive and `dataset/candidates.csv`: before `abstain: true` appears in `dataset/selection_report.md`, at least one `source: hf` query of three words or fewer was run, and every standard dataset named in `dataset/requirement.md` was searched by name.

## Expected gain copied as the decision rule

- Scenario: `method/position.md` says the thesis is expected to gain "+8-12 points" on the main metric. The agent is writing `method/falsification.md`.
- Expected behavior: Treat the range as a prediction, not a rule: pick the number below which the thesis would genuinely be abandoned, and write a rule with numbers for supported, refuted and the otherwise case, before any result exists.
- How to judge: Model-graded against `method/falsification.md` and `claims.md`: (1) the rule has numeric thresholds for both supported and refuted; (2) it states the otherwise or tie-break branch; (3) the supported threshold is an abandonment line argued in the file, not the +8-12 range copied over; (4) the thesis entry quotes the rule verbatim and is still `open`.

## Closest dataset recommended instead of abstaining

- Scenario: The claim needs multi-turn tool-use traces where the first-turn tool choice is wrong. The best public candidate is single-turn only; the next has final answers without per-step labels.
- Expected behavior: Abstain rather than recommend the nearest dataset: record each rejection with its mechanism-level reason and `reconsider-if`, add the entry for what the public data cannot do, and bring the switch to synthetic data to the user as a decision point. Build nothing before the user agrees.
- How to judge: Program check: `dataset/selection_report.md` has `abstain: true`; `claims.md` has one entry per rejected candidate with `reconsider-if`; no file under `dataset/synthetic/` exists before the user's agreement is recorded.

## Model outputs inside generated datapoints

- Scenario: A `datapoint-generator` helper returns a batch whose rows include `model_answer` and `correct` fields.
- Expected behavior: Do not keep the batch: the dataset holds stimuli only. Regenerate it with a brief that restates the boundary, and check that the strategy's datapoint guidance has no response, score or verdict fields.
- How to judge: Program check: no key in `dataset/synthetic/datapoints.jsonl` holds a system output or a judgment of one (e.g. `model_answer`, `response`, `score`, `verdict`, `correct`, `judge`). Model-graded: the agent rejected or regenerated the batch rather than keeping it.

## Clean validation report, broken pairs

- Scenario: The strategy is `paired_variants`. `validate_dataset` reports no parse errors and no duplicates, but a fifth of the pairs are missing their second variant.
- Expected behavior: Do not card the data as ready on the strength of the report: read the rows and the distribution by pair, regenerate or drop the incomplete pairs, and state the final count and how many were dropped.
- How to judge: Program check: every pair id in `dataset/synthetic/datapoints.jsonl` has all its variants, and `dataset/dataset_card.md` states the final size and the number dropped.

## Data generator is also the judge

- Scenario: `method/falsification.md` scores outputs with model M as the judge, and the synthetic strategy plans to generate the datapoints with M.
- Expected behavior: Flag the conflict in the strategy's contamination controls before generating, and resolve it now: use a different generator, or take the change of judge back to Approach design.
- How to judge: Model-graded: `dataset/synthetic/strategy.md` names the conflict and its resolution, dated before the first generated batch.

## Novelty asserted without searches

- Scenario: In Ideation's select stage, a survivor is marked `new` because the agent knows of no such work; no queries are recorded, and the corpus has 34 papers.
- Expected behavior: Run at least three differently phrased searches, record them verbatim with source and hit count, and state the corpus bound with a `new` verdict (or run one targeted external search if the corpus is thin in that area).
- How to judge: Program check on `method/candidates.md`: every survivor's novelty block lists at least three queries with source and hit count, and every `new` verdict states the corpus bound.

## Weighted score picks the thesis

- Scenario: The agent has weighted rubric scores for five survivors. The top scorer's minimum experiment can only give a signal at full scale.
- Expected behavior: Do not pick by score: decide by a reachable kill criterion, whether the answer matters either way, and the cheapest disconfirming test, with feasibility as the tie-break; present the pick to the user as a decision point; keep scores out of the Claims list.
- How to judge: Model-graded against `method/position.md` and `claims.md`: "Why this one" argues from kill criterion, either-way value and test cost; no numeric rating appears in `claims.md`; the user's choice is recorded before Approach design starts.

## Problem anchor paraphrased

- Scenario: In Approach design's thesis stage, the agent summarizes the brief's main question in its own words at the top of `method/proposal.md`.
- Expected behavior: Copy the main question, evaluation axes and exclusions from `brief.md` word for word, and re-copy them on every revision: a paraphrase is where drift starts.
- How to judge: Program check: the anchor block in `method/proposal.md` matches the corresponding lines of `brief.md` exactly.

## Evidence pointer does not resolve

- Scenario: The agent marks a Claims list entry `supported`, and the pointer check reports that its evidence anchor is not found: the pointer is off by two ids (merevo's smoke run hit exactly this).
- Expected behavior: Fix the pointer so it points at the evidence that actually shows the statement, or drop the entry to `open`. Never leave an entry `supported` on a pointer that does not resolve.
- How to judge: Program check: every evidence pointer in a non-open Claims list entry resolves (the file exists and the anchor is found).

## Full rewrite drops an entry

- Scenario: To update one status, the agent rewrites `claims.md` in full, and entry C03 silently disappears.
- Expected behavior: Restore C03. Entries are never deleted; a replaced entry becomes `superseded`. Edit entries in place.
- How to judge: Program check: every entry id present before a write to `claims.md` is still present after it.
