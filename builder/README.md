# builder

本地网页编辑器。按九件事编辑 agent 的上下文，保存后自动编译成 agent 加载的文件。

## 用法

```bash
cd builder
npm install
npm run dev                 # 工作区是仓库的 examples/，里面有示例 research-agent
npm run dev -- ~/agents     # 用别的文件夹当工作区
```

浏览器打开 http://localhost:5299 ，首页列出工作区里的所有 agent，可以新建、打开。工作区里每个带 `agent.yaml` 的子文件夹是一个 agent。端口可以用 `PORT=xxxx npm run dev` 换。

不开网页也能编译：`npm run build-agent -- <agent 文件夹>`。测试：`npm test`。

## 一个 agent 文件夹

```
my-agent/
├── agent.yaml      骨架：有哪些阶段、领域、工具、情形
├── context/        卡片，按九件事分文件夹，人编辑的部分
└── build/          编译产物，给 agent 加载，不要手改
```

卡片是 markdown 文件，开头几行 yaml 字段写标签：

```markdown
---
entry: stage_practice          # 条目，见 template/default.yaml
when: stage:experiment-design  # 适用条件，决定输出位置
note: 新手常漏对照组             # 备注，可选，不进 agent
---

### 目标
……
```

规则只有一条：一张卡片只有一个去处。适用条件决定去处：

| 适用条件 | 编译到 |
| --- | --- |
| `always` 全部 | `build/system-prompt.md`，按件分节 |
| `stage:<id>` 某阶段 | `build/skills/stage-<id>/SKILL.md`（范例进同目录的 `examples.md`） |
| `domain:<id>` 某领域 | `build/skills/domain-<id>/SKILL.md` |
| `tool:<id>` 用某工具时 | `build/tools/<id>.md` |
| `situation:<id>` 某情形 | `build/reminders/<id>.md` |
| `on_demand` 需要时查阅 | `build/files/<标题>.md`，索引在 `build/files/INDEX.md` |

另外两个文件不进上下文：`mechanisms.md` 列出每条硬性约束和兜底的机制，给工程实现看；`manifest.yaml` 说明每个文件是什么、何时加载、由哪些卡片拼成，给任何 harness 接线用。

## 代码

```
src/core/     纯逻辑：模板、卡片格式、去向、编译、进度；node 和网页共用
src/server/   本地服务：读写 agent 文件夹，开发时挂 vite 提供网页
src/cli/      命令行编译
src/web/      网页（React + Ant Design）
test/         core 的测试
```
