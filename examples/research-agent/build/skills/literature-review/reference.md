# Literature review · Reference

# Literature review: reference

## 1. Depth profiles: how much literature is enough

There is deliberately no target number. A number becomes something to hit: you stop at 25 with the field half covered, or you keep going to 100 because the range said so. What decides "enough" is the stopping conditions below and whether the report's argument holds. Where an order of magnitude appears, it is there to catch a wrong ballpark; being outside it is something to explain, not something to fix by adding papers.

| Profile | When | Search + snowball | Enough is when | Ballpark | Screening depth |
|---|---|---|---|---|---|
| grounding | first pass: framing the problem, feeding Ideation | the primary string on the fewest databases that cover the domain; backward snowball only | you can state what is established and what is open, and nothing you find changes that statement | tens | abstract level; full text only for the papers you will read in full |
| related-work | thesis-scoped pass: positioning the contribution | the primary string plus one secondary; backward plus light forward | every neighbouring line of work the contribution must be positioned against has a representative, and you can say why each sits next to it | tens | abstract plus availability; the result is a grouped, annotated set |
| empirical-study | the brief makes papers themselves the objects of study | precision over recall; snowball both ways, take the top papers by `co_citation_count` | every paper left is one you would defend analysing, and you hold its full text | tens, and fewer than you expect | full eligibility pass. Full text is a hard inclusion criterion: `not_retrieved` papers are reported and excluded from the analysis, never silently dropped |

### Stopping conditions (all profiles)

Dry is not the same as done. A round that adds nothing tells you that you have exhausted the citation neighbourhood of the papers you hold, not that they were the right papers.

| | The profile's "enough" holds | It does not hold |
|---|---|---|
| **Snowball still yielding** | Done. More rounds buy breadth you did not need, so stop and say you stopped early on purpose. | Keep going: the loop is working. |
| **Snowball has gone dry** | Done, and well evidenced: the citation graph agrees you have the core. | **Do not stop, and do not snowball again. Go back to the search.** |

The bottom-right cell is a verdict on the search, not on the field. What helps:

- **Different vocabulary.** The sub-direction you missed calls itself something you did not guess, and the titles you already have are where to find its words.
- **A database you skipped.** Check `search_errors.log` first: a source that silently returned nothing is the cheapest gap to close.
- **A different unit of search.** Search by method when the field publishes by application, or the reverse.

Then screen and snowball from the widened corpus, and record what you did, for example: "round 2 went dry at 34 included, below what this review needs; re-searched with `agentic workflow` after seeing it in six titles."

### How many rounds

- **grounding**: backward only; stop as soon as the problem statement holds.
- **related-work**: one or two rounds, backward-weighted. You need every neighbouring line represented, not every paper in each line.
- **empirical-study**: usually one round, stopped deliberately. The first round's top papers by `co_citation_count` are the ones worth studying. Dry and thin here more often means the criteria are too tight than that the search was.

Record which condition stopped you, and if you widened the search, what you widened and why.

### Two numbers every pass reports

- **The PRISMA funnel** (`library/screening/prisma.md`), recomputed and never written by hand, including the not-retrieved box.
- **Snowball yield**: the included papers the expansion added that the keyword search missed, which measures how blind the search was. Report the unresolved rows next to it.

### What the report must argue

- grounding: "these papers are enough to frame the problem; here is what they establish and what they leave open."
- related-work: "these are the right papers to discuss for this contribution: grouped, one line each on why, nothing adjacent unaccounted for."
- empirical-study: "these are the most study-worthy papers, and every one has retrievable full text."

A corpus that hit a count but cannot answer its profile's question is not done. A corpus half the expected size that can answer it is done. Report the count either way, together with the stopping condition that produced it.

## 2. Database selection

Coverage is argued, not sprayed. Pick the smallest set of databases that lets you claim systematic coverage of the topic's domain, and name what you left out and why. Every extra database costs time and adds deduplication noise.

### The query decides more than the source

Every keyword backend reads a bare run of words as OR, then ranks by something that favours popular papers. Measured on arXiv:

| Query | Hits | Top result |
|---|---|---|
| `BM25 TF-IDF small collection` | 357,859 | an unrelated Indonesian MLP baseline |
| `all:BM25 AND all:"TF-IDF"` | 31 | all on topic |
| `abs:"BM25" AND abs:"TF-IDF" AND abs:"test collection"` | 1 | exactly the target |

So read before you write queries, and write each one in its database's syntax. `search_papers` rejects a typed-out sentence everywhere except crossref, which matches bibliographic phrases and does better with the long form.

### Availability tiers

