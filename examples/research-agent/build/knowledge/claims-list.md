# Claims list

> Source & date: Adapted from merevo's findings ledger (prompts/lead/judgment.md, tools/findings_check.py, docs/design/working-memory-current.md), 2026-10

The Claims list (`claims.md`) is the one ledger of everything the project has come to know. There is no separate place for "claims" and "facts": an entry with no evidence yet *is* a claim to prove, and when evidence arrives the same entry changes status. Never split one thing into two entries.

### Entry format

```markdown
## F12 — execution feedback improves multi-turn tool selection accuracy
status: open
source: approach-design
test: method/falsification.md#exp1 · rule: F1 on D2 beats B1 by >= 3 points
evidence: —

## F03 — the field splits into review-text generation vs SLR process automation
status: supported
source: literature-review
evidence: library/landscape/landscape_report.md · library/corpus/CORPUS_PAPERS.csv
limits: may miss non-arXiv communities
```

The heading is `## <id> — <statement>`. The id is what `record_result` takes as `claim_id` and what the package manifest cites.

- **status**: `open` (no evidence yet) · `supported` · `refuted` · `contested` (evidence both ways) · `superseded` (a better entry replaced it; archived, never deleted).
- **source**: the step you learned it in (its skill id). This tag lets any later step filter the list, so no per-step summary file is needed.
- **evidence**: project-relative pointers, `path` or `path#anchor`. They are checked mechanically on every write; a pointer that does not resolve comes back to you: fix the pointer or drop the entry to `open`. The check only says the pointer resolves; whether the evidence supports the statement is your judgment.
- **test**: for `open` entries, the experiment and its decision rule, written **before** the result exists. Keep it after the status changes: it is the record of what was pre-registered.
- **limits**: for degradation entries, what this weakens (`limits: F03 may miss non-arXiv communities`).
- **reconsider-if**: for rejected paths, what would make them worth revisiting. This is what makes the list a map instead of a graveyard.

### Rules

- **Write only the statement the evidence can carry.** "Paper X reports Y" is supported by the paper; "Y is true" is not. To assert the latter, open a separate entry with no evidence.
- **Never delete an entry.** A replaced entry becomes `superseded`; an entry a new result contradicts becomes `contested`, with a pointer to that result. Edit entries in place; if you rewrite the whole file, check that every id is still there, because a full rewrite silently drops entries.
- **Write-in threshold:** only what generalizes beyond a single file goes in the list. Per-file details stay in that file, and the entry points at it.

### The Claims list and the plan

The plan (`update_plan`) says what you are **doing**; the Claims list says what you **know**. One does not imply the other: a step can close with nothing worth writing, and a single search can teach you three things. If real work has added no entry, it produced files but no knowledge; fix that before moving on. Execution counts (runs launched, items processed, what it cost) go in neither: a number written in two places will disagree with itself.
