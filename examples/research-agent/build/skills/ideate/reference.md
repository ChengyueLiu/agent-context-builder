# Ideation · Reference

## Novelty check protocol

Novelty is the claim most often asserted and least often checked. This protocol makes it evidence. Search surfaces, in order: the literature review's corpus and landscape report, then the paper databases through `search_papers`.

### Per candidate

1. **Extract the checkable claim.** Not "our approach is novel" but the mechanism sentence, such as "using execution feedback to re-rank tool selection across turns". If you cannot state it in one sentence, it is too vague to check.
2. **Run at least three differently phrased searches.** One phrasing finds one vocabulary; a field usually has three. Vary:
   - the field's own term vs the plain description (search the corpus and the report; `search_papers` against a database);
   - the mechanism's components separately, then the combination;
   - the problem itself, then what existing methods for it actually do (the report's approach sections, and the closest paper read directly).

   Write the queries down with their source and hit count. **A novelty claim whose queries are not recorded is an assertion, not a finding.**
3. **Give one of three verdicts, all legitimate:**

| Verdict | Means | Do |
|---|---|---|
| **new** | Nothing in the corpus does this | Record the queries as the evidence; note the corpus-coverage caveat |
| **done** | A paper already does it | Drop the candidate and record the paper. This is a save: weeks not spent |
| **adjacent** | Done, but in another setting, domain or scale | The contribution is the transfer. Say so explicitly and narrow the claim to it |

### The corpus is not the world

A `new` verdict is bounded by what the corpus covers. Before believing it:
- Check whether the corpus is thin in this candidate's area: the report's coverage statement, and the `limits` of entries in the Claims list.
- If thin, run one targeted external search before claiming novelty.
- Either way, record the bound: "new within a 34-paper corpus whose coverage of X is weak" is honest; "novel" is not.

This protocol does not judge whether a candidate is good, only whether it is already taken. Value, feasibility and falsifiability are for the comparison below.

## Comparing candidates

These are dimensions for comparing candidates against each other, not a score that decides. The pick follows the order in the select stage; if you do keep numbers for ordering, they stay in `method/candidates.md` and carry no weight of their own.

For each dimension you use, give one sentence of justification and one concrete piece of evidence (a paper, a search result, a number from the landscape report or the position). Where you have none, write `[no external evidence]` rather than implying you do: an honest gap beats a confident guess.

- **Gap fit**: the mechanism attacks the named gap directly, not something adjacent to it, and the mechanism is stated specifically. Weak: it improves something real, but not the gap it names.
- **Novelty**: the novelty check found no method doing this. Discount hard for "done in another setting": that is a transfer contribution, real but smaller. Taken from the check's verdict, never from a prior.
- **Falsifiability**: a cheap experiment could clearly prove it wrong. Weak: only a full-scale run could tell, or no result would ever be decisive.
- **Feasibility**: buildable with the data, compute and time available; its dependencies exist today. Judge the *hardest* component, not the average.
- **Failure informativeness**: if it fails, the field learns that an assumption is false. Weak: failure teaches nothing; it just means the trick did not work.
- **Cost**: implementation effort and compute. Give it the least weight: cheapness rarely deserves to decide a research direction.

**Calibration.** Be critical: most honest candidates are mixed. If every candidate looks strong on every dimension, the comparison was done as advocacy; redo it against the evidence.

**Two things no comparison overrides:**
- A `done` novelty verdict drops the candidate, whatever else it has going for it. Record the paper that already did it.
- A candidate that no cheap experiment could prove wrong does not proceed: eliminate it with that reason. A method nobody can prove wrong cannot be evidence for anything.
