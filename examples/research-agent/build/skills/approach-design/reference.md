# Approach design · Reference

## What a method spec must contain

The test of `method/method_spec.md`: **another agent implements from it without asking you questions, and Evaluation scores the result without asking either.** Every section below is required; write "N/A — <reason>" rather than dropping one silently.

### 1. Commitment
Two sentences: what the method does and what it claims to achieve, in the position's terms. If it cannot be said in two sentences, the design is still muddy.

### 2. Components and interfaces
Per component: its job, its inputs and outputs **with data shapes** (what one item looks like going in and coming out), and the dependency it introduces. Draw the flow; a list of "A → B" lines is fine. The implementer builds exactly this list.

### 3. Algorithm
The procedure at a level a competent stranger could re-derive: order of operations, the decision points, what happens on each branch. Pseudocode where prose gets ambiguous. Name the parts that are standard, and cite where they come from, so the implementer does not reinvent them.

### 4. Hyperparameters and defaults
Every knob: default value, plausible range, and what it trades off. A knob with no default is an unfinished decision handed to the implementer.

### 5. Metrics and logging contract
- Each metric with its **canonical key** (one name per quantity, used identically in the spec, the code's logs and Evaluation), its direction (higher or lower is better), and how it is computed.
- What the method must log per run for those metrics to be computable. This is the interface to Evaluation, and it is the most commonly forgotten section.

### 6. Baselines and comparison protocol
Which baselines, in which configuration, on which data, with what held constant. State what would make a comparison unfair and how you avoid it (what a real control shares with the method: see Experiment integrity).

### 7. Failure modes and diagnostics
Carried over from `method/proposal.md`, each now with the signal you would actually look at.

### 8. Unknowns
Everything you could not determine, listed explicitly. Unknowns belong here, never dressed up as decisions elsewhere in the document. Each unknown gets what it blocks and how it would be resolved.

## Rules

- **No ellipses, no "etc."**: an implementer cannot build "etc.".
- **One quantity, one name**: renaming a metric between spec, code and evaluation is the classic way to lose a result.
- **Standard parts get citations; novel parts get a full description**, clearly separated: the reader must know which is which.
