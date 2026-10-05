---
entry: tool_definition
when: tool:run_experiment
---

参数：
- `config`：实验配置文件的路径。
- `seed`：随机种子。

返回：运行 id、状态、结果文件和日志的位置。

示例：`{"config": "configs/ablation-1.yaml", "seed": 42}`
