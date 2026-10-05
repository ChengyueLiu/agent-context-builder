---
name: literature-review
description: "After the brief is confirmed, to map existing research on its question: approaches, baselines, evaluation practice, what is established or open. Again after Ideation, scoped to the thesis's neighbourhood, and to screen in a paper that arrives late. Not for: Not for checking a candidate idea's novelty (Ideation) or finding datasets (Dataset)."
---

# Literature review

# Literature review

Give the project a grounded picture of existing research: the major approaches and how they relate, the papers that represent them, the field's baselines and evaluation practice, what has been found and where results conflict, and what remains open. Every important claim must be traceable to the paper it comes from. The product is understanding the project can act on, not a corpus for its own sake. You decide which searches to run, which papers to take, how deep to go and when to stop.

## Inputs

| Input | Where |
|---|---|
| question, scope, exclusions, time window | `brief.md` (confirmed) |
| the user's own papers (the seeds) | `materials/`. Read them first: they say what the field calls itself |
| an earlier pass | `library/`. Build on it; never restart it |
| the selected thesis and its bar (second pass only) | `method/position.md` |

You are blocked only when there is no confirmed question. That is an Alignment gap, not a retrieval problem: say so and stop. Each stage leaves a file the next one reads. When resuming, treat every artifact that exists and passes its checks as done, and continue from the first one that is missing.

## Depth

The purpose sets the corpus size, not appetite. There is no target number: the count is an outcome you report with the stopping condition that produced it. The first pass uses the **grounding** profile (enough to frame the problem for Ideation: what is established, what is open, which baselines and benchmarks exist). The thesis-scoped pass uses **related-work**. When papers are themselves the object of study, use **empirical-study**, where full text is a hard inclusion criterion. Profiles, stopping conditions and database choice are in the reference. If the user pins a number, honour it exactly and report the coverage it bought.

## Stage 1: Scope

At the top of the landscape report, write a few lines covering:

- what this pass must establish and what will be done with it;
- the profile;
- the time range (a default you chose is reported, not asked);
- the exclusions, taken from the brief's Scope and Out of Scope rather than re-derived.

Time bounds apply to the search and to forward snowballing. Backward snowballing ignores them, because the classics a field stands on are old.

## Stage 2: Seeds, then search

1. **Seeds first.** Run `merge_local_papers` to fold the PDFs in `materials/` into the corpus. Read their titles, abstracts and keywords before you write any query. Keep their ids: they are your vocabulary and the calibration baseline for `check_screening`. If `materials/` is empty, say so in the report.
2. **One broad pass on crossref** with a plain sentence describing the topic. Read the returned titles next to the seeds': that is how this field talks.
3. **Write the strings in the field's words.** Write one primary string (2–3 distinct concepts joined by AND) and one or two OR-expanded strings. Name the subject, not the tool: a tool name retrieves everyone who used the tool. On arXiv, `ti:"term weighting" OR ti:"BM25"` came back ~90% on topic, against ~20% for `ti:"BM25" OR ti:"TF-IDF"`.
4. **Check the strings against the seeds.** A string that would not retrieve the user's own papers is aimed elsewhere. Fix it before it costs a sweep.
5. **Run `search_papers`** once per database per string, tagged, in that database's syntax. On arXiv bare words read as OR: 357,859 hits, against 31 for `abs:"BM25" AND abs:"TF-IDF"`. Use a typed-out sentence only on crossref. Run a handful of strings on the databases the reference argues for. Results fold into `library/corpus/records.csv`, deduplicated on write, and every query lands in `records/searches/`. A database that did not run (missing key, blocked scraper, rate limit) is a coverage gap to report.

Refine the strings as you learn the field's vocabulary.

## Stage 3: Screen in two passes

Screening is batch work, so delegate it to `paper-screener` helpers. You own the criteria, the brief, and the interpretation of the numbers.

