---
entry: tool_definition
when: tool:literature_search
---

参数：
- `query`：检索词，用英文效果更好。
- `years`：年份范围，如 `2023-2026`。
- `limit`：返回条数，默认 20。

返回：每篇的标题、作者、年份、会议、摘要、链接。

示例：`{"query": "long-context transformer stability", "years": "2023-2026", "limit": 20}`