| Tier | Databases | Notes |
|---|---|---|
| Keyless, published work only: **start here** | crossref | DOI registrations: journal articles, conference proceedings, book chapters. It ranks by text relevance, never by citation count. The nine-word sentence that made OpenAlex return a genomics paper returns 9/10 on-topic SIGIR papers here. Non-papers are filtered out by type. `CROSSREF_EMAIL` (optional) puts you in the polite pool. |
| Keyless, preprints and citation graph | arxiv, semantic_scholar | arXiv reads bare words as OR, so field prefixes (`abs:`, `ti:`, `all:`) and capitalised `AND`/`OR`/`NOT` are mandatory. Semantic Scholar works without a key but under strict rate limits (`S2_API_KEY` lifts them); it has the best reference coverage for arXiv preprints, so it stays the primary source for snowballing. |
| Fragile: gap-fill only, off by default | google_scholar, acm | Scraping-based, so blocks are normal; never let them carry coverage. The Google Scholar scraper (`scholarly`) is not installed and can open a browser when blocked: do not install or run it unless the user explicitly asks. |
| Key required | ieee (`IEEE_API_KEY`), springer (`SPRINGER_API_KEY`), elsevier (`ELSEVIER_API_KEY`) | Free registration. Skipped with a logged warning when the key is unset, and that skip is a coverage gap you report. |

OpenAlex is not a keyword source. Its search scores fold in citation count, so an imprecise query returns the most-cited works in science: it ranked a 9,929-citation genomics paper first for a retrieval-evaluation query. It survives only as an ID-based fallback inside snowballing, where it carries no reference lists for arXiv preprints (measured 0/105). A snowball that fell back to it is degraded.

### Domain → databases

| Topic domain | Include | Why |
|---|---|---|
| CS / ML / AI / NLP | crossref + arxiv (+ semantic_scholar) | crossref for the published record; arXiv for the last 18 months, since in a preprint culture the newest relevant work is arXiv-only |
| Software engineering | + ieee, acm | the top venues (ICSE, FSE, TSE, TOSEM) live in the IEEE and ACM libraries |
| Security / systems | crossref + arxiv + ieee | a mix of preprint and venue culture |
| Journal-heavy or interdisciplinary (medicine, HCI-adjacent, SE journals) | crossref + springer, elsevier | publisher APIs for what is paywalled |

### Procedure

1. Classify the topic's domain from the brief.
2. Take that row of the mapping and keep only what is usable now (keyless databases plus those whose keys are set).
3. Record a mapped database you cannot use as an explicit coverage gap, with the remedy ("configure IEEE_API_KEY and re-run the search for SE-venue coverage").
4. If you are about to run more than 5 databases, justify each extra one: "more" is not "systematic".

### Measured precision (2026-08-04, topic: BM25 vs TF-IDF on small collections; judged by reading the top-10 titles)

| Source + query | On topic |
|---|---|
| crossref, full sentence | 9–10/10 |
| arxiv, `ti:"term weighting" OR ti:"BM25"` | ~9/10 |
| arxiv, `abs:"BM25" AND abs:"TF-IDF"` | ~3/10: most merely use both as baselines |
| arxiv, `ti:"BM25" OR ti:"TF-IDF"` | ~2/10: Uzbek summarisation, pathology reports, COVID conspiracies |
| semantic_scholar, keyless | 0: rate-limited after backoffs of 0/10/30/60 s |

Two lessons: a tool name retrieves everyone who used the tool, while a subject name retrieves the people who study it; and keyless Semantic Scholar is a bonus, not coverage.

## 3. Screening SOP (paste verbatim into every paper-screener brief)

You are deciding whether papers belong in this project's corpus, against the criteria in the file you were given. Judge only what is in front of you: there is nothing to look up and no next step to plan. Write one JSON file per paper at the path named for it. Write nothing else: no other files, no analysis in chat.

**Stages**

| Stage | Question | What you are given |
|---|---|---|
| `screening` | Does it study the subject, or merely use it? | title + abstract |
| `retrieval` | Is the full text in hand? | settled in code, never by you |
| `eligibility` | Does the evidence meet the criteria? | the full text |

`screening` is where most papers are excluded and where judgement matters. "Uses TF-IDF as a feature in a sentiment classifier" is not a study of term weighting: say that, quoting the words from the abstract that show it.

**Outcomes**

- `excluded`: fails a criterion. Needs a `reason_code` and a quote.
- `included`: meets the criteria on the evidence you have. At `screening` that evidence is the abstract, and for most papers it is enough.
- `sought`: the criteria cannot be settled without the full text, or the review will discuss this paper rather than merely cite it.
- `uncertain`: genuine doubt after looking, not work left undone. Say what would settle it. It is carried downstream as included. Use it rarely.
- `not_retrieved` is never yours to write: whether a full text is in hand is a file check, done in code.