1. **Run `backfill_abstracts` first.** Publishers often register no abstract with crossref: on one sweep 27% of crossref records had an abstract, against 100% on arXiv. A title-only judgement errs toward keeping the paper, which turns each missing abstract into a full-text download. The lookup recovered 13 of 18.
2. **Write `library/screening/screening_criteria.json`.** Include EC-coded inclusion and exclusion criteria taken from the brief, and how deeply this profile needs each paper read.
3. **Pass 1: abstracts, 25 records per helper.** The record file you name is the scope, for example the snowball candidates or a subset. There are three outcomes, and the third is expensive:

   | Outcome | When | Costs |
   |---|---|---|
   | `excluded` | fails a criterion: EC code and a quote | an abstract |
   | `included` | belongs, and the abstract already says where it sits | an abstract |
   | `sought` | you will **discuss** it, so you need the full text | a whole session |

   To choose between the last two, ask whether the review will discuss this paper or only cite it. Spend `sought` on exemplars of a category, contested claims, benchmarks others are measured by, and genuine ambiguity on a criterion. "It's relevant" is not enough. `included` on the abstract is the normal outcome when mapping a field.
4. **Run `check_screening` after the pass.** Re-delegate exactly the ids it lists as NO DECISION FILE, INVALID or UNREADABLE. If a count stops moving across two passes, investigate it instead of re-delegating.
5. **Size Pass 2 before you pay for it.** Expect tens of papers in a grounding pass and low hundreds at most in any pass. A full-text set near the size of the corpus means Pass 1 sorted rather than filtered. Fix it in Pass 1: tighten the criteria, put the discuss-or-cite rule in the brief, and re-screen the `sought` set. Half an hour of abstracts beats five hours of PDFs.
6. **Pass 2: full text, 1 paper per helper.**
   - Run `download_papers(input_csv='sought', output_dir='library/corpus/papers')`. It gathers the `sought` set from the decision files itself and writes `library/corpus/sought.csv` with a `pdf` column; never build that list yourself.
   - A paper whose PDF never arrives gets `not_retrieved` and is listed in `download_report.md`.
   - Brief one helper per fetched paper at the eligibility stage, with its `pdf` path. `parse_pdfs` turns many PDFs into text.
   - The helper's decision overwrites the Pass 1 file. An included paper carries its extraction in the same file.
7. **The pass is done when `check_screening(seed_ids=[...])` reports `sought=0`**, not when the helpers say they have finished. Every `sought` paper must end as included, excluded or `not_retrieved`. If you stop early, stop on the record: how many papers are unresolved, why you stopped, and what that costs the conclusion.
8. **A seed that got excluded is not an exclusion.** The user chose that paper, so the criteria are what changed. Read which criterion cut it, then either fix the criterion or say in the report why the exclusion stands.
9. **`not_retrieved` papers are reported, never silently excluded.** These are relevant on the abstract but the text could not be had. List them in the report so the user can supply the PDFs.
10. **Run `prisma_report(corpus_csv='library/corpus/records.csv')`.** It writes `library/screening/prisma.md` (the funnel) and `library/corpus/CORPUS_PAPERS.csv` (the included papers, the one corpus table everything downstream reads). Both are computed: never edit them by hand, and re-run after any screening change.
11. **Run `check_extractions`.** It confirms that every included paper has its extraction. Send the flagged ids back to a full-text helper, and repeat until the report is clean or the residue is explained. A PDF that never parsed leaves its paper invisible downstream; count it as a degradation.

## Stage 4: Snowball until a round adds nothing

Run `snowball_papers(mode=..., input_csv='library/corpus/CORPUS_PAPERS.csv', existing_corpus_csv='library/corpus/records.csv', output_dir='library/snowball')`. It expands from the screened included set. Choose the mode by profile: backward for grounding, backward plus light forward for related-work, both for empirical-study.

Candidates are sorted by `co_citation_count`, the number of included papers that lead to each one. This is the signal keyword search cannot give: a paper reached from four included papers is load-bearing even if it contains none of your query terms. Screen the candidates as in Stage 3, re-run `prisma_report`, then snowball again from the corpus you now have.

- **Stop when a full round adds nothing new that survives screening**, and say which round went dry: that sentence is the evidence the expansion was finished, not abandoned. If the profile's "enough" already holds while rounds still yield, stop and say you stopped early on purpose.
- **Each round should be less central than the last.** A round as strongly co-cited as the first means the search missed a whole sub-direction. Say so.
- **If a round goes dry while the corpus is still thin, go back to Stage 2 instead of snowballing again.** Snowballing only reaches papers connected to the ones you hold, so another round re-explores the same wrong neighbourhood. Widen the search instead: new vocabulary from the titles you have, a database that silently returned nothing (check `search_errors.log`), or a different unit of search (method versus application). Record that you widened and why.
- **Report the yield and the unresolved rows.** The yield is the included papers the expansion added that the search missed, which measures how blind the search was. Unresolved rows are papers with no citation record. A half-run expansion is degraded, not coverage.

