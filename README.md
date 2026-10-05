# Agent Context Builder

把 agent 需要的上下文组织清楚：人按意义编辑，agent 按加载方式读取。

## 三部分

| 目录 | 是什么 | 状态 |
| --- | --- | --- |
| [docs/](docs/) | 方法：需要向 agent 交代什么、运行时从哪进入上下文、由谁在何时写到哪 | 草稿，持续修订 |
| [builder/](builder/) | 给人用的编辑器：按九件事编辑卡片，编译成 agent 加载的文件 | 第一版 |
| agent/ | 配置 agent：访谈设计者和用户，把材料归类，辅助人编辑和维护 | 还没开始 |

docs 是另外两部分的基础：builder 是方法的手工实现，agent 是方法的自动化。

## 共用的部分

- [template/](template/)：分类模板，即 docs 第 2 章的机器可读版（四组九件事、条目、各条目写什么）。文档改了分类，改这里，builder 不用改代码。
- [examples/](examples/)：示例 agent。`research-agent` 是 docs 第 5 章的自动化科研 agent。
- [reference/](reference/)：论文与调研笔记。
