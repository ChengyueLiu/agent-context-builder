# Dataset · Reference

## Reviewing a dataset candidate

**The framing rule**: evaluate `dataset + intended use`, never the dataset alone. "Is SQuAD good?" has no answer. "Can SQuAD carry the claim that X improves multi-hop reasoning, measured by exact match?" does.

### Five checks, in this order

1. **Phenomenon coverage**: does the data actually contain the thing the claim is about? Not the topic; the phenomenon. A tool-use corpus without failures cannot show failure recovery, however on-topic it is.
2. **Operationalization**: through its task, labels and metric, is the measurement in `method/falsification.md` computable from what this dataset provides? If the metric needs per-step labels and the data has final answers only, stop here.
3. **Evidence**: from the dataset card, the paper, or papers that use it for a similar claim. "The card says it contains X" is evidence; "the name suggests X" is not.
4. **Rival explanations**: if the experiment succeeds on this data, what else could explain it? Length artefacts, template leakage, a spurious feature correlated with the label. A dataset that admits many rival explanations weakens any result run on it.
5. **Mismatch**: domain, population, annotation protocol, task framing, licence, scale. Name the mismatches you would have to live with.

### What to record per candidate (in `dataset/selection_report.md`)

- `keep` (true/false) and the one-sentence reason
- **why it fits the requirement**, in the requirement's own words
- **evidence**, with pointers (card URL, paper)
- **key mismatch or risk**: the sentence a reviewer would attack
- **recommended use**: which part of the experiment it can serve (it may serve one and not another)
- **confidence**: high, medium or low, and what would raise it

### The decision

- **Pick** when the phenomenon is present, the metric is computable, and the mismatches are nameable and acceptable.
- **Abstain** otherwise. Do not assemble a shortlist of near-misses to look productive: a weak shortlist silently redefines the claim, and the next step builds on data that cannot answer the question.
- **Never compute this from scores**: no threshold on confidence, no weighted average. Automating the judgment guarantees it finds something "close enough".

## Synthetic data strategy

Read this before writing `dataset/synthetic/strategy.md`.

### The boundary (the sharpest rule)

> **Synthetic generation creates data/stimuli only. Never include experiment results, evaluator outputs, model responses, scores, metrics, verdicts or downstream outcomes in generated datapoints.**

Future experiments consume the dataset and write their results elsewhere. A dataset that carries results is contaminated for every later evaluator, and for the one you are building it for.

Corollary, enforced in the construction variables: **no evaluator identity and no downstream system config** in the data. The set must stay reusable by an evaluator you have not thought of.

### Strategy-first principles

- Start from the motivation and the public-data gap, then choose a strategy.
- **Do not assume seeds are universal.** A seed list expanded into rows is one mechanism that belongs to some strategies, not the shape of synthetic data as such.
- Choose the data unit from the research need, not from habit.
- Strategy, prompts and examples are Markdown; only datapoints are JSON.
- Synthetic data is a benchmark stimulus artifact. **It does not prove a claim by itself.**

### The seven strategy types: pick exactly one

| Type | One datapoint is | Use when |
|---|---|---|
| `independent_rows` | one self-contained case | each case independently tests the claim; no within-item contrast is needed |
| `paired_variants` | same-intent variants over controlled construction variables | surface perturbations, transformation families, intensity sweeps, with **intent held fixed** |
| `counterfactual_pairs` | a minimal meaning- or label-changing pair | isolating ONE causal edit (the difference from `paired_variants`: there the meaning is preserved, here it changes) |
| `stratified_cases` | cases spanning defined strata | coverage across domains, risk levels or capability bands is the point |
| `trajectory_dialogue` | a multi-step interaction | the phenomenon only appears over turns or steps |
| `ranking_pairs` | a set supporting relative judgment | the measurement is relative, not absolute |
| `custom` | — | only when none of the above fits; say why |

### Strategy document sections

- **Motivation fit**: what phenomenon the data must expose, in the requirement's words.
- **Strategy type**, and why.
- **Data unit**: what one datapoint represents (it may contain several rows or variants when the topology needs it).
- **Topology**: how the items inside one datapoint relate.
- **Construction variables**: what is varied and stratified (construction only; see the boundary).
- **Quality rules.**
- **Contamination and safety controls.**
- **Datapoint guidance**: a conceptual field list: source/clean content, variants, transformation family, intensity, category, split, provenance. No response, score or verdict fields, ever.

### Quality rules

- Every datapoint maps back to the strategy and the motivation.
- The topology must be visible in the datapoint itself.
- Paired variants preserve the same underlying intent; counterfactual pairs isolate the intended change.
- Vary the substance, not the surface: rows that differ only in wording are one row.
- Prototype small, inspect by hand, then scale.

### Contamination and safety controls

- **Do not copy benchmark items** unless the source explicitly allows it: test-set leakage invalidates the comparison.
- **Do not use generated examples as evidence that the claim is true.** They are stimulus; the experiment is the evidence.
- **Do not use the same model as both data generator and judge.** If the later experiment would do this, say so now: it changes the design.
- Keep safety-sensitive content abstract and non-operational unless the user has explicitly authorized otherwise.