## Stage 5: Read, then synthesize

1. **Read existing surveys first** (in `materials/`, the corpus, and a web search for recent ones), before you synthesize. Record each in `library/landscape/related_review_table.csv`: year, scope, subtopics covered, taxonomy quality, evidence transparency, limitations. Your landscape positions itself against them rather than duplicating them.
2. **Read in full the papers the project leans on**: the representative work for each approach, the baselines, and the papers whose numbers or methods you will compare against. Their extractions are already in the decision files, so do not re-extract. A claim the project builds on is read in the paper that made it, never inferred from an abstract or from another paper's summary.
3. **Write `library/landscape/landscape_report.md`** for a reader deciding what to research. It has these sections:
   1. *Scope & coverage*: the Stage 1 lines; the databases and strings you ran and why; the funnel headline; the snowball yield, the round that went dry, and the unresolved rows; every degradation (skipped source, `not_retrieved`, parse failure) with its impact.
   2. *State of the field*: the 5–10 things the evidence firmly establishes, each with anchor papers.
   3. *Approaches*: the taxonomy, how the families relate, a representative paper for each, maturity and trade-offs.
   4. *Baselines & evaluation practice*: the baselines and what they are evaluated on; the datasets and metrics in use, and what nobody evaluates.
   5. *Contested points*: each one with the papers on both sides and why they disagree.
   6. *Trends*: rising and dying directions, backed by counts per year.
   7. *Gaps*: coverage gaps (topics, methods, periods or datasets the surveys miss) and methodological gaps (no cross-method comparison, weak evaluation), each with its basis and why it matters.
   8. *Positioning hooks*: the gaps this project could claim, and the crowded areas to avoid.

   Every claim that matters names its paper id and the place in the paper it comes from. Keep evidence and interpretation distinguishable.
4. **Write `library/landscape/gap_summary.md`**, the compact gaps-only digest that Ideation and Approach design read first. List the gaps as G1, G2, …, each with:
   - its kind;
   - its basis, for example "survey X lacks Y, while the corpus holds Z papers on Y since year W" (never novelty by assertion);
   - what is contested;
   - what it means for this project's question.
5. **Add entries to the Claims list** for the established findings and contested points the project builds on. Give each the status `supported` or `contested`, the source `literature-review`, and evidence pointing to the report's anchor and the paper ids.

## Stage 6: Validate

Check each of these. If one fails, go back to the stage that fixes it.

- Every major direction the field would recognise is represented.
- The important baselines are named, with what they are evaluated on.
- The claims the project relies on have primary-source evidence.
- No obviously close work is missing: search for it once more.
- Evidence and interpretation are told apart.
- What you did not cover, could not obtain or chose to leave out is stated with its coverage impact.
- `sought=0`, and what happened to every seed is explained.

## The thesis-scoped pass (after Ideation)

Once Ideation has picked a thesis (`method/position.md`), everything downstream is scoped to it. Approach design stays blocked until the thesis has been grounded against the literature. Use the related-work profile, in the same `library/`: the same `records.csv` and decision files, with the criteria file extended to cover the thesis's neighbourhood.

1. **Scope.** State the thesis's mechanism in one sentence. Name the neighbouring lines of work it must be positioned against, and the baselines and benchmarks its bar names.
2. **Search** for the mechanism and its components in the field's words. Then snowball one or two rounds, backward-weighted, from the closest papers.
3. **Screen** as in Stage 3. The closest prior work and every baseline the bar names are `sought`: read them in full.
4. **Write a new version of the landscape report** with a *Thesis neighbourhood* section. It covers:
   - the closest prior work, each with how it differs from the thesis;
   - each neighbouring line, with its representative and why it sits next to the thesis;
   - the baselines, with their reported numbers, their settings, and where in the paper those appear;
   - the benchmarks and metrics the thesis will be measured on.

   Update `gap_summary.md` with the gap the thesis attacks: confirmed, narrowed or contradicted.
