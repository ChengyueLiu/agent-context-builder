# Experiment integrity

> Source & date: Adapted from merevo's result-integrity and build-discipline references, 2026-08

Research code usually runs fine and quietly answers a different question than the one asked. These rules target that failure.

### One quantity, one name
- Use the same metric name in the plan, the code, the output file, and the analysis. A renamed metric is a lost result.
- The direction (higher or lower is better) travels with the name.
- Every metric the plan names appears in the output, even when degenerate: an absent key and a zero mean very different things.

### A control is a real control
- The baseline shares everything except the mechanism under test: same data, order, prompts, seed, scoring code, and version. Otherwise the comparison measures code paths, not the idea.
- If the method and the control produce identical numbers, suspect the wiring before concluding "no effect": check how many times the mechanism actually fired.

### Every number is traceable and honest
- Every result row names the claim it measures and the run that produced it. An unattributable number cannot support a conclusion.
- Emit structured output (JSON or CSV), compute the metrics rather than writing constants, and let errors surface: `except: pass` turns a failed run into a successful one.
- An empty result is not a success. Record it as failed or partial.
- Count and report every item that errored, timed out, or was skipped. A mean over a silently shrinking sample drifts toward whatever is easy to process.
- Seed everything random and take the seed as a parameter. Two runs of the same config that disagree beyond tolerance mean you cannot attribute a difference to the mechanism.
- Declare every stub, hard-coded return, or TODO in a required path. Code that silently returns a plausible constant has produced a fake result.

### Broken implementation or wrong idea
Check the gating checks before the main comparison. A failed gate means the implementation is broken: fix it, re-run, and conclude nothing about the claim. Gates passed and no effect is a result about the idea. Conflating the two turns a bug into a refuted hypothesis, or explains a real refutation away as "probably a bug".

### What a result does not license
A pilot licenses a pilot's conclusion. Scale, generality across domains, and causal mechanism each need their own evidence. State the boundary when you report the number, not when someone challenges it.