**`sought` is the expensive outcome.** It is a request to spend a whole reading session on the paper. Ask: will the review discuss this paper, or only cite it?

- **Discuss it**: the review will say what it did, how it was evaluated, or why its claim is disputed → `sought`. This covers exemplars of a category, papers whose results are contested, benchmarks others are measured against, and papers whose abstract genuinely leaves a criterion open.
- **Cite it**: it belongs, the abstract already establishes where it sits, and it will appear as a citation at the end of a sentence → `included`. Write the extraction from the abstract and set `"evidence_basis": "abstract"`, so nothing downstream mistakes it for a full-text reading.

`included` on the abstract is the normal outcome when mapping a large field: a paper is included for its position in the map, and an abstract usually establishes that position.

**Three rules that make a decision trustworthy**

1. **Decide before you summarise.** Having read a long paper is not a reason to include it, and writing the summary first is how that bias gets in.
2. **A rejection quotes the paper**: a section number, a sentence. An exclusion nobody can check is an exclusion nobody will believe.
3. **Judge the paper you were given, not the paper you expected.** If the abstract is missing or the text looks truncated (a results section without its numbers, a section that stops partway), say so in `why` rather than guessing around it.

Each paper gets one decisive check, and you stop at the first failure, so there is one reason, not a list.

**The file**

```json
{
  "paper_id": "arxiv:2407.03618",
  "title": "BM25S: Orders of magnitude faster lexical search",
  "stage": "screening",
  "outcome": "excluded",
  "reason_code": "EC1",
  "why": "compares implementation speed of one BM25, not weighting schemes",
  "quote": "§1: we do not change the ranking function"
}
```

Required: `paper_id`; `stage` is `screening` or `eligibility`; `outcome` is `excluded`, `included`, `sought` or `uncertain`; `why` is not empty; every exclusion has a `reason_code`. A file that breaks these rules is not counted and comes back to you.

When a paper is included, add `evidence_basis` (`abstract` or `full_text`) and the extraction keys (next section) to the same object. An excluded paper stops at the stage where it failed; nothing more is asked of it. Write valid JSON only: UTF-8, no comments, no trailing commas.

Your final message is one line: "done", the count for each outcome, and any caveat worth attention (truncated text, an internal tension in a paper's own evaluation, metadata you had to recover from the body text).

## 4. Extraction schema (paste verbatim into every paper-screener brief)

Ground every item in what the paper actually says; never invent and never pad. A paper that genuinely has no datasets (a position paper, say) gets an empty array: empty is correct, filler is not. At the eligibility stage, read the whole full text, not just the abstract; a long paper takes several reads.

Keys added to the decision object:

- `evidence_basis`: `full_text`, or `abstract` (only for a cite-only inclusion at `screening`).
- `summary`: at most 3 sentences on what the paper does and shows.
- `problems` (≤6): `{name, description, confidence}`, the research problems the paper addresses. `name` is a short canonical phrase the field would recognise; `description` is one sentence.
- `methods` (≤6): `{name, description, confidence, is_proposed, targets, requires_constraints, relaxes_constraints, evaluated_on, measured_by}`.
  - `is_proposed` is true only for the paper's own novel contribution(s).
  - `targets`: the names of the problems it attacks.
  - `requires_constraints`: the assumptions or constraints it needs.
  - `relaxes_constraints`: the assumptions it removes compared with prior work.
  - `evaluated_on`: dataset or benchmark names.
  - `measured_by`: metric names.

  Every name in these nested lists must also appear in the matching top-level array.
- `assumption_constraints` (≤6): `{name, description, confidence}`.
- `datasets_benchmarks` (≤8): `{name, description, confidence}`, using the community's canonical names ("ImageNet", not "the image dataset").
- `metrics` (≤6): `{name, description, confidence}`.
- `limitations` (≤6): `{name, description, confidence}`: what the paper itself admits, plus what its evaluation visibly cannot claim.
- `evidence` (≤6 strings): short verbatim quotes (≤300 characters each) supporting the most load-bearing items above.

Discipline:

- **Canonical names.** Use the vocabulary the paper and its field use, so that the same concept extracted from different papers lands on the same name.
- **Confidence.** 1.0 only for things stated verbatim, about 0.7 for a clear paraphrase. Below 0.5, leave the item out.
- **Checked mechanically.** The file is schema-checked (`check_extractions`), and a malformed file comes back for a redo.