5. **If the thesis turns out to be already done or already refuted**, record that in the Claims list and return to Ideation. Picking a replacement thesis is a user decision point (see Decision rights).

This pass is complete when every neighbouring line has a representative, you can say why each one sits next to the thesis, and nothing adjacent is unaccounted for.

## Late arrivals

When the user uploads a PDF later, re-run `merge_local_papers`. Do not guess at `conflict` rows (same title, different DOI): leave them unmerged and list them in the report. If the PDF resolves a `not_retrieved` record, brief one full-text helper with its `pdf` path, then re-run `prisma_report`.

## Outputs

| File | Contents |
|---|---|
| `library/landscape/` | `landscape_report.md`, `gap_summary.md`, `related_review_table.csv` |
| `library/corpus/` | `records.csv`, `CORPUS_PAPERS.csv` (generated), `papers/` with `download_report.md`, `sought.csv`, `LOCAL_MERGE_LOG.csv` |
| `library/screening/` | `screening_criteria.json`, `papers/<id>.json` (one per paper, decision plus extraction), `prisma.md` (generated) |
| `library/snowball/` | the candidates of each round |
| `records/searches/` | `searches.csv`, the raw per-database CSVs, `search_errors.log` |

## Done when

The validation checks hold, and the report answers with evidence: the major approaches and the work that represents them; the baselines and evaluation practices; what has been found and where findings conflict; what is still open; and what all of that means for the current question. Remaining uncertainty is stated, not hidden. When further search is unlikely to change that picture, stop.

## Pitfalls

- **More papers is not more understanding.** Cover each approach with its best-known work.
- **Spraying databases.** Coverage is argued: say which databases and strings you ran, and why those.
- **Treating `sought` as "it passed".** Seen live: 687 of 882 papers came back `sought` and queued a five-hour full-text pass. The criteria were topical, which filters nothing in a field of 800 such papers, and most of that reading would only have supported a citation.
- **Reporting the pass done while papers are still `sought`.** Seen live: a crashed downloader left 43 papers in limbo, 13 of them arXiv PDFs that fetch in seconds, and the phase was reported complete. The funnel overstated its coverage.
- **Screening papers into an empty Claims list.** Seen live: 87 papers were screened and nothing learned was recorded, so the project accumulated artifacts rather than knowledge.

## Outputs

- **Landscape report** (`library/landscape/landscape_report.md`): Scope & coverage, state of the field, approaches, baselines & evaluation practice, contested points, trends, gaps and positioning hooks, with a paper id on every claim that matters. When to write: At the end of each Literature review pass. The thesis-scoped pass writes a new version that adds the Thesis neighbourhood section. Write a new version, keep the old one.
- **Gap summary** (`library/landscape/gap_summary.md`): Gaps G1, G2, … (coverage or methodological), each with its basis and what it means for this project; Ideation and Approach design read it first. When to write: With the landscape report; the thesis-scoped pass updates the gap the thesis attacks. Write a new version, keep the old one.
- **Related reviews table** (`library/landscape/related_review_table.csv`): Existing reviews and what each one covers. When to write: While writing the landscape report. Can be rewritten.
- **Corpus** (`library/corpus/`): `records.csv` (everything found, deduplicated), `CORPUS_PAPERS.csv` (the included papers: the one corpus table downstream reads and cites from; never hand-edited), `papers/` (PDFs and `download_report.md`). When to write: Records are added as each search or snowball round arrives; `CORPUS_PAPERS.csv` is regenerated by `prisma_report` after every screening change. Can be rewritten.
- **Screening records** (`library/screening/`): `screening_criteria.json`, `papers/<id>.json` (decision and extraction), and `prisma.md` (the funnel, never hand-edited). When to write: The criteria before Pass 1; one decision file per paper as it is judged; `prisma.md` regenerated after every screening change. Can be rewritten.
- **Snowball rounds** (`library/snowball/`): What each round searched and added. When to write: Each snowball round. Append only.
- **Search archive** (`records/searches/`): `searches.csv` (every query: database, string, tag, hits, new records), the raw per-database CSVs, and `search_errors.log` (databases that did not run). When to write: After every `search_papers` call. Append only.

## Reference

Read [reference.md](reference.md) in this folder when you need it.
