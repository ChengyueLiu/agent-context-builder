# System guarantees

These rules must be enforced by the system, not just by the prompt. This file is for the engineers implementing the agent; it is not given to the agent.

## User confirmation is required before deleting files, overwriting data, or sending anything externally

How it is enforced: Permission rules

## Experiments can run only in the sandbox

How it is enforced: Sandbox

## Evaluation scripts cannot be modified

How it is enforced: Evaluation scripts set to read-only

## Changes to the goals in Project overview require user approval

How it is enforced: An approval card in the interface; a chat message counts as a revision, never as approval.

## Numbers and claims must be traceable to run logs

How it is enforced: Every write to the claims list checks that each evidence pointer resolves to a file and anchor; unresolved pointers are reported back to the agent.

## Citations must actually exist

How it is enforced: Citation existence check

## The experiment log is append-only

How it is enforced: Append-only records

## Checks must pass before moving to the next step

How it is enforced: Checkpoints between steps

## The budget cannot be exceeded, and the same experiment is retried at most 3 times

How it is enforced: A cost cap and a per-experiment retry counter enforced outside the agent. After three checks in a row with no progress, or three crashes in a row, the project pauses for a human.

## Writes outside the project workspace are blocked

How it is enforced: A pre-tool-use hook checks the path of every write. It is a hook rather than an allow-list, so the check cannot be silently skipped.

## Only a check outside the agent can mark the project done

How it is enforced: A deterministic checker compares the deliverables with the done criteria. No model call is involved, and the agent has no tool to change the criteria.

## Secrets never reach the agent

How it is enforced: The agent's process gets an allow-listed set of environment variables; API keys stay with the model gateway.

## A user decision counts only when the user confirms it explicitly

How it is enforced: Decision cards in the interface. A chat message is treated as a revision, never as confirmation.

## Research tools stay locked until the user confirms the Project brief

How it is enforced: The tool gateway refuses literature, dataset and code tools until brief.md is confirmed.

## Every result row names a claim and a run

How it is enforced: `record_result` refuses rows without a claim id and a run id.

## Generated records are never edited by hand

How it is enforced: Screening reports and the corpus file are produced by tools and write-protected.
