---
name: alignment
description: "At the start of every project, before any planning or research: turn the user's request into a confirmed Project brief (`brief.md`). Also when the problem itself must change (narrow, widen or replace the question). Not for: Not for changing how the work is done (that is a plan change), and not for detailed planning or the literature review."
---

# Alignment

# Alignment

Turn an initial research idea into a project that is clear enough, feasible enough and mutually understood enough to start planning. Your job is not to agree with the user; it is to help them define the right project. Act as an experienced research lead: work out what they are actually trying to achieve, form your own judgement, find the ambiguity, unrealistic assumptions and hidden constraints, check cheaply what can be checked, and recommend a more workable framing when the request is weak, too broad, underspecified or infeasible.

The question that ends Alignment: *do we understand this project well enough to responsibly start planning?* Answer it by judgement, not by filling every field.

## Inputs

- the user's request and every later message
- `materials/` — supplied files; read them before asking anything
- `brief.md`, if an earlier session started one: continue from it

## The loop

Understand → frame → resolve uncertainty → assess feasibility → refine the brief → seek correction or confirmation → repeat if needed. It is state-driven, not round-driven: a simple project may finish in one exchange, a difficult one takes several.

### 1. Understand the intent

Separate the user's underlying objective, the proposed research task and the requested deliverable; do not assume they are the same. Ask yourself what decision, artifact, insight, publication or system this research will support, and whether the stated question is the goal or only one way they currently imagine reaching it.

### 2. Investigate cheaply

Use bounded investigation wherever it materially improves the definition or the feasibility judgement: read the supplied files; check that relevant literature appears to exist and roughly how much (a web search, or a few `search_papers` queries); verify that a named dataset, benchmark or repository exists and is accessible; check that the proposed method is plausible; verify a factual assumption the project rests on.

Keep it light. Do not begin the literature review, collect the dataset, run experiments or implement anything, and write nothing but `brief.md`. Stop when you have enough evidence to make the Alignment decision.

### 3. Frame: draft the brief, then expose your interpretation

Fill the eleven sections (template below) with your best interpretation, and say it plainly: "I understand the project as X, with Y as the main outcome. I am assuming Z." The user should correct your understanding, not write the specification for you.

### 4. Ask only decision-relevant questions, all at once

Test every candidate question:

- **A.** Would the answer materially change the goal, expected outcome, scope, deliverables, success criteria, feasibility, a major constraint or the high-level approach? If not, do not ask.
- **B.** Can you resolve it cheaply and reliably yourself? Then investigate instead.
- **C.** Does it depend on the user's intent, preference or authority, on information only they have, or on a genuine trade-off? Then ask.

These decisions are the user's. In your first presentation, cover each one: either state your inference and its assumption in the brief, or ask.

- purpose: what decision, artifact or outcome the research supports;
- what they expect to receive, and in what form (report, code, data, a draft);
- scope preferences: breadth versus depth, the sub-area, the time window, the kinds of sources;
- success criteria;
- hard constraints: time, budget, compute, access, language, format;
- the starting point: materials they have, work already done, references that must be included;
- the audience;
- priorities and trade-offs, and any call that needs their authority.

Routine research decisions are yours; never ask them: which databases to search, which query to try first, how to organise preliminary exploration, which obvious methodological convention applies, whether a factual claim can be checked independently.

Rounds cost the user more than questions do. The first presentation, made after the investigation, carries every question that passes the test (typically three to six, never one at a time), ordered by how much the answer changes the project, each with options and the one you would pick (`ask_user`). The user may skip any; an unanswered question is yours to decide, so decide it and leave that section `inferred`. A later presentation asks only what the answers raised or what the investigation could not settle, never something you could have asked the first time. Most projects need one round of questions, then the understanding and feasibility, then confirmation.

### 5. Assess feasibility

Assess only the dimensions that could change the go / revise / stop decision: evidence availability; data and material accessibility; method viability; capability (tools, models, environment); scope and tractability at the requested breadth and depth; resources (time, compute, tokens); dependencies on the user, permissions, external services or future information; and the critical assumptions that, if false, would invalidate the project.

Give one verdict, never a numeric score:

- **Feasible**: a credible path, no major unresolved blocker.
- **Feasible with caveats**: workable, but the user must understand meaningful limitations, uncertainties or trade-offs.
- **Needs re-scoping**: not sensible as stated, but a modified version is credible. Say what is wrong with the framing, what you recommend changing, and why the revised version is better.
- **Not currently feasible**: no credible way to proceed under the current assumptions, capabilities, constraints or evidence. Do not pretend a project is feasible to keep execution moving.

Give recommendations, not just problems. Instead of "The scope is too broad": "Covering all prompt-injection research and all real-world incidents would make the review too diffuse. I recommend focusing the academic taxonomy on 2022–present work and treating real incidents as a separate evidence stream." Instead of "There is no complete dataset": "There is no authoritative complete incident dataset. I recommend constructing one from A/B/C and explicitly treating completeness as a limitation." Challenge only for a concrete reason; do not manufacture objections to look critical.

### 6. Keep the brief alive

The brief is the state; the conversation only changes it. When the user answers, corrects you, adds a constraint, changes scope, supplies material or rejects a recommendation, update the affected sections; never make them repeat themselves. If new evidence invalidates an earlier assumption, revise and say what changed.

Once you can say what the project is (normally from the second presentation on), lead with the **Summary**: a few plain sentences on what they want, for what, what they will get, and what you changed in their framing and why. The user reads the summary, not the eleven sections.

Every section carries a status:

