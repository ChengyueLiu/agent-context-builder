# builder

本地网页编辑器。按预置的大纲填写一个 agent 的定义，保存后自动合成 agent 拿到的文件。

## 用法

```bash
cd builder
npm install
npm run dev                 # 工作区是仓库的 examples/，里面有示例 research-agent
npm run dev -- ~/agents     # 用别的文件夹当工作区
```

浏览器打开 http://localhost:5299 ，首页列出工作区里的所有 agent，可以新建、打开。工作区里每个带 `agent.yaml` 的子文件夹是一个 agent。端口可以用 `PORT=xxxx npm run dev` 换。

不开网页也能生成：`npm run build-agent -- <agent 文件夹>`。测试：`npm test`。

## 页面

三栏：

- **左边：目录**。功能性配置和非功能性配置两组，顺序和系统提示词一致。
- **中间：配置**。工作说明里的每一页是几个填写的框，每格要写到哪几点在标题后的 ⓘ 里。其余每一页顶上是在这一页填的系统提示词格子（比如记忆的“开工与接续”、过程纠正的“关卡”），下面是条目清单，每一项点开是一张表。记忆按本项目、跨项目分块，产出物按最终交付、过程成果、工作记录分块。
- **右边：系统提示词**。由左边的配置自动生成，不能直接改。打开哪一页，就滚到对应的那一节；还没保存的修改也先显示出来。

## 一个 agent 文件夹

```
my-agent/
├── agent.yaml            名称（新建时填写）
├── system-prompt.yaml    系统提示词里人写的格子
├── skills.yaml           Skill
├── knowledge.yaml        知识
├── tools.yaml            工具
├── helpers.yaml          帮手
├── provided.yaml         环境里的运行信息
├── memory.yaml           记忆管理
├── outputs.yaml          产出物管理
├── guarantees.yaml       系统保证（事前预防）
├── reminders.yaml        自动提醒（过程纠正）
├── cases.yaml            检验用例（事后改进）
└── build/                生成结果，每次保存后整体重写，不要手改
```

生成结果：

| 文件 | 内容 | 什么时候给 agent |
| --- | --- | --- |
| `system-prompt.md` | 系统提示词 | 开工时 |
| `tools.json` | 工具定义：名称、说明、要不要人批准。由程序随请求交给模型 | 开工时 |
| `skills/<标识>/SKILL.md` | 每个 skill 的正文；附带资料在同目录的 `reference.md` | 用到时 |
| `knowledge/<标识>.md` | 每份资料 | 用到时 |
| `reminders/<标识>.md` | 每条自动提醒 | 到时机时插入 |
| `guarantees.md` | 系统保证，交给工程实现 | 不给 |
| `cases.md` | 检验用例 | 不给 |
| `manifest.yaml` | 配置清单：有哪些文件、何时加载、记忆的完整配置、不进系统提示词的配置 | 不给 |

没写正文的 skill 不生成，也不进系统提示词的 Skill 一节。

## 代码

```
../template/default.yaml   大纲：有哪些栏目、每一栏写什么、生成到哪。改栏目只改这里
src/core/     纯逻辑：大纲的查询（outline）、合成（compile）、读写文件夹（store）
src/server/   本地服务：读写 agent 文件夹，开发时挂 vite 提供网页
src/cli/      命令行生成
src/web/      网页（React + Ant Design）
test/         测试：core 的逻辑，以及每个页面用示例 agent 渲染一遍
```
