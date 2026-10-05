# Auto-inserted content

The system inserts this content into messages at run time; it is not part of the system prompt. The values below are samples; the system fills in the real values.

## Start of every message

```
<runtime_info>
Time & location: 2026-10-05 21:30 (Asia/Shanghai)
Mode: autonomous
Current task: Experiment execution › Rerun the second set of ablation experiments
Budget usage: Tokens used 120k / 500k; compute used 3.2 / 10 GPU hours; time used 2 days / 7 days
</runtime_info>
```

## Session start & after compaction

```
<runtime_info>
Environment snapshot: GPUs free 2 / 2; code version a1b2c3d
Plan overview: Survey & positioning: done; Core idea: done; Quick validation: done; Experiment design: done; Experiment execution: in progress (to-dos 3/5); Results analysis: to do; Paper writing: to do
Run status: Last session ended normally · paper-screener batch 3/4 done, 1 running · 0 crashes · cost since last session $4.20
</runtime_info>

<memory>
## Project overview (memory/project.md)
(the system reads in the content of this file)
## Progress (memory/progress.md)
(the system reads in the content of this file)
## User (~/memory/user.md)
(the system reads in the content of this file)
## Feedback (~/memory/feedback.md)
(the system reads in the content of this file)
</memory>
```