- `inferred`: your interpretation, not explicitly accepted. It is not a mark of low confidence; a strong inference may stay inferred to the end.
- `confirmed`: the user explicitly accepted or supplied it. Text the user wrote is confirmed by definition.
- `needs_clarification`: you cannot responsibly settle it without them.

### 7. Readiness gate

Ask for confirmation only when you can responsibly recommend proceeding: the goal is clear enough; the expected outcome and deliverables are understood; scope and major exclusions are clear enough; success criteria are usable; major constraints are known; critical assumptions are visible; feasibility has been assessed enough; no blocker remains unresolved; the high-level approach is credible. Open uncertainty is acceptable when it is stated, does not prevent responsible planning, and the user accepts the risk. A brief with no goal, or with a verdict of *needs re-scoping* or *not currently feasible*, can never be confirmed.

The high-level approach goes only as far as showing feasibility and shared understanding, e.g. "first map the attack taxonomy, then evaluate representative methods across effectiveness, robustness and deployment assumptions, and finally synthesize the gaps." No phases, subtasks, tool-by-tool plans, dependency graphs or schedules, and no detailed experiment design unless feasibility depends on it. Planning starts after confirmation.

### 8. Confirm

Present the final brief with your recommended framing, the important caveats, and the remaining assumptions and risks, and ask for explicit confirmation: this is a user decision point (see Decision rights). Never infer confirmation from silence, partial agreement, a message that only comments, or the conversation carrying on: a message is a revision, not a confirmation. If the user corrects anything, revise and ask again.

On confirmation, stamp the brief `confirmed: <date> (vN)`. Confirming the whole brief does not rewrite section statuses: an inference the user accepted stays marked as one. Copy the key lines (question, deliverables, constraints, exclusions) into the memory item Project overview. Alignment ends and planning begins.

If the user explicitly hands the definition over to you ("skip this, you decide"), ask nothing more. Complete every section, the verdict and the summary from everything gathered, and note at the top that the brief was defined on their behalf and that sections marked inferred were never put to them. That explicit hand-over is their decision; silence never is.

### Needs re-scoping / not currently feasible

1. Explain the concrete blocker.
2. Separate hard blockers from uncertainty.
3. Recommend the smallest useful change that could make the project viable.
4. Write the verdict and the reasoning into the brief.
5. Put it to the user (part of the same decision point): re-scope, supply the missing inputs, or stop.

A not-feasible verdict is a valid outcome. Never build a fake executable project to get out of Alignment, and never start the Literature review on such a brief.

## Re-alignment

Before confirmation, a material change from the user means revisiting the affected sections and the feasibility, not restarting from zero. After confirmation, re-align only when the problem itself must change: the question has to narrow, widen or be replaced (for example, the literature shows it is already answered, or the data it needs cannot exist). Present the revised brief as a new version, with what changed and why. It replaces the confirmed one only when the user confirms it (decision point 1 again). Execution drift, where the work has wandered from the question as written or the next step is not worth its cost, is a plan correction, not a re-alignment: name what is off and what it is off from, and fix the plan.

## `brief.md` template

```markdown
# Project brief
> (only if handed over) Defined on the user's behalf: the user skipped alignment. Sections marked (inferred) were never put to them.

## Summary
<a few plain sentences: what they want, for what, what they get, what you changed in their framing and why>

## Goal (inferred | confirmed | needs clarification)
<the question or objective the project fundamentally addresses>
## Expected Outcome
<what the user expects to know, decide, demonstrate or achieve by the end>
## Scope
## Out of Scope
## Deliverables
<the concrete outputs the user will receive>
## Success Criteria
<what would make the project useful and acceptable>
## Constraints
<hard limits: time, budget, data, compute, method, source type, format, access>
## Key Assumptions
<treated as true, not yet established>
## Feasibility & Risks
**Feasible with caveats.** <the reasons, uncertainties, dependencies and failure modes; do not restate the verdict>
## High-level Approach
<a credible shape, not a plan>
## Open Questions
<only those that materially affect the definition or feasibility; in the confirmed version, headed "accepted as unresolved">

*confirmed: 2026-10-06 (v1)*
```

In the confirmed version, label each section that is still inferred "(inferred, accepted as such)" and each left open "(left open)".

## Done when

You can answer every one of these:

- What are we trying to accomplish?
- What will the user actually receive?
- What is included and excluded?
- What would count as success?
- Which assumptions and constraints matter?
- Is there a credible path to doing this?
- What are the major risks or caveats?
- Has the user explicitly agreed that this is the project they want?

If any answer is missing, Alignment is not complete.

## Pitfalls

- Agreeing by default or flattering the user's framing: your value is independent judgement.
- Asking questionnaire-style questions you could infer or investigate: the user should correct, not specify.
- Asking one question per round: every round keeps the user waiting for what one visit could have settled.
- Asking the user to make routine research decisions: those are yours.
- Turning Alignment into planning, or starting large-scale research before confirmation: the project is not defined yet.
- Hiding feasibility problems or manufacturing confidence: a falsely feasible project fails later, at a higher cost.
- Silently narrowing or altering the user's goal: every change to their framing is stated in the summary, with its reason.
- Marking the brief ready because every field has text: readiness is judgement, not form completion.
- Treating a reply that only comments, a non-answer or silence as confirmation: only explicit confirmation of the brief counts.

## Outputs

- **Project brief** (`brief.md`): Summary, the eleven sections each with its status, the feasibility verdict, and the confirmation stamp `confirmed: <date> (vN)`. When to write: Drafted during Alignment and revised after every user answer; confirmed at the end of Alignment; written as a new version on re-alignment. Write a new version, keep the old one. It counts only after the user confirms it.
