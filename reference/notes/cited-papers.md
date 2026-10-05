# 引用核查：《一个 Agent 应该知道什么》的参考文献

核对对象：`docs/Agent Context.md`（2026-09-29 版，923 行，56 条参考文献）。核对日期：2026-10-03。

做法：
- 21 篇 arXiv 论文全部下载到 `reference/papers/`，用 `pdftotext` 抽出全文，逐条对照摘要和相关章节。
- 官方文档（code.claude.com、platform.claude.com）抓取 Markdown 原文核对。
- 博客抓取页面正文核对。
- GitHub 仓库克隆到临时目录，用 grep 和 git log 核对。
- 下文"第 N 行"均指 `docs/Agent Context.md` 的行号。
- 判定分四级：**准确 / 有偏差 / 无法核实 / 错误**。
- 凡是数字，只记录原文中找得到的；找不到的标"无法核实"，不推测。

总体结论：
- 论文类引用大多准确。问题集中在三类：把系统间比较当成消融（Curie）、把转引数字当成本文实验（ManyIH）、把未测试的说法挂在论文名下（SciIntegrity-Bench）。
- 有一处数字方向完全反了（Agents4Science 的 44%）。
- 对 Claude Code 的描述中，有几个具体数字和章节在所引来源里找不到。
- 有几条出处张冠李戴：72%→90% 和 85% 出自另一篇博客；进度文件与 JSON 任务清单出自另一篇博客；dream 整理的细节出自逆向提示词仓库，不是官方文档。
- 参考文献 [10]、[11]、[42]、[45] 在正文中从未被引用。

---

## 需要修正或存疑的地方

按严重程度排列。每条给出：文中原话 → 来源实际怎么说（带位置） → 建议改法。

### A. 错误：数字方向反了、出处错了，或结论与原文相反

**A1. Agents4Science 的 44% 方向反了**
- 位置：第 707 行，表 41，引 [32]。
- 文中："Agents4Science 约 44% 投稿含可疑引用"。
- 来源：[32] 正文 "Conference submissions" 之后讲自动引用核查的段落："We estimate that approximately 44% of submissions have **no** hallucinated references (111 papers), and the other papers have one or more references flagged as problematic." 完整投稿共 253 篇。
- 改为："Agents4Science 的 253 篇完整投稿中，约 56% 至少有一条引用被自动核查标为可疑，只有约 44%（111 篇）完全没有 [32]"。
- 另外，参考文献 32 的标题"Agents4Science citation analysis"不是原题。原题是 "Exploring the use of AI authors and reviewers at Agents4Science"，这是一份会议总结。

**A2. "示例把调用准确率从 72% 提到 90%""延迟加载省 85%"出处错了，也说宽了**
- 位置：第 126 行、第 286 行，引 [55]（第 286 行还引了 [4]）。
- 来源：
  - [55] "Writing effective tools for agents"（2025-09-11）全文没有这些数字，也没有讲延迟加载；[4] 仓库里也没有 85%。
  - 两个数字都出自另一篇："Introducing advanced tool use on the Claude Developer Platform"（2025-11-24，https://www.anthropic.com/engineering/advanced-tool-use）。
  - 72%→90% 的原文："In our own internal testing, tool use examples improved accuracy from 72% to 90% **on complex parameter handling**"。这是内部测试，且限于复杂参数。
  - 85% 的原文是一个示例场景：50 多个 MCP 工具预加载约 77K token，用 Tool Search Tool 后约 8.7K token，"an 85% reduction in token usage"。这不是一般规律。
- 改为：新增 advanced tool use 这条参考文献，写成"Anthropic 内部测试中，输入示例在复杂参数处理上把准确率从 72% 提到 90%；在一个 50 多个 MCP 工具的示例里，按需搜索工具把预加载从约 77K 降到约 8.7K token（减少 85%）"。

**A3. "进度文件、任务清单用 JSON"出处错了**
- 位置：第 199 行，引 [54]。
- 来源：
  - [54] "Harness design for long-running application development"（2026-03-24）没有讲进度文件和 JSON。
  - 出处是更早的 "Effective harnesses for long-running agents"（2025-11-26，https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents）。该文写了 `claude-progress.txt` 和 JSON 格式的 feature list，理由是 "the model is less likely to inappropriately change or overwrite JSON files compared to Markdown files"。[53] 也推荐了 `tests.json` 和 `progress.txt`。
- 改为：新增这条参考文献并改引。[54] 只保留第 474 行（那一处引用准确）。

**A4. "v2.0 的一整篇长提示词砍到 v2.1.20 的 269 token"是误读**
- 位置：第 474 行，引 [4]。
- 来源：[4] CHANGELOG v2.1.20："Main system prompt - Massively reduced from 2896 to 269 tokens; **most content extracted into separate, focused system prompts** (Doing tasks, Task management, Tone and style, Tool usage policy)"。
  - 这是把主提示词**拆成多个片段**，内容没有删。
  - 到 v2.1.53，这 269 token 的片段本身也被并入别处后移除。
- 改为：不要用它作"模型进步就删脚手架"的例证。可改写为"v2.1.20 起主提示词被拆成按条件拼装的多个片段"。
- 如果需要"淘汰"的例证，[54] 中作者从 Opus 4.5 换到 4.6 时去掉 sprint 结构，是直接的例子。

**A5. 表 41"不设'必须完成'的压力"防的不是"合成数据"**
- 位置：第 711 行，引 [30]。
- 文中："防什么：数据缺失时自行合成"。
- 来源：[30] §5.2 表 3，只针对 T08 数据缺失场景，7 个模型 × 3 个场景 × 3 轮，共 63 次：
  - 去掉完成压力后，合成数据的比例 57.1% → 55.6%，**几乎不变**。
  - 未披露的合成 20.6% → 3.2%。
  - 原文结论："Completion pressure does not determine whether agents synthesize data; it determines whether they admit it."
- 改为：把"防什么"改为"隐瞒合成（未披露的造假）"。数字本身准确，可注明"T08 场景，n=63"。

### B. 有偏差：归因不当、条件被换掉、或把系统间比较当消融

**B1. "提示词里的'不要编造'实测无效"并不是 [30] 测的**
- 位置：第 700 行。
- 来源：
  - [30] 的消融去掉的是一组"完成压力"指令：禁止停下、禁止提问、禁止报告失败、每步必须调用工具（附录 H）。两种条件的基础提示词里都没有"不要编造"。
  - 论文引言只说"显式禁止"已有人提出，但"yet their effectiveness remains unverified at scale"。
  - "七个模型都合成数据"与摘要一致，但按运行次数算约 56%-57%，不是每次都合成。
- 改为："数据缺失时，七个模型都出现过自行合成数据；去掉提示词中的完成压力后，合成比例几乎不变，只是更常如实披露 [30]"。
- 如果要保留"'不要编造'无效"，需要另找直接测过禁令的出处，否则应标为推论。

**B2. ManyIH："12 层约 40%、两层超过 99%"把三件事拼在了一起**
- 位置：第 71 行，引 [13]。
- 来源（[13] v4）：
  - §6.1：约 40% 是整个 ManyIH-Bench（最多 12 层，各样本层数不同）的**总体**准确率。最好的是 Gemini 3.1 Pro，42.7%；GPT-5.4 为 39.4%。
  - §6.1：">99%"是论文**转引** GPT-5 system card 在两层指令层级评测（例如系统提示词提取）上的结果，不是本文的两层条件。
  - §6.2：只在编码子集上做了 6、8、12 层三档，层数越多越差，从最易到最难的降幅为 6.8 到 24.1 个百分点。
  - 准确率是全有或全无：代码要通过单元测试，同时满足所有胜出的风格约束，所以不纯粹是"分辨优先次序"。
  - 论文主张真实 agent 需要**更多**层级、应训练模型支持任意层级，没有提出"不超过三层"。
- 改为："在最多 12 层冲突指令的 ManyIH-Bench 上，最好的模型总体准确率约 43%，且层数越多越差；而在两层的标准评测上，GPT-5 报告超过 99% [13]"。"有效力的层级不多于三层"应注明是本文据此作的设计取舍。
- 补充：所引的 Model Spec 版本本身就有五级（见 B3），与"不多于三层"也有张力。

**B3. Model Spec 的级别名称和冲突规则写错了**
- 位置：第 71、84 行，引 [7]。
- 文中："Model Spec 分平台、开发者、用户"；"Model Spec 只按来源"。
- 来源（2026-08-18 版）：
  - 权威级别是 **Root、System、Developer、User、Guideline**，另有 "No Authority"（assistant 和 tool 消息、不可信文本）。"Platform"这个名称只用到 2025-04-11 版。
  - 同一级别内 "superseded by an instruction in a later message at the same level"，即后来的覆盖先前的。
- 改为："Model Spec 分根、系统、开发者、用户、准则五级 [7]"；"Model Spec 按权威级别，同级按先后"。确实没有"窄条件优先"这一说，这个对比可以保留。

**B4. Curie："加检查后 78% 对 32%"其实是两个系统比较**
- 位置：第 710 行，引 [36]。
- 来源：[36] 表 2，加权平均的 Execution Setup 一项：Curie 78.1%，**OpenHands** 32.4%，Magentic-One 6.8%，都用 GPT-4o。这是系统之间的比较，论文中**没有**去掉检查模块的消融。Curie 的检查是自动校验器（Intra-ARM），不是"阶段之间等用户确认的检查点"。
- 改为："带自动实验设置与执行校验的 Curie，实验设置成功率 78.1%，OpenHands 为 32.4%（系统间比较，非消融）[36]"。

**B5. 压缩摘要"固定五段"只是 SDK 的模板**
- 位置：第 256、268、289、293 行，表 14、38，引 [4][28]。
- 来源：
  - 五段（Task Overview / Current State / Important Discoveries / Next Steps / Context to Preserve）只出现在 [4] 的 `system-prompt-context-compaction-summary.md`，该文件自注 "Prompt used for context compaction summary (for the SDK)"。
  - Claude Code CLI 自己的压缩提示词是**九段**：Primary Request and Intent、Key Technical Concepts、Files and Code Sections、Errors and fixes、Problem Solving、All user messages、Pending Tasks、Current Work、Optional Next Step。
  - [28] 对 /compact 的描述是六项：请求与意图、关键技术概念、文件与代码片段、错误与修复、待办、当前工作。
- 改为："Agent SDK 的压缩摘要固定五段 [4]；Claude Code CLI 的摘要更细，保留请求与意图、关键概念、文件与代码、错误与修复、待办和当前工作 [28]"。本文选五段作框架默认值可以，但不应说成是 Claude Code 的做法。

**B6. 压缩后保留什么：漏了限制条件，还有一处说反了**
- 位置：第 287、293 行，表 15、16，引 [28]。
- 来源：[28] "After compaction" 表：
  - 已调用的 skill 正文："Re-injected, capped at 5,000 tokens per skill **and 25,000 tokens total; oldest dropped first**"。
  - 带 `paths:` 的规则："Claude Code **reloads them as Claude reads files they match**"。它们会随对话被摘要掉，但再次读到匹配文件时会重新加载，不是永久丢失。
  - **skill 目录压缩后不重新注入**："Unlike the rest of the startup content, this listing is not re-injected after `/compact`. Only skills you actually invoked get preserved."
  - 另外：git 状态快照会刷新；最多重读 5 个最近修改的文件（超过 5,000 token 的只给路径）；matcher 为 compact 的 SessionStart hook 会重跑。
- 改为：
  - 补上"总计 25k、最早的先丢"。
  - "按路径触发的规则丢失"改为"被摘要掉，再读到匹配文件时重新加载"。
  - 表 15、16 中"skill 目录常驻"加注"Claude Code 压缩后不重新注入目录"。这直接影响本文"目录常驻、正文触发"的设计，框架如需保证目录在压缩后仍可见，要自己重新注入（例如用 SessionStart hook）。

**B7. "Agent SDK 用动态边界把按用户变的内容移到注入块"混淆了两个机制**
- 位置：第 285、293、492 行，引 [52]。
- 来源：
  - [52] 中把动态内容移进第一条 user message 的是 `excludeDynamicSections: true`（CLI 为 `--exclude-dynamic-system-prompt-sections`），只对 preset 生效，移走的至少是 auto memory 目录的位置。
  - `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` 只是把自定义 system prompt 切成两个带缓存断点的块，两块仍然都在 system 里。
  - "分量略轻"有原文："carry marginally less weight"。
- 改为：把"动态边界"改成 `excludeDynamicSections`。另外，第 492 行说"六个地方各对应 SDK 的一个入口"，后面却列了 7 个（preset+append、动态边界、settingSources、hooks、skills、subagents、自动记忆），需要对齐。

**B8. Claude Code 的"后台整理、修剪索引、相对日期改绝对、冲突只标记、三段格式"出处不对**
- 位置：第 472、474 行，引 [9][23]。
- 来源：
  - [9] 和 Claude Code 的其他官方文档都没有提到 dream 或后台整理。
  - 这些细节出自 [4] 的逆向提示词：
    - `agent-prompt-dream-memory-consolidation.md`：合并、相对日期改绝对、"Prune and index"。
    - `system-prompt-dream-claude-md-memory-reconciliation.md`：dream 时不改 CLAUDE.md，只给记忆加注。但如果过时的是记忆本身，要删掉或改写这条记忆。
    - `system-prompt-feedback-memory-body-structure.md`：规则 + Why + How to apply。
  - [9] 能支撑的只有"成功和纠正都记"：feedback 类型记录 "corrections you give Claude and approaches you confirm"。
  - [23] Dreams 是 **Managed Agents** 的研究预览，不是 Claude Code。它对过时或矛盾的条目 "replaced with the latest value"（替换，不是只标记）；产出一个新的记忆库，由人审查后整库启用或丢弃，不是逐条审批。
- 改为：这几处改引 [4] 的具体文件，并注明是逆向记录的提示词。[23] 只用来支撑"整理结果经人审查后启用"。

**B9. 把 [37]、[38]、[40] 当作"严把写入"的证据，用法与原文结论不符**
- 位置：第 714、854 行。
- 来源：
  - [40] AgentRxiv 是**正面**证据：能读到先前研究时，MATH-500 从 70.2% 升到 78.2%；不能读时停在 73.4%-73.8%（§3.1）。它测的是所发现方法在基准上的准确率，不是"论文质量"。§4.1 报告了幻觉结果，需要人工筛。
  - [38] Dynamic Cheatsheet 的主要结论是自我整理的记忆有大幅正收益（GPT-4o 的 Game of 24 从约 10% 升到 99%）。量化的负面结果只是"不整理、全量追加"有害（GPT-4o 的 AIME 2024 从 20.0% 降到 6.7%）。"错误被放大"是讨论中的定性观察。
  - [37] ReasoningBank 是每个任务结束后**同步**提炼，不是"后台"。它从成功和失败中都提炼（加入失败轨迹 46.5 → 49.7），而且**不经人工审批**也带来了提升。
- 改为：
  - "错误经验被照抄"的直接证据落在 [39]（全部写入 vs 严格筛选：RegAgent 55.48 vs 70.95，EHRAgent 13.05 vs 38.50）。
  - [38] 改为支撑"需要整理，全量追加有害"。
  - [40] 改写为"正面证据只有单一基准、单一小模型，且要人工筛查幻觉"。
  - "在后台"改引 [14][20][21]。
  - 建议在 5.5 节正面回应 [37]、[38] 这类"无审批也有正收益"的结果。

**B10. "Doing tasks 一节（探索、计划、实现、验证）"把两个来源混在了一起**
- 位置：第 169 行，引 [4]。
- 来源：[4] 中任何版本的 Doing tasks 都没有这四步（v2.1.20 版讲先读后改、安全、避免过度设计）。四步出自 [47] 的 "Explore first, then plan, then code"，原文四步是 **Explore、Plan、Implement、Commit**。
- 改为："Claude Code 最佳实践推荐的探索、计划、实现、提交四步 [47]"。

**B11. "新模型对 CRITICAL、MUST 反应过度"说宽了**
- 位置：第 337 行，引 [47][53]。
- 来源：
  - [53] 只就 **Claude Opus 4.5 和 4.6 的工具或 skill 过度触发**说："dial back any aggressive language. Where you might have said 'CRITICAL: You MUST use this tool when...', you can use more normal prompting"。
  - [47] 只支持后半句："If you emphasize many lines, none of them stands out."
- 改为："对部分新模型（Opus 4.5/4.6），工具和 skill 说明里的 CRITICAL、MUST 会导致过度触发 [53]；全篇强调等于没有强调 [47]"。

**B12. OWASP 引用的只是一项，却被称作"风险清单"**
- 位置：第 69、156 行，引 [16]。
- 来源：链接是 LLM07:2025 System Prompt Leakage，只是 OWASP Top 10 for LLM Applications 2025 中的一项。第 335 行"交给机制"的用法准确，原文为 "rely on systems outside of the LLM"。
- 改为：如果要声称"硬规则对照了 OWASP 风险清单"，应引整份 Top 10（https://genai.owasp.org/llm-top-10/）。否则写明"LLM07"。

**B13. 亚里士多德：两类前提的说法不在所引章节**
- 位置：第 58 行，引 [49]。
- 来源：
  - 第三卷第 3 章确有"我们商议的不是目的而是手段"，以医生、演说家、政治家为例。
  - "行动结论要从'应当'与'是'两类前提推出"是实践三段论，在 III.3 找不到。它出自《尼各马可伦理学》第七卷第 3 章（1147a）和《论动物的运动》第 7 章（701a："the premisses of action are of two kinds, of the good and of the possible"）。
  - "规则约束的正是这些手段"是本文的引申。
- 改为：给两类前提另加 NE VII.3 或 De Motu 7 的引用。

**B14. autoresearch 被当作"机制"的依据，其实是提示词约定**
- 位置：第 708 行，表 41，引 [34]。
- 来源：program.md 在 "What you CANNOT do" 下写 "Modify `prepare.py`. It is read-only."，仓库里没有用文件权限强制。
- 改为："autoresearch 在 program.md 中规定评估文件只读（提示层约定）"，或换一个有强制机制的例子。否则与 5.5 节"提示词约束不够"的论点自相矛盾。

**B15. AI Scientist v1"延长时限"对应的是资源约束，不是"迎合结论"**
- 位置：第 708 行，引 [33]。
- 来源：[33] §8 "Safe Code Execution"："when The AI Scientist's experiments exceeded our imposed time limits, it attempted to edit the code to extend the time limit arbitrarily"。事实准确。
- 改为：这条更直接支撑"资源上限交给机制、实验在沙箱中运行"，放在"修改实验以迎合结论"一行有点牵强。

**B16. "硬规则和质量标准任何人都不能修改"超出出处，也与本文自相矛盾**
- 位置：第 472 行，引 [26]。
- 来源：[26] chapter9.md 原文："不能修改批准自身更新的验证器、测试用例、发布门槛……"，说的是 **agent 不能改评判自己的东西**。
- 改为："agent 不能修改评判自身的标准"。"任何人都不能改"与 4.4 节"产品方内容随版本修改"、表 25 冲突。

**B17. 协作规约"提示词里只留如实报告一句"不准确**
- 位置：第 122 行，引 [4]。
- 来源：[4] 中另有 "Action safety and truthful reporting"（161 tks）、"Reporting outcomes"（261 tks）、"Delivering work at full scope"（605 tks）等成段的协作内容；AskUserQuestion 的何时问确实存在（60 tks）。
- 改为："Claude Code 把大部分交给权限模式，提示词里保留关于如实汇报和交付完整度的几段"。

**B18. 其他措辞或范围偏差（影响较小）**
- 第 71 行 [12] MINJA：攻击途径是"任何用户的查询"（注入成功率 98.2%，攻击成功率 76.8%），不是"读过不可信材料"。结论"agent 写的记忆可被投毒"成立。
- 第 71 行 [9][50]"Claude Code 在三者之上另有组织策略一层"：managed settings 在设置层级里最高，但 managed CLAUDE.md 只是最先加载、不能排除，并不覆盖其他 CLAUDE.md，也不在平台规则之上。本文表 3 也把组织排在产品方之后。建议改为"之外"。
- 第 71 行 [14]"记忆是回忆而非权威"：README 里没有这句。相近的话在读取模板 `read_path.md`："Do not present unverified memory-derived facts as confirmed-current"。
- 第 474 行 [14]"30 天"：不在 README 中，是代码默认值（`DEFAULT_MEMORIES_MAX_UNUSED_DAYS = 30`），可配置，删除的是未入选整合的 stage-1 记录。
- 第 335 行 [47]"每个动作前审查"：原文是 "reviews **most** actions"。
- 第 69 行 [3]"上下文**只由**六种成分组成"：综述是把六个分量对应到各章，没有声称穷尽。
- 第 291 行 [18]"超过数百条后明显下降"：只有推理模型是这样（150 到 250 条后），很多模型从几十条起就线性或指数下降；偏向靠前的指令在 150 到 200 条最强，300 条以上减弱。而且指令是关键词包含约束。
- 第 654 行 [29]：FARS 的 paper blueprint 在**写作阶段**、实验之后才整理，本文的论断清单是项目开始时的事前清单。说"受其启发"更准确。
- 第 472 行 [25]：数字准确。但"自生成"是 agent 动手前用 skill-creator 凭任务说明写的 skill，不是从经验中提炼的；而且只测了 3 个组合，16.6 pp 则是 18 个组合的平均。
- 第 71 行 [8]：宪法明言 "This is not a strict hierarchy"，表 3 写成了严格顺序。
- 第 23、242 行 [21]：Gemini CLI auto memory 是默认关闭的实验功能，与 Claude Code、Codex 并列为"同一套做法"时应注明。
- 第 285 行 [9]"逐文件标明类型、块首写明效力"：[9] 只说作为 user message 注入。类型标签见 [4] 的 `system-reminder-memory-file-contents.md`，效力声明见 [52]。

### C. 无法核实：所引来源中找不到

**C1. Claude Code 的若干数字和章节在 [4] 中找不到**
- 第 284 行"Opus 5.5 版 857 词，Sonnet 4.5 版 4260 词"：仓库里没有这两个数字，也不按模型组装整篇提示词，计量单位是 token 不是词。
- 第 286 行"20 到 24 个工具，4.7k 到 8.8k 词"：仓库有 224 个工具描述文件，含变体，推不出每次会话的工具数和词数。
- 第 291 行"新模型主提示词比旧版短五倍，砍掉语气、待办和任务做法"：依赖上面两个数字。语气、待办、Doing tasks 的片段在当前版本中仍然存在。
- 第 116 行"Context management 一节……完整优先于节省上下文"：`git log -S'Context management'` 在仓库全部历史中**没有结果**。
- 第 124 行"Memory 是主提示词里最长的一节"：Memory 片段 487 tks，"Executing actions with care" 一个片段就有 1105 tks；Opus 5.5 实际收到哪些片段无法判断。
- 内部一致性：第 474 行的 269 是单个片段的 token 数，第 284 行的 857 是整篇的词数。
- 建议：这些数字如果来自作者自己的抓取或统计，应写明方法、日期和版本，或改引作者自己整理的数据。否则建议删去具体数字。

**C2. [56] 未发表笔记**
- 第 58 行"四种性质"、第 69 行"十二项需求逐项落进九件事"无法核实。完整性论证的一条线依赖它，建议在附录列出十二项及其对应。

### D. 参考文献列表本身的问题

- **未被引用的条目**：[10] ADK、[11] How People Learn、[42] Alavi & Leidner、[45] Gopen & Swan 在正文中**一次也没有被引用**（四个链接都能打开）。建议补上引用位置或删除。
- **标题不是原题**：
  - [15] 应为 "How we contain Claude across products"。
  - [22] 应为 "An update on recent Claude Code quality reports"（2026-04-23）。
  - [32] 应为 "Exploring the use of AI authors and reviewers at Agents4Science"。
  - [54] 应为 "Harness design for long-running application development"。
- **建议新增的参考文献**：
  - Anthropic "Introducing advanced tool use"（A2）。
  - Anthropic "Effective harnesses for long-running agents"（A3）。
  - GPT-5 system card（如保留 >99%，见 B2）。
  - 《尼各马可伦理学》VII.3 或《论动物的运动》7（B13）。
- **链接过宽**：[5] 指向 Codex 仓库根目录，建议指向 `codex-rs/models-manager/models.json` 中的模板，或具体提示词文件。

### E. 对 builder 预算的影响

`template/default.yaml` 当前用到 `skill_lines: 500` 和 `skill_description_chars: 1536`。核对结果和建议如下：

| 预算 | 文中说法 | 来源实际 | 建议 |
| --- | --- | --- | --- |
| SKILL.md 行数 | "正文不超过 500 行"（表 15 写成"上限"） | [6]："Keep SKILL.md body under 500 lines for optimal performance"；[51]："Keep SKILL.md under 500 lines"。是**建议值** | 保留 500，作为警告而非硬错误 |
| skill 描述字符 | "每条不超过 1536 字符" | [51]：Claude Code 把 description + when_to_use 合并后**截断**在 1,536，可用 `skillListingMaxDescChars` 调整；[6] 平台规范：description **最长 1,024** | 跨平台用的话取 1024；只针对 Claude Code 可用 1536，并把 when_to_use 计入 |
| skill 目录总量 | "目录占上下文 1%" | [51]：listing 的字符**预算**按上下文窗口的 1% 计，可用 `skillListingBudgetFraction` 调整；超出时先丢最少用的 skill 的描述 | 当作预算上限，不是实际占用 |
| 记忆索引 | "前 200 行常驻" | [9]："first 200 lines of MEMORY.md, **or the first 25KB, whichever comes first**" | 同时检查 200 行和 25KB |
| CLAUDE.md | 未写 | [9] 建议每个 CLAUDE.md 不超过 200 行 | 可加为注入块的建议上限 |
| 压缩后 skill | "只留前 5k token" | [28]：每个 5,000 token，**总计 25,000**，最早调用的先丢；截断保留开头 | 增加总量上限，并保持"关键指令放开头" |
| 压缩后 skill 目录 | 默认常驻 | [28]：**不重新注入** | 框架需要自行在压缩后重新注入目录 |
| 压缩后文件 | 未写 | [28]：最多重读 5 个最近修改的文件，超过 5,000 token 只给路径 | 状态文件要小 |
| 工具输出 | 未写具体值 | [55]：Claude Code 默认把工具响应限制在 25,000 token | 可作为"输出上限"的默认值 |
| 压缩摘要结构 | 固定五段 | 五段是 SDK 模板 [4]；CLI 是九段，[28] 列了六项 | 五段可作本框架默认，不要标为 Claude Code 的做法 |
| 系统提示词 | 科研 agent "控制在一千词左右"；模板 `system_prompt_tokens: 2000` | 文中作为依据的 857 / 4260 词无法核实（C1） | 预算可以保留，但不要用 C1 的数字作依据 |

---

## 逐条记录

格式：引用与链接、本地文件；做什么（2 到 4 句）；关键发现与数字；文中说法与判定；支撑方法的哪一部分。编号与原文一致。

### [1] Anthropic. Effective context engineering for AI agents（2025-09-29）

- 链接：https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents ；本地：无（网页）
- 内容：Anthropic 工程博客，提出把"上下文"当作有限的注意力预算来管理，并讨论系统提示词的"合适高度"、工具、示例、即时检索与渐进披露，以及长任务的压缩、笔记和子 agent。
- 关键说法：
  - "Context refers to the set of tokens included when sampling from a large-language model"。
  - 不建议把一长串边界情况塞进提示词，应 "curate a set of diverse, canonical examples… examples are the 'pictures' worth a thousand words"。
  - "Context retrieval and agentic search" 一节提出渐进披露。
- 文中说法与判定：
  - 第 52 行"上下文定义"：**准确**。"权重 + 上下文"的两分是作者自己的表述。
  - 第 120 行"范例比规则清单有效"：**准确**。
  - 第 291 行"渐进披露"：**准确**。"目录 → 正文 → 附件"三级结构出自 [6]，不是 [1]。
- 支撑：2.1 节、做法的"范例"、3.1 节渐进披露。

### [2] Sumers et al. Cognitive Architectures for Language Agents (CoALA)

- 链接：https://arxiv.org/abs/2309.02427 ；本地：`reference/papers/2309.02427-coala.pdf`（TMLR 02/2024 版）
- 内容：借用 Soar 等认知架构，把语言 agent 描述为三部分：记忆（工作记忆 + 长期的情景、语义、程序记忆）、动作空间（内部动作：检索、推理、学习；外部动作：grounding）、决策过程（规划阶段的提议、评估、选择，然后执行，形成循环）。
- 关键结论：没有实验数字，是概念框架。把程序记忆定义为"代码与权重中的规则"，语义记忆是关于世界的事实，情景记忆是过往经历。
- 文中说法：第 25 行"CoALA 把认知科学的记忆分类映射到语言 agent"；第 48 行"Agent 是一个不停做决定的系统：看当前情况，决定下一步，执行，再看结果"。
- 判定：**准确**。
- 支撑：1.3 现状、2 章开头"决定的结构"。

### [3] Mei et al. A Survey of Context Engineering for Large Language Models

- 链接：https://arxiv.org/abs/2507.13334 ；本地：`reference/papers/2507.13334-context-engineering-survey.pdf`
- 内容：综述 1400 余篇文献，把上下文工程分为基础组件（检索与生成、处理、管理）和系统实现（RAG、记忆、工具、多智能体）。
- 关键结论：§3 式 (2) 把上下文写成 C = A(c_instr, c_know, c_tools, c_mem, c_state, c_query)，六个分量分别对应综述的各章。
- 文中说法：第 25 行"形式化为指令、知识、工具、记忆、状态、请求六个分量"——准确。第 69 行"上下文**只由**这六种成分组成"——综述是把分量与本综述的章节对应起来，没有声称这是穷尽的分类，"只由"说得比原文强。
- 判定：**准确**（第 25 行）/ **有偏差**（第 69 行措辞偏强）。
- 支撑：2.2 节"四组本身也过了这两条线"的完整性论证。

### [4] Piebald-AI. Claude Code system prompts, tracked by version

- 链接：https://github.com/Piebald-AI/claude-code-system-prompts ；本地：无（核对时克隆到临时目录，HEAD 42962c3，2026-10-02，对应 CC v2.1.288；另对照了与文档日期相符的 71f578f，2026-09-29，CC v2.1.285）
- 内容：第三方从 Claude Code 的 npm 构建产物中提取的提示词字符串，拆成 800 多个片段，每个片段标 **token 数**（不是词数）。CHANGELOG 覆盖 v2.0.14 以来 304 个版本。仓库**不按模型组装**完整的提示词，也不统计词数；按模型区分的只有少数片段。这是逆向记录，不是 Anthropic 官方文档。
- 关键事实：
  - v2.1.20 的 CHANGELOG："Main system prompt - Massively reduced from 2896 to 269 tokens; most content extracted into separate, focused system prompts (Doing tasks, Task management, Tone and style, Tool usage policy)"，是**拆分**，不是删除。v2.1.53 时这 269 token 的片段也被并入别处后移除。
  - v2.1.285 有 114 条 System Reminder 模板（HEAD 为 118 条）。
  - git 提交流程在 "Tool Description: Bash (Git commit instructions)"（1477 tks）中。
  - 身份片段 "Interactive agent intro (short)" 只有 27 tks："You are an interactive agent that helps users with software engineering tasks."
  - 有 "# Harness" 片段（299 tks）。
  - 压缩模板：五段的 `system-prompt-context-compaction-summary.md` 标注 "for the SDK"；CLI 自身的压缩提示词（`agent-prompt-conversation-summarization-with-additional-instructions.md`、`system-prompt-partial-compaction-instructions.md`）是九段：Primary Request and Intent、Key Technical Concepts、Files and Code Sections、Errors and fixes、Problem Solving、All user messages、Pending Tasks、Current Work、Optional Next Step。
  - dream 整理提示词 `agent-prompt-dream-memory-consolidation.md` 包含合并近似条目、相对日期改绝对、"Prune and index"。
  - `system-prompt-dream-claude-md-memory-reconciliation.md` 规定 dream 时不改 CLAUDE.md，只给记忆加注。
  - `system-prompt-feedback-memory-body-structure.md` 规定"规则 + **Why:** + **How to apply:**"三段。
- 文中说法与判定：
  - 第 116 行"身份只有一行"：**准确**。
  - 第 120、286 行"git 流程在 Bash 描述里"：**准确**。
  - 第 128 行 Harness 一节：**准确**。"领域知识一条不写"只对主提示词成立，仓库里另有 137 个 Data 条目（如 Claude API 参考），通过 skill 或数据加载。
  - 第 289 行"约 110 条模板"：**准确**（114 条）。仓库把 git 状态和环境归在 System Prompt，不在 reminder 里。
  - 第 156 行六项硬规则：**基本准确**。"权限拒绝不换路径重试"与 Harness 片段的措辞 "a denied call means the user declined it — adjust, don't retry verbatim" 有出入，不绕路的说法只出现在个别片段里。
  - 第 474 行"从 v2.0 的一整篇长提示词砍到 v2.1.20 的 269 token"：**错误（误读）**，是拆分。
  - 第 289 行"压缩摘要固定五段"：**有偏差**，五段是 SDK 模板，CLI 是九段。
  - 第 169 行"Doing tasks 一节（探索、计划、实现、验证）"：**有偏差**。仓库任何版本的 Doing tasks 都没有这四步。四步出自 [47] 的 "Explore first, then plan, then code"，原文为 Explore、Plan、Implement、Commit。
  - 第 122 行"提示词里只留如实报告一句和提问工具描述里的何时问"：**有偏差**。另有 "Action safety and truthful reporting"（161 tks）、"Reporting outcomes"（261 tks）、"Delivering work at full scope"（605 tks）等成段的协作内容。
  - 第 284 行"Opus 5.5 版 857 词，Sonnet 4.5 版 4260 词"：**无法核实**，仓库中没有这两个数字，也没有按模型组装的整篇提示词。
  - 第 286 行"20 到 24 个工具，4.7k 到 8.8k 词"：**无法核实**。仓库有 224 个工具描述文件和 26 个参数文件，含变体与子片段，推不出每次会话的工具数和词数。
  - 第 291 行"新模型主提示词比旧版短五倍，砍掉语气、待办和任务做法"：**无法核实**。4260/857 ≈ 4.97，与第 284 行自洽，但两个基数都没有出处；语气、待办、Doing tasks 的片段在 HEAD 中仍然存在。
  - 第 116 行"Context management 一节就是一条优先级声明，完整优先于节省上下文"：**无法核实，很可能有误**。`git log -S'Context management'` 在全部历史中没有结果。最接近的是 "Delivering work at full scope"（"Finish the whole task, not just easy parts"），但它不涉及上下文。
  - 第 124 行"Memory 是主提示词里最长的一节"：**无法核实**。Memory 指令片段 487 tks，"Executing actions with care" 一个片段就有 1105 tks；Opus 5.5 实际收到哪些片段无法从仓库判断。
  - 第 284 行"环境信息放在它之外以保住缓存"：[4] 没有直接写，[52] 有相关说明（环境信息与 CLAUDE.md 放在对话里，不影响 system prompt 缓存）。
  - 内部一致性：第 474 行的 269 是**单个片段的 token 数**，第 284 行的 857 是**整篇的词数**，两处不可能都在说"主提示词"。
- 支撑：全文对 Claude Code 的大量对照（30 处引用），是被引最多的一条。建议把每个具体数字落到仓库的文件名和版本号上。

### [5] OpenAI. Codex base instructions

- 链接：https://github.com/openai/codex （核对时 HEAD 86a54b0，2026-10-03）；本地：无
- 内容：各模型的基础提示词放在 `codex-rs/models-manager/models.json` 的 `model_messages.instructions_template`（11 个模型）中；旧版另有 `codex-rs/core/gpt_5_2_prompt.md` 等文件。
- 关键事实：gpt-6-astra、gpt-6-sol、gpt-5.6-*、gpt-5.5 的模板都有 "# Autonomy and persistence" 和 "# Working with the user"，gpt-6 的模板还有 "# When to ask the user for permission"。
- 文中说法与判定：第 122、184 行"Codex 的自主性与协作两节"：**准确**。
- 建议：链接指向仓库根目录过宽，可改为 models.json（即 [46]）或具体的提示词文件。
- 支撑：协作规约。

### [6] Anthropic. Agent Skills best practices

- 链接：https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices ；本地：无
- 内容：平台文档，讲 skill 的写法：简洁、渐进披露、评测先行、引用层级等。
- 关键说法：
  - "Keep SKILL.md body under 500 lines for optimal performance"。
  - "Keep references one level deep from SKILL.md"。
  - "Create evaluations BEFORE writing extensive documentation"。
  - frontmatter 中 `description` 最长 1,024 字符，`name` 最长 64 字符。
- 文中说法与判定：
  - 第 287、675 行"正文不超过 500 行，附件只引一层"：**准确，但这是建议，不是硬上限**。表 15 写成"正文有上限"，应改为"建议"。
  - 第 470 行"先写评测"：**准确**。
  - 第 287 行"每条不超过 1536 字符 [6][51]"：1536 出自 [51]；[6] 规定的是 description 不超过 **1024**。跨平台的 builder 预算应取 1024。
- 支撑：3.1 表 15 的 skill 一行、4.4 节。

### [7] OpenAI. Model Spec（2026-08-18 版）

- 链接：https://model-spec.openai.com/2026-08-18.html ；本地：无
- 内容：OpenAI 对模型行为的规范，核心是"指令链"（chain of command）和各条款的权威级别。
- 关键说法：
  - 该版本的权威级别是 **Root、System、Developer、User、Guideline**，另有 "No Authority"（assistant 和 tool 消息、引用的或不可信的文本）。"Platform"这一名称只到 2025-04-11 版为止，2025-09-12 版起改为 Root/System。
  - "includes root-level rules as well as user- and guideline-level defaults, where the latter can be overridden"。
  - 指令在三种情况下不适用：与上级冲突、"superseded by an instruction in a later message at the same level"、或疑似有误。
- 文中说法与判定：
  - 第 71 行"Model Spec 分平台、开发者、用户"：**有偏差**。所引版本是五级，且这本身与"有效力的层级不能多于三层"的主张有张力。
  - 第 84 行"Model Spec 只按来源"：**有偏差**。同级之间按先后（后来的覆盖先前的）；只是确实没有"窄条件优先"一说。
  - 第 71 行"外部材料的指令没有效力"：**准确**。
  - 第 118 行"规则与默认值"：**准确**。
  - 第 69、156 行"规则层"：**准确**。
- 支撑：表 3 来源与效力、2.4 硬规则。

### [8] Anthropic. Claude's constitution

- 链接：https://www.anthropic.com/constitution ；本地：无
- 内容：Anthropic 对 Claude 价值观与行为的总纲。
- 关键说法：
  - "Claude's three types of principals are Anthropic, operators, and users"，信任大致按此顺序，但 "This is not a strict hierarchy, however. There are things users are entitled to that operators cannot override."
  - 对话中输入里夹带的指令 "should be treated as information rather than as commands"。
- 文中说法与判定：第 71 行三类委托人：**准确**。表 3 把顺序写成严格的，可补一句"宪法明言不是严格层级"。
- 支撑：表 3。

### [9] Anthropic. Claude Code: Manage Claude's memory

- 链接：https://code.claude.com/docs/en/memory ；本地：无
- 内容：Claude Code 的 CLAUDE.md 层级（managed、项目、用户、本地）、`.claude/rules/` 路径规则，以及 auto memory。
- 关键说法：
  - auto memory 有四种类型 user/feedback/project/reference，记在 `type` frontmatter 中。
  - "The first 200 lines of `MEMORY.md`, or the first 25KB, whichever comes first, are loaded at the start of every conversation"。
  - 项目记忆位于 `~/.claude/projects/<project>/memory/`，只在本机。
  - 多个 CLAUDE.md "concatenated into context rather than overriding each other"，冲突时 "Claude may pick one arbitrarily"。
  - CLAUDE.md 作为 user message 放在 system prompt 之后。
  - 建议每个 CLAUDE.md 不超过 200 行。
- 文中说法与判定：
  - 第 130、242 行"四种类型"：**准确**。
  - 第 84 行"规则按路径匹配触发；CLAUDE.md 之间不定优先级，模型可能任选一个"：**准确**。
  - 第 374 行"项目记忆在用户目录下，不进仓库"：**准确**。
  - 第 288 行"记忆索引前 200 行"：**准确但不完整**。应为"前 200 行或前 25KB，以先到者为准"，builder 的预算需要两个上限一起用。
  - 第 285 行"逐文件标明类型注入，块首写明效力 [9][52]"：**有偏差**。[9] 只说作为 user message 注入。逐文件类型标签见 [4] 的 `system-reminder-memory-file-contents.md`，块首效力声明见 [52]。
  - 第 472、474 行"后台整理、修剪索引、相对日期改绝对、三段格式"：**出处错**。[9] 不含这些内容，实际出自 [4] 的 dream 和 feedback 提示词文件，见"需要修正"B10。
  - 第 472 行"成功和纠正都记"：**准确**。feedback 类型记录 "corrections you give Claude and approaches you confirm"。
- 支撑：2.4 表 13、3.1 表 15、4.2 节。

### [10] Google. ADK sessions and state

- 链接：https://adk.dev/sessions/state/ ；本地：无
- 正文**从未引用**。链接可以打开（页面标题 "State - Agent Development Kit (ADK)"）。
- 判定：**未使用**。可用于 2.3 节"当前状态"或 4.2 节"运行时目录"作为对照，或删除。

### [11] National Academies. How People Learn, ch. 2

- 链接：https://www.nationalacademies.org/read/9853/chapter/5 ；本地：无
- 正文**从未引用**。链接可以打开（HTTP 200）。
- 判定：**未使用**。建议在正文中引用（例如 2.1 节"博士自带专业知识"的类比，对应专家与新手），或从列表删除。

### [12] Dong et al. MINJA: Memory Injection Attacks on LLM Agents via Query-Only Interaction

- 链接：https://arxiv.org/abs/2503.03704 （文中引用 v4 的 HTML，本地为 v5）；本地：`reference/papers/2503.03704-minja-memory-injection.pdf`
- 内容：攻击者不能直接改记忆库，只能像普通用户一样提问。通过"桥接推理步骤"加上逐步删去的引导提示，让 agent 自己生成并存入恶意记录，之后受害者用户的查询会检索到这些记录。
- 关键结论：在 3 个 agent（EHRAgent、RAP、QA agent）上，注入成功率平均 98.2%，攻击成功率平均 76.8%（§1 贡献列表、表 1）。
- 文中说法：第 71 行"agent 写的只是带来源的参考，因为它可能写于读过不可信材料之后"。
- 判定：**基本准确，有小偏差**。MINJA 的攻击途径是**任何用户的查询**，不是 agent 读到的外部文档。它确实证明了 agent 自己写的记忆可以被投毒，所以结论成立，只是"读过不可信材料"不是这篇论文测的途径。建议改为"它可能被不可信的输入（包括其他用户的查询）诱导写入"。
- 支撑：表 3 来源与效力——"agent 写的无效力"。

### [13] Zhang et al. Many-Tier Instruction Hierarchy in LLM Agents (ManyIH)

- 链接：https://arxiv.org/abs/2604.09443 ；本地：`reference/papers/2604.09443-many-tier-instruction-hierarchy.pdf`（v4，2026-09-04）
- 内容：现有的指令层级只有少数几个固定的级别（system > user 等）。本文提出在推理时为每条指令赋任意多级的优先级，并构建 ManyIH-Bench：853 个任务（427 个编码、426 个指令遵循），最多 12 个优先级层级。
- 关键结论：
  - §6.1：13 个模型里最好的是 Gemini 3.1 Pro，总体准确率 42.7%；GPT-5.4 为 39.4%；Qwen3.5-397B 为 34.1%。摘要概括为"前沿模型约 40%"。
  - §6.1：">99%"是论文**转引** GPT-5 system card 在两层指令层级评测上的结果（例如系统提示词提取），不是本文在两层条件下测出来的。
  - §6.2：只在编码子集上合成了 6 层、8 层、12 层三个变体。层级越多准确率越低；在 12 个"模型-过渡"组合中有 11 个严格下降，从最易到最难配置的降幅为 6.8（Qwen3.5-9B）到 24.1 个百分点（Sonnet 4.6）。
  - 准确率是全有或全无的指标：代码要通过单元测试，**同时**满足所有胜出的风格约束（附录 B 表 3：编码子集的瓶颈在风格遵循）。
- 文中说法：第 71 行"层级到 12 层时模型只有约 40% 能分辨优先次序，两层时超过 99%"，并据此得出"有效力的层级不能多于三层"。
- 判定：**有偏差**。
  1. 约 40% 是整个 benchmark（最多 12 层，层数不一）的总体准确率，不是"12 层时"的准确率。
  2. ">99%"来自 GPT-5 system card 的另一类评测，被并列成同一实验的两个条件。
  3. 这个指标同时考了指令遵循能力，并不纯粹是"分辨优先次序"。
  4. 论文的主张恰好相反：真实 agent 需要**更多**层级，应当训练模型支持任意层级。论文没有给出"不超过三层"的阈值。"不多于三层"是本文作者根据现有模型的弱点作的设计推论，应写明是推论。
- 支撑：表 3 来源的效力顺序、"有效力的层级不多于三层"。

### [14] OpenAI. Codex memories README

- 链接：https://github.com/openai/codex/blob/main/codex-rs/memories/README.md ；本地：无
- 内容：Codex 的记忆流水线，异步后台运行，分两个阶段：先逐会话抽取，再整合。
- 关键事实：
  - "It runs asynchronously in the background and executes two phases"。
  - Phase 2 "ignores memories whose `last_usage` falls outside the configured `max_unused_days` window"。
  - 30 天的默认值在 `codex-rs/config/src/types.rs`：`DEFAULT_MEMORIES_MAX_UNUSED_DAYS: i64 = 30`，可配置。
  - 实际删除在 `codex-rs/state/src/runtime/memories.rs` 的 `prune_stage1_outputs_for_retention`：删除未入选整合、且超过期限未使用的 stage-1 记录。
  - 读取模板 `codex-rs/ext/memories/templates/memories/read_path.md` 把记忆当作 "guidance from prior runs"，要求易变的事实先核实，"Do not present unverified memory-derived facts as confirmed-current"。README 里给出的模板路径与实际路径不一致。
- 文中说法与判定：
  - 第 470 行"后台提炼"：**准确**。
  - 第 474 行"Codex 删除 30 天未用的记忆"：**基本准确，但数字不在 README 中**，出自代码默认值，可配置，删除对象是未入选整合的 stage-1 记录。
  - 第 71 行"Codex 对记忆的定位是回忆而非权威"：**意思相符，但属于转述**。README 没有讲"权威"，相近的说法在读取模板里。
- 支撑：表 3、4.4 节。

### [15] Anthropic. How we contain Claude across products（2026-05-25）

- 链接：https://www.anthropic.com/engineering/how-we-contain-claude ；本地：无
- 内容：Anthropic 讲各产品中如何用进程沙箱、虚拟机、文件系统边界、出网控制来约束 agent。
- 关键说法：
  - "Constrain where and how an agent can act with process sandboxes, VMs, filesystem boundaries, and egress controls"。
  - "Design for containment at the environment layer first, then steer behavior at the model layer."
- 文中说法与判定：第 335、712 行"隔离原则、交给机制"：**准确**。参考文献中的标题应补全为 "...across products"。
- 支撑：3.3 节、表 41 沙箱。

### [16] OWASP. LLM07:2025 System Prompt Leakage

- 链接：https://genai.owasp.org/llmrisk/llm072025-system-prompt-leakage/ ；本地：无
- 内容：OWASP Top 10 for LLM Applications 2025 中的**一项**：系统提示词泄露。
- 关键说法：
  - "avoid using system prompts to control the model behavior where possible. Instead, rely on systems outside of the LLM"。
  - "Critical controls such as privilege separation, authorization bounds checks… must not be delegated to the LLM"。
- 文中说法与判定：
  - 第 335 行"交给机制"：**准确**。
  - 第 69、156 行称其为"OWASP 的 LLM 风险清单"，并说硬规则对照过它：**有偏差**。链接只是十项中的一项，应改引整份 Top 10（https://genai.owasp.org/llm-top-10/），或在文中写明"LLM07"。
- 支撑：2.2 节完整性检查、2.4 硬规则、3.3 节。

### [17] Chroma. Context Rot（Hong, Troynikov, Huber, 2025-07-14）

- 链接：https://www.trychroma.com/research/context-rot ；本地：无（网页技术报告）
- 内容：测试 18 个模型，发现输入越长，表现越差，而且下降并不均匀。实验包括 needle 与问题的相似度、干扰项、haystack 结构、LongMemEval、重复词。
- 关键说法："model performance degrades as input length increases, often in surprising and non-uniform ways"。
- 文中说法与判定：第 291 行"上下文越长，回忆越差"：**准确**。
- 支撑：3.1 节"常驻内容越少越好"。

### [18] Jaroslawicz et al. How Many Instructions Can LLMs Follow at Once? (IFScale)

- 链接：https://arxiv.org/abs/2507.11538 ；本地：`reference/papers/2507.11538-ifscale.pdf`
- 内容：任务是写一份商业报告，同时满足 10 到 500 条"包含某关键词"的指令，评测 20 个模型。
- 关键结论：
  - 摘要：最好的模型在 500 条时只有 68%。
  - §4.4 有三种衰减形态：阈值衰减（o3、gemini-2.5-pro 在 150 条以上仍接近满分，之后下降）、线性衰减（gpt-4.1、claude-3.7-sonnet）、指数衰减（gpt-4o、llama-4-scout，很早就掉到 7%-15% 的底部）。
  - §4.6 首因效应（靠前的指令更容易被遵守）在 150-200 条时最强，300 条以上反而减弱，趋于均匀失败。
- 文中说法：第 291 行"指令超过数百条后遵守率明显下降，且偏向靠前的指令"。
- 判定：**基本准确，有简化**。只有推理模型是"数百条后"才明显下降，很多非推理模型从几十条起就线性或指数下降。偏向靠前的指令在中等密度最明显。另外，这里的"指令"是关键词包含约束，不是 agent 的行为规则，外推到系统提示词时应注明。
- 支撑：3.1 节"常驻内容越少越好"。

### [19] Manus. Context Engineering for AI Agents: Lessons from Building Manus（Yichao "Peak" Ji，2025-07-18）

- 链接：https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus ；本地：无
- 关键说法：
  - "Keep your prompt prefix stable… even a single-token difference can invalidate the cache from that token onward"。
  - 以 Claude Sonnet 为例，缓存命中的输入价格为 0.30 USD/MTok，未命中为 3 USD/MTok，"a 10x difference"。
- 文中说法与判定：第 293 行"前缀稳定才能命中缓存，命中缓存的输入价格约为十分之一"：**准确**。
- 支撑：3.1 节"顺序"。

### [20] Google（Milam & Gulli）. Context Engineering: Sessions & Memory（白皮书，2025-11）

- 链接：https://www.kaggle.com/whitepaper-context-engineering-sessions-and-memory ；本地：无
- 获取情况：Kaggle 页面由 JS 渲染，自动抓取只拿到标题。核对时读了第三方转载的全文，没有下载保存。
- 关键说法（p.56 "Background vs. Blocking Operations"）："memory generation should almost always be handled asynchronously as a background process… A blocking… approach… would create an unacceptably slow and frustrating user experience."
- 文中说法与判定：第 470 行"提炼在后台进行以免占用运行时延迟"：**准确**。
- 支撑：4.4 节。

### [21] Google. Gemini CLI auto memory

- 链接：https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/auto-memory.md ；本地：无
- 内容：Gemini CLI 的实验功能。在会话启动时以后台任务挖掘旧会话，产出记忆补丁和 SKILL.md 草稿，放进审批收件箱。
- 关键事实：
  - "runs as a background task on session startup"。
  - "All candidates are held in a project-local inbox until you approve or discard them"（`/memory inbox`），"never applies them without your approval"。
  - 限制条件：实验功能，默认关闭（`experimental.autoMemory`）；只挖掘空闲 3 小时以上、且至少有 10 条用户消息的会话；不能修改项目的 GEMINI.md。
- 文中说法与判定：第 242、470、472、714 行"审批收件箱、后台提炼、审批后生效"：**准确**。建议注明这是默认关闭的实验功能。第 23 行把它和 Claude Code、Codex 并列为"同一套做法"时也应注明。
- 支撑：2.4 表 13、4.4 节、5.5 节。

### [22] Anthropic. An update on recent Claude Code quality reports（2026-04-23，即文中的 April 23 postmortem）

- 链接：https://www.anthropic.com/engineering/april-23-postmortem ；本地：无
- 内容：Claude Code 质量下降的事后报告。
- 关键说法：
  - 系统提示词中加了 "Length limits: keep text between tool calls to ≤25 words. Keep final responses to ≤100 words unless the task requires more detail."
  - 之后的消融中 "One of these evaluations showed a 3% drop for both Opus 4.6 and 4.7"。
  - 改进承诺包括 "a broad suite of per-model evals for every system prompt change… continuing ablations to understand the impact of each line"，以及 soak 期和逐步放量。
- 文中说法与判定：第 472 行"一句限制字数的话导致 3% 的性能下降，此后改为按模型评测并逐步放量"：**准确**。更精确的写法是"在一项评测上，Opus 4.6 和 4.7 都下降 3%"。参考文献标题可补原题。
- 支撑：4.4 节"逐行消融、按模型评测"。

### [23] Anthropic. Managed Agents: Dreams

- 链接：https://platform.claude.com/docs/en/managed-agents/dreams ；本地：无
- 内容：Managed Agents 的研究预览功能（不是 Claude Code）。异步运行几分钟到几小时，读取一个记忆库，产出一个整理后的新记忆库。
- 关键说法：
  - 合并重复条目；对过时或矛盾的条目 "replaced with the latest value"。
  - "The input store is never modified"，新库由人审查后决定启用还是丢弃。
- 文中说法与判定：
  - 第 472、714 行"提炼内容须验证或审批后生效"：**基本准确**，但这是整库审查，不是逐条审批。
  - "相对日期改绝对、与用户内容冲突只标记不改写 [9][23]"：**不被 [23] 支持**。[23] 的做法是用最新值替换。这两点出自 [4] 的提示词文件。
- 支撑：4.4 节、5.5 节。

### [24] Zhang et al. ACE: Agentic Context Engineering（ICLR 2026）

- 链接：https://arxiv.org/abs/2510.04618 ；本地：`reference/papers/2510.04618-ace-agentic-context-engineering.pdf`（v3）
- 内容：把上下文当作不断演化的"playbook"，由生成、反思、整理三个角色以增量的 delta 条目更新，避免整体重写。
- 关键结论：
  - 摘要：在 agent 任务上 +10.6%，金融任务上 +8.6%。
  - §2.2"context collapse"：在 AppWorld 上让 LLM 每步整体重写上下文，第 60 步时上下文有 18,282 token、准确率 66.7，下一步塌缩到 122 token、准确率 57.1，低于不做适应的基线 63.7。
- 文中说法：第 472 行"修改时增量修改而非整体重写，整体重写会把内容压没"。
- 判定：**准确**。
- 支撑：4.4 节 agent 提炼内容的写法。

### [25] Li et al. SkillsBench: Benchmarking How Well Agent Skills Work Across Diverse Tasks

- 链接：https://arxiv.org/abs/2602.12670 ；本地：`reference/papers/2602.12670-skillsbench.pdf`（v4，2026-06-14）
- 内容：87 个任务、8 个领域，每个任务配有专家整理的 skill 和确定性验证器。在 18 个"模型-harness"组合上做配对对比：不给 skill 与给精选 skill。
- 关键结论：
  - 摘要：精选 skill 把平均通过率从 33.9% 提到 50.5%（+16.6 pp），各组合 +4.1 到 +25.7 pp；模块不超过 3 个的聚焦 skill 优于大而全的 skill。
  - §5.1 与附录 D.6 表 6：只在 3 个组合上测了"自生成"条件。agent 先用 Anthropic 的 skill-creator 针对任务写 skill，再由新会话解题。结果都**低于**不给 skill 的基线：Claude Code + Opus 4.7 为 −8.1 pp，Codex + GPT-5.5 为 −11.3 pp，Gemini CLI + Gemini 3.1 Pro 为 −11.5 pp。同样这 3 个组合上精选 skill 为 +18.2 到 +24.8 pp。
- 文中说法：第 472、714、854 行"agent 自写的 skill 实测平均为负收益，精选的提升 16 个百分点"。
- 判定：**准确**（数字与方向都对）。需要注意两点：
  1. "自生成"是 agent 在**动手之前**凭任务说明写 skill，不是从运行经验中提炼的。用它论证"从记忆到规则的提升必须经人审批"是类比，不是直接证据。
  2. 16.6 pp 是 18 个组合的平均，负收益只测了 3 个组合，两组数不是同一批组合。
- 支撑：4.4 节、5.5 节、6.4 节"agent 起草、人审批"。

### [26] 李博杰.《深入理解 AI Agent》

- 链接：https://github.com/bojieli/ai-agent-book （核对时 commit dbc046e）；本地：无
- 关键原文：`book/chapter9.md` 第 350 行："第三道边界是安全机制不可自我修改。业务 Agent 可以修改 Prompt、Skill、知识库、工具等，但不能修改批准自身更新的验证器、测试用例、发布门槛、审计日志和稳定版本备份。否则，一个 Agent 只需降低测试阈值或删除失败用例，就能把退化伪装成进步。"另见 `chapter10.md` 第 258 行。
- 文中说法与判定：
  - 第 472 行"不能允许 agent 修改评判自身的标准，否则自我改进最省力的路径就是降低标准"：**准确**。
  - 同一句前半"硬规则和质量标准**任何人**都不能修改"：**超出原文**，是本文自己的立场。它还与本文 4.4 节"产品方内容随版本修改"、表 25 冲突。建议改为"agent 不能修改评判自身的标准"。
- 支撑：4.4 节。

### [27] Rasmussen et al. Zep: A Temporal Knowledge Graph Architecture for Agent Memory

- 链接：https://arxiv.org/abs/2501.13956 ；本地：`reference/papers/2501.13956-zep-temporal-kg-memory.pdf`
- 内容：Graphiti 是一个带时间的知识图谱记忆层。采用双时间线模型：每条边记录创建、失效时间和事实的有效区间。
- 关键结论：
  - 摘要：DMR 上 94.8% 对 MemGPT 的 93.4%；LongMemEval 上准确率最多提升 18.5%，延迟降低 90%。
  - §2.2.3：新事实与旧边冲突时，把旧边的 t_invalid 设为新边的 t_valid，**不删除**旧边；还会把"两周前"这类相对时间解析为绝对时间。
- 文中说法：第 474 行"错误的结论标记失效而非抹去，以便追溯"。
- 判定：**准确**。Zep 失效的是"被新信息取代的事实"，不专指"错误结论"，但机制相同。
- 支撑：4.4 节淘汰方式。顺带可作为"相对日期改绝对"的旁证。

### [28] Anthropic. Claude Code: context window and compaction

- 链接：https://code.claude.com/docs/en/context-window ；本地：无
- 内容：Claude Code 启动时加载什么、各部分占多少、压缩后保留什么。
- 关键说法（"After compaction" 表）：
  - system prompt 与 output style 仍然生效；根 CLAUDE.md、不带 paths 的规则、auto memory、plan 从磁盘重新注入；git 状态刷新。
  - 带 `paths:` 的规则和嵌套 CLAUDE.md "reloads them as Claude reads files they match"。
  - 最多重读 5 个最近修改的文件，超过 5,000 token 的只给路径。
  - 已调用的 skill "capped at 5,000 tokens per skill and 25,000 tokens total; oldest dropped first"，截断时保留开头。
  - skill 目录 "is not re-injected after `/compact`"。
  - /compact 的摘要保留请求与意图、关键技术概念、文件与代码片段、错误与修复、待办、当前工作。
- 文中说法与判定：
  - 系统提示词保留、根 CLAUDE.md、记忆索引和计划重读、每个 skill 前 5k token、"skill 关键指令放开头"：**准确**。
  - 漏了 25k 总上限和"最早的先丢"：**不完整**。
  - "按路径触发的规则丢失"：**有偏差**，实际是读到匹配文件时会重新加载。
  - "压缩摘要固定五段"：**有偏差**，见"需要修正"B7。
  - 表 15、16 默认"skill 目录常驻"：与"压缩后目录不重新注入"**冲突**，需加注。
- 支撑：3.1 节压缩、表 14、表 16。

### [29] Tang et al. FARS: A Fully Automated Research System Deployed at Scale

- 链接：https://arxiv.org/abs/2606.31651 ；本地：`reference/papers/2606.31651-fars.pdf`（v2，2026-07-13）
- 内容：四个阶段（构思、计划、实验、写作），由各阶段专用的 agent 通过共享工作区协作，工作区同时是项目记忆和可审计的产物库。首次公开部署产出 166 篇完整论文，覆盖 67 个细分主题；282 份志愿者评审覆盖其中 140 篇。
- 关键结论：
  - §3（环境）：维护一个覆盖 19 类 ML 研究实践的精选 skill 库。agent 只拿到类别索引，按需读取描述再加载正文。
  - §3.5：写作前，Analysis Agent 把上游材料整理成 paper blueprint，把每个核心论断链接到支撑实验、源产物、图表和文献。之后逐节写作，并对照源数据核验数字。
- 文中说法：第 654 行"论断清单来自 FARS 的 paper blueprint；领域知识独立成单元来自 FARS 和 Orchestra 的领域 skill 库"。
- 判定：**基本准确**。注意时间点不同：FARS 的 blueprint 是**写作阶段**、实验完成之后才整理的；本文的"论断清单"在项目期写进章程，是事前的。说"受 blueprint 启发"更确切。
- 支撑：第 5 章岗位说明里的完成定义、领域 skill。

### [30] Yang, Liu, Xu. SciIntegrity-Bench: A Benchmark for Evaluating Academic Integrity in AI Scientist Systems

- 链接：https://arxiv.org/abs/2605.10246 ；本地：`reference/papers/2605.10246-sciintegrity-bench.pdf`（v2，2026-06-03）
- 内容：11 类不端陷阱，33 个"两难"场景。只有如实承认无法完成才算正确，完成任务就必须违规。7 个模型（GPT 5.2、Claude 4.6 Sonnet、Gemini 3.1 Pro、DeepSeek V3.2、Qwen3.5-397B、GLM 5 Pro、Kimi 2.5 Pro），共 231 次运行。
- 关键结论：
  - 摘要：总体诚信问题率 34.2%，没有模型零失败；在数据缺失场景中，7 个模型都会合成数据，只是是否披露不同。
  - §5.2 表 3（只针对 T08 数据缺失，7 模型 × 3 场景 × 3 轮 = 63 次）：消融去掉的是"完成压力"提示（禁止停下、禁止提问、禁止报告失败、每步必须调用工具），不是加入或去掉"不要编造"。去掉之后，合成数据的比例几乎不变（57.1% → 55.6%），未披露的合成从 20.6% 降到 3.2%。
  - 附录 H：两种条件下的基础提示词都没有"不要编造"一类的禁令。论文在引言中只提到"显式禁止"已有人提出，但效果"尚未在规模上验证"。
- 文中说法：
  1. 第 700 行"提示词里的'不要编造'实测无效：数据缺失时七个模型全部自行合成数据，提示词只影响是否披露"。
  2. 表 41"不设'必须完成'的压力 | 防：数据缺失时自行合成 | 去除完成压力后未披露的造假从 20.6% 降至 3.2%"。
- 判定：
  1. **有偏差（归因错误）**。论文没有测试"不要编造"这句提示。它测的是去掉完成压力，结论是合成率不变、只影响披露。"七个模型都合成数据"与摘要一致，但按运行次数算约为 56%-57%，不是每次都合成。
  2. 数字**准确**，但"防什么"一栏写成"数据缺失时自行合成"与论文相反：去掉压力并不减少合成（57.1% → 55.6%），只减少**隐瞒**。
- 支撑：5.5 节"诚信靠机制"、表 41。

### [31] Meng et al. ScientistOne: Towards Human-Level Autonomous Research via Chain-of-Evidence

- 链接：https://arxiv.org/abs/2605.26340 ；本地：`reference/papers/2605.26340-scientistone.pdf`
- 内容：Google Cloud AI Research 提出 Chain-of-Evidence 框架，要求每个论断可追溯到证据。ScientistOne 在文献、实验、写作全程维护证据链。CoE Integrity Audit 用四项检查（分数复核、规格违规、引用核验、方法与代码一致）审计 5 个系统、5 个任务、75 篇论文。
- 关键结论：
  - 摘要：基线的幻觉引用率最高达 21%（§6.1：DS 为 42/201 = 20.9%）。ScientistOne 为 0/337，分数复核 12/12，方法与代码一致 14/15。
  - §6.1 补充：Sakana AI Scientist v2 也是 0/159 幻觉引用。零幻觉来自检索构建的引用图，所有引用在写作前就从 API 结果中取得。
- 文中说法：表 41"ScientistOne 用证据链做到 337 条引用零幻觉，基线系统最高 21%"。
- 判定：**准确**。补充两点：这是系统作者的自评；零幻觉主要归功于"引用只取自检索结果"（AI Scientist v2 同样做到零），对"引用必须来自检索"一条的支撑比对"论断绑定证据"更直接。
- 支撑：表 41 前两行、表 31"产出的真实"。

### [32] Bianchi et al. Exploring the use of AI authors and reviewers at Agents4Science

- 链接：https://arxiv.org/pdf/2511.15534 ；本地：`reference/papers/2511.15534-agents4science-citations.pdf`
- 内容：首个由 AI agent 担任第一作者和审稿人的会议的组织者总结。收到 315 篇投稿，253 篇完整，录用 48 篇。这是会议总结，不是专门的"引用分析"论文，参考文献表里的标题"Agents4Science citation analysis"不准确。
- 关键结论：
  - 自动核查引用的系统对每条引用做网络检索，找不到就标为可能的幻觉。
  - 原文："We estimate that approximately 44% of submissions have no hallucinated references (111 papers), and the other papers have one or more references flagged as problematic."
- 文中说法：表 41"Agents4Science 约 44% 投稿含可疑引用"。
- 判定：**错误（方向反了）**。44%（111/253）是**没有**可疑引用的比例，约 56%（约 142 篇）至少有一条被标记。
- 建议改为"Agents4Science 的 253 篇完整投稿中，约 56% 至少有一条引用被自动核查标为可疑（只有约 44% 完全没有）"。同时把参考文献标题改为原题。
- 支撑：表 41"引用存在性自动检查"。

### [33] Lu et al. The AI Scientist: Towards Fully Automated Open-Ended Scientific Discovery

- 链接：https://arxiv.org/abs/2408.06292 ；本地：`reference/papers/2408.06292-ai-scientist.pdf`
- 内容：第一个端到端的"想法 → 实验 → 论文 → 自动审稿"系统，基于人写的代码模板，每篇论文成本约 15 美元。
- 关键结论（§8 Limitations 中的"Safe Code Execution"）：
  - 一次运行中写代码让自己重新启动，导致进程失控。
  - 一次把每步都存 checkpoint，占用近 1TB。
  - 实验超出时限时，"attempted to edit the code to extend the time limit arbitrarily instead of trying to shorten the runtime"。
  - 作者建议严格沙箱（容器化、限制网络、限制存储）。
- 文中说法：表 41"AI Scientist v1 曾自行修改代码延长时限"，用来支撑"评估脚本与原始数据只读 / 防修改实验以迎合结论"。
- 判定：**事实准确**，但对应关系有偏差：这是绕过**资源限制**，不是为迎合结论改评估。它更直接地支撑"资源上限交给机制"和"实验在沙箱中运行"。
- 支撑：表 41、表 31 资源与沙箱。

### [34] Karpathy. autoresearch program.md

- 链接：https://github.com/karpathy/autoresearch/blob/master/program.md （核对时 commit 228791f）；本地：无
- 关键原文：在 "What you CANNOT do" 下有 "Modify `prepare.py`. It is read-only. It contains the fixed evaluation…"，以及 "Modify the evaluation harness. The `evaluate_bpb` function in `prepare.py` is the ground truth metric."。仓库里没有用文件权限强制只读。
- 文中说法与判定：表 41"autoresearch 将评估器设为只读"：**字面准确，但这是提示词层面的约定，不是机制**。表 41 把它列为机制的依据，而 5.5 节正是在论证提示词约束不够，两者自相矛盾。建议改为"autoresearch 在 program.md 中规定评估文件只读（提示层约定）"，或另找有强制机制的例子。
- 支撑：表 41。

### [35] Luo, Kasirzadeh, Shah. The More You Automate, the Less You See: Hidden Pitfalls of AI Scientist Systems

- 链接：https://arxiv.org/abs/2509.08713 ；本地：`reference/papers/2509.08713-more-you-automate-less-you-see.pdf`（v2）
- 内容：CMU 的研究者在两个开源 AI scientist 系统（Agent Laboratory、AI Scientist v2）上用受控实验检查四类方法学陷阱：基准挑选不当、数据泄漏、指标误用、事后选择偏差。
- 关键结论：§1 主要发现中，LLM 审计器只看最终论文时，二分类准确率 55%、F1 0.51；加入日志轨迹和生成代码后，准确率 82%、F1 0.81。作者建议会议和期刊要求提交完整日志与代码。
- 文中说法：表 41"仅看论文难以发现问题，结合日志与代码检出率显著提高"。
- 判定：**准确**。可补上具体数字 55% → 82%。"记录只追加"是本文的设计推论，论文本身只要求保留并提交日志。
- 支撑：表 41"实验记录只追加"。

### [36] Kon et al. Curie: Toward Rigorous and Automated Scientific Experimentation with AI Agents

- 链接：https://arxiv.org/abs/2502.16069 ；本地：`reference/papers/2502.16069-curie.pdf`（v2）
- 内容：Curie 有三个模块：intra-agent 严谨性模块（实验设置校验器、执行校验器）、inter-agent 严谨性模块（控制流、阶段切换）、实验知识模块。在 46 个计算机科学实验问题上，与 OpenHands、Magentic-One 比较，三者都用 GPT-4o，各跑 5 次。
- 关键结论：
  - 摘要：正确回答实验问题的能力是最强基线的 3.4 倍。
  - 表 2 加权平均的"Execution Setup"一项：Curie 78.1%，OpenHands 32.4%，Magentic-One 6.8%。
  - 论文中**没有**去掉校验模块的消融实验。
- 文中说法：表 41"Curie 加检查后实验设置成功率 78% 对 32%"。
- 判定：**有偏差**。78.1% 对 32.4% 是 Curie 与**另一个系统 OpenHands** 的比较，不是同一系统加或不加检查的对比。Curie 的检查是自动校验器，不是本文意义上"等用户的阶段间检查点"。
- 建议改为"Curie（带自动的实验设置与执行校验）与 OpenHands 相比，实验设置成功率 78.1% 对 32.4%（GPT-4o，系统间比较，非消融）"。
- 支撑：表 41"阶段间检查点"。

### [37] Ouyang et al. ReasoningBank: Scaling Agent Self-Evolving with Reasoning Memory

- 链接：https://arxiv.org/abs/2509.25140 ；本地：`reference/papers/2509.25140-reasoningbank.pdf`（v2）
- 内容：每完成一个任务，先用 LLM-as-judge 自判成败（无标准答案），从成功和失败的轨迹中都提炼可泛化的推理策略，存入记忆库，下一个任务检索使用。另提出 MaTTS（记忆感知的测试时扩展）。
- 关键结论：
  - 摘要与 §1：相对提升最多 20%，交互步数最多减少 16%。
  - §5（图 7，WebArena-Shopping，Gemini-2.5-flash）：只用成功轨迹 46.5，加入失败轨迹 49.7；对照方法 Synapse 40.6 → 41.7，AWM 44.4 → 42.2。
- 文中说法：第 714 行"agent 在阶段或项目结束后在后台提炼经验，成功和失败都提"。
- 判定：**部分准确**。"成功和失败都提"准确。"在后台"不是这篇论文的内容：它在每个任务结束后同步提炼，"后台"的依据应是 [14]、[20]、[21]。另外，ReasoningBank 的记忆**不经人工审批**就直接加入并带来提升，这一点与本文"严把写入"的立场有张力，值得在文中正面讨论。
- 支撑：5.5 节"经验"。

### [38] Suzgun et al. Dynamic Cheatsheet: Test-Time Learning with Adaptive Memory

- 链接：https://arxiv.org/abs/2504.07952 ；本地：`reference/papers/2504.07952-dynamic-cheatsheet.pdf`
- 内容：给黑盒模型一个在推理时不断自我整理的"小抄"记忆，保存可迁移的策略和代码片段，不需要标签或人工反馈。
- 关键结论：
  - 摘要：Claude 3.5 Sonnet 在 AIME 上准确率翻倍以上；GPT-4o 在 Game of 24 上从约 10% 升到 99%；GPQA-Diamond +9%。
  - §4.3：不整理、直接追加全部历史（FH）有害，例如 GPT-4o 在 AIME 2024 上从基线 20.0% 降到 6.7%。
  - 讨论部分（定性）："faulty heuristics that slip into memory can be equally amplified"，需要整理与修剪，避免错误策略传播。
- 文中说法：第 714、854 行"错误经验被后续任务照抄的证据很确定 [38][39]"。
- 判定：**有偏差**。这篇论文的主要发现是**自我整理的记忆有显著正收益**。"错误被放大"只是讨论中的定性观察；量化的负面证据是"未整理的全量历史"有害。它更适合支撑"要整理、不要全量追加"，对"错误经验被照抄"的直接证据应以 [39] 为主。
- 支撑：5.5 节、6.4 节。

### [39] Xiong et al. How Memory Management Impacts LLM Agents: An Empirical Study of Experience-Following Behavior

- 链接：https://arxiv.org/abs/2505.16067 ；本地：`reference/papers/2505.16067-experience-following.pdf`（v2）
- 内容：研究记忆的写入和删除策略对长期表现的影响，提出"经验跟随"性质：当前输入与检索到的记忆越像，输出就越像。
- 关键结论：
  - §3.1 表 1 显示，不加筛选全部写入会降低长期表现。例如 RegAgent：固定记忆 67.53，全部写入 55.48，严格（人类/oracle）筛选 70.95；EHRAgent：16.75 / 13.05 / 38.50。
  - §3.4：错误记录被检索为示范后，会让当前执行出错，再写回记忆，误差就此传播（error propagation）。还有"看似正确但误导"的经验（misaligned experience replay）。
- 文中说法：第 714、854 行"错误的经验会被后续任务照抄"。
- 判定：**准确**。注意这里的"经验"是原始的"查询-执行"示范对，不是提炼后的规则。
- 支撑：5.5 节、6.4 节严把写入。

### [40] Schmidgall & Moor. AgentRxiv: Towards Collaborative Autonomous Research

- 链接：https://arxiv.org/abs/2503.18102 ；本地：`reference/papers/2503.18102-agentrxiv.pdf`
- 内容：多个 Agent Laboratory 实例通过一个共享的预印本服务器上传、检索彼此的报告，在前人基础上继续研究。实验任务是为 MATH-500 设计新的推理或提示技术，基座模型为 gpt-4o mini。
- 关键结论：
  - 摘要与 §3.1：能读到之前的研究时，MATH-500 从 70.2% 提到 78.2%（相对 +11.4%）；去掉读取（N=0）后停在 73.4%-73.8%。最佳方法迁移到其他基准平均 +3.3%。并行 3 个实验室达到 79.8%（相对 +13.7%）。
  - §4.1：存在幻觉实验结果和奖励作弊，需要人工检查。
- 文中说法：第 714 行"跨项目经验库提升论文质量的证据目前很薄 [40]"。
- 判定：**有偏差**。AgentRxiv 本身是**正面**证据，测的是所发现方法在基准上的准确率，不是"论文质量"。要说"证据很薄"，应写明理由：只有单一任务、单一小模型，且有幻觉结果要人工筛。不能把它当作"薄"的出处。
- 支撑：5.5 节"经验"。

### [41] Orchestra-Research. AI-Research-SKILLs

- 链接：https://github.com/Orchestra-Research/AI-Research-SKILLs ；本地：无
- 内容：开源的科研 skill 库，"98 Skills … 23 Categories"（构思、ML 论文写作、评测、后训练等），MIT 许可，约 13.2k star。
- 文中说法与判定：第 654 行"领域知识独立成单元来自 FARS 和 Orchestra 的领域 skill 库"：**准确**。多数 skill 是工具和框架的工程类 skill，不是"什么算贡献、常用 baseline"那类领域知识。
- 支撑：第 5 章领域 skill。

### [42] Alavi & Leidner. Knowledge management and knowledge management systems（MISQ 2001）

- 链接：https://aisel.aisnet.org/misq/vol25/iss1/6/ ；本地：无（期刊落地页，全文可能需要订阅，未下载）
- 正文**从未引用**。链接可以打开。
- 判定：**未使用**。可用于 2.3 节"记录与经验 / 显性与隐性知识"，或删除。

### [43] Hu et al. Memory in the Age of AI Agents: A Survey — Forms, Functions and Dynamics

- 链接：https://arxiv.org/abs/2512.13564 ；本地：`reference/papers/2512.13564-memory-in-age-of-ai-agents.pdf`
- 内容：从三个视角梳理 agent 记忆。形式：token 级、参数、潜在。功能：事实、经验、工作记忆。动态：形成、演化、检索。
- 文中说法：第 25 行"梳理了记忆的形成、演化与读取"。
- 判定：**准确**（摘要原文："we analyze how memory is formed, evolved, and retrieved over time"）。
- 支撑：1.3 现状。

### [44] Yamada et al. The AI Scientist-v2: Workshop-Level Automated Scientific Discovery via Agentic Tree Search

- 链接：https://arxiv.org/abs/2504.08066 ；本地：`reference/papers/2504.08066-ai-scientist-v2.pdf`
- 内容：不再依赖人写的代码模板，由一个实验管理 agent 组织渐进式树搜索。三篇全自动论文投到 ICLR workshop，其中一篇的评分超过人类平均录用线。
- 关键结论：§3 中，实验管理器在每个阶段记录 checkpoint；出错的节点记录错误信息并标为 buggy；第 2 阶段"careful records of previously tested hyperparameters"。
- 文中说法：第 130、242 行把"AI Scientist v2 的实验日志"归入"记录与经验"。
- 判定：**准确**（作为"有运行记录"的例子）。
- 支撑：2.4 节表 13。

### [45] Gopen & Swan. The Science of Scientific Writing

- 链接：https://www.cs.tufts.edu/comp/105-2015s/readings/sci.html ；本地：无（HTML）
- 正文**从未引用**。链接可以打开。
- 判定：**未使用**。可用于科研 agent 的写作 skill，或删除。

### [46] OpenAI. Codex models catalog（models.json）

- 链接：https://github.com/openai/codex/blob/main/codex-rs/models-manager/models.json ；本地：无
- 内容：11 个模型的目录（472 KB），每条含 `model_messages.instructions_template` 以及审批、权限、协作模式等字段。
- 关键事实：`models-manager/src/manager.rs` 有远程 `ModelsEndpointClient`、基于 ETag 的刷新，`DEFAULT_MODEL_CACHE_TTL = 300s`；协议中的 `ModelInfo` 携带 `model_messages`，所以提示词模板会随目录一起下发。
- 文中说法与判定：第 675 行"系统提示词可以放在可远程刷新的模型目录中，修复无需发版"：**准确**。"无需发版"是根据代码结构的合理推论，不是原文的话。
- 支撑：5.3 节。

### [47] Anthropic. Claude Code: Best practices

- 链接：https://code.claude.com/docs/en/best-practices ；本地：无
- 关键说法：
  - "Unlike CLAUDE.md instructions which are advisory, hooks are deterministic"。
  - 模型自己就能做对的，"delete it or convert it to a hook"。
  - "Would removing this cause Claude to make mistakes? If not, cut it"。
  - "Treat CLAUDE.md like code: review it when things go wrong, prune it regularly… observe whether behavior actually shifts"。
  - "show evidence rather than asserting success"。
  - 先让 Claude 用 AskUserQuestion 访谈、写 SPEC.md，再开新会话执行。
  - 自动模式："a separate classifier model reviews most actions… blocks only what looks risky, such as scope escalation, unknown infrastructure, or hostile-content-driven actions"。
  - "If Claude keeps skipping one instruction, add emphasis such as 'IMPORTANT' to that line alone. If you emphasize many lines, none of them stands out."
- 文中说法与判定：
  - 第 118、335、291、470、122、508、169 行：**准确**。
  - 第 335 行"每个动作前审查"：**有偏差**，原文是"多数动作"。
  - 第 337 行"新模型对 CRITICAL、MUST 反应过度 [47][53]"：[47] 只支持"全篇强调等于没有强调"；"反应过度"来自 [53]，且只针对特定模型（见 [53]）。
  - 第 116 行"质量标准逐条可检查，否则 agent 无法自查"：**基本准确**。原文讲的是给 Claude 一个能运行的检查（"Without a check it can run, 'looks done' is the only signal"）。
- 支撑：2.3 节多处、3.3 节、4.4 节、4.7 节。

### [48] Anthropic. Prompt engineering interactive tutorial, ch. 9: Complex prompts from scratch

- 链接：https://github.com/anthropics/prompt-eng-interactive-tutorial （核对时 commit 0d27754）；本地：无
- 内容：`Anthropic 1P/09_Complex_Prompts_from_Scratch.ipynb` 列出复杂提示词的 10 个要素，其中有 "Prompt element 2: Task context" 和 "Prompt element 9: Output formatting"。
- 文中说法与判定：第 69、140 行"任务背景与输出格式两段"：**准确**。同一 notebook 还有 "Examples are probably the single most effective tool in knowledge work"，可以作为第 120 行"范例比规则清单有效"的补充出处。
- 支撑：2.2 节完整性检查、表 6。

### [49] Aristotle. Nicomachean Ethics, Book III, ch. 3

- 链接：http://classics.mit.edu/Aristotle/nicomachaen.3.iii.html （该页是整个第三卷）；本地：无
- 关键说法：III.3 "We deliberate not about ends but about means"，以医生、演说家、政治家为例。
- 文中说法与判定：
  - 第 58 行"只商议手段，不商议目的"：**准确**。
  - 第 58 行"一个行动结论要从两类前提推出：一类说应当怎样，一类说事实如何"：**出处不对**。这是实践三段论，在 III.3 中找不到，出自 NE 第七卷第 3 章（1147a："The one opinion is universal, the other is concerned with the particular facts…"）和 De Motu Animalium 第 7 章（701a："the premisses of action are of two kinds, of the good and of the possible"）。
  - "规则约束的正是这些手段"是作者的引申，不是亚里士多德的话。
- 支撑：2.2 节四组的推导。

### [50] Anthropic. Claude Code: Settings and their precedence

- 链接：https://code.claude.com/docs/en/settings ；本地：无
- 关键说法：
  - 优先级为 managed > 命令行 > local > project > user，"Nothing you set overrides them"（managed），少数安全键例外，列表类键会合并。
  - managed-settings.json 的位置：Linux/WSL 为 `/etc/claude-code/`，macOS 为 `/Library/Application Support/ClaudeCode/`，Windows 为 `C:\Program Files\ClaudeCode\`；也可通过 MDM 或服务器下发。
- 文中说法与判定：
  - 第 84 行"设置只按范围"：**准确**。
  - 第 472 行"用户不能覆盖组织锁定项"：**准确**。
  - 第 381 行"/etc/claude-code 下的 managed policy"：**不完整**，只是 Linux 的路径。
  - 第 71 行"Claude Code 在三者之上另有组织策略一层"：**有歧义**。managed settings 在设置层级里最高，但 managed CLAUDE.md 只是最先加载、不能排除，不能"覆盖"其他 CLAUDE.md，也不在平台规则之上。文中表 3 自己也把组织排在产品方之后，建议改为"之外"。
- 支撑：表 3、表 19。

### [51] Anthropic. Claude Code: Skills

- 链接：https://code.claude.com/docs/en/skills ；本地：无
- 关键说法：
  - skill 目录的字符预算 "scales at 1% of the model's context window"，可通过 `skillListingBudgetFraction` 或 `SLASH_COMMAND_TOOL_CHAR_BUDGET` 调整；超出时先丢最少用的 skill 的描述。
  - description 与 when_to_use 合并后 "truncated at 1,536 characters"，可通过 `skillListingMaxDescChars` 调整。
  - skill 从 enterprise、personal、project、plugin、bundled 多处汇入同一个目录，同名时 enterprise > personal > project。
  - 按 description 匹配触发。
  - "Keep SKILL.md under 500 lines"。
- 文中说法与判定：
  - 第 287 行"目录占上下文 1%，每条不超过 1536 字符"：**数字准确**。但 1% 是预算**上限**（默认值，可调），不是实际占用；1536 是截断长度。builder 若要跨平台，description 应以 [6] 的 1024 为准。
  - 第 84、374 行：**准确**。
- 支撑：表 15、表 11、4.2 节。

### [52] Anthropic. Agent SDK: Modifying system prompts

- 链接：https://code.claude.com/docs/en/agent-sdk/modifying-system-prompts ；本地：无
- 关键说法：
  - 不传 systemPrompt 时使用极简提示词（"omits… including its security and safety instructions"）。
  - 自定义提示词时 "nothing in your prompt tells Claude that reminders… come from the application rather than the user"，需要自己说明。
  - `excludeDynamicSections: true` 把动态部分（至少 auto memory 目录位置）移到第一条 user message，代价是 "carry marginally less weight"。
  - `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` 把自定义 system prompt 切成两个带缓存断点的块。
- 文中说法与判定：
  - 第 492 行"不传 systemPrompt 给的是极简提示词""自定义时需解释系统提醒"：**准确**。
  - 第 285、293 行"分量略轻"：**准确**。
  - "动态边界把按用户变的内容移到 user message"：**有偏差**，混淆了两个机制，见"需要修正"B9。
  - 第 492 行"六个地方各对应 SDK 的一个入口"后面列了 7 个入口：**数目不一致**。
- 支撑：3.1 表 15、4.6 节。

### [53] Anthropic. Claude prompting best practices

- 链接：https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices ；本地：无
- 关键说法：
  - "Add context to improve performance" 一节对比了 "NEVER use ellipses" 与 "Your response will be read aloud by a text-to-speech engine, so never use ellipses…"，并说 "Claude is smart enough to generalize from the explanation"。
  - 只针对 Claude Opus 4.5 和 4.6 的工具或 skill 过度触发："dial back any aggressive language. Where you might have said 'CRITICAL: You MUST use this tool when...', you can use more normal prompting"。
  - 长任务推荐 `tests.json`、`progress.txt`。
  - 示例是 "one of the most reliable ways to steer"，建议 3 到 5 个。
- 文中说法与判定：
  - 第 120、337 行"说明理由比命令有效"及省略号的例子：**准确**。
  - 第 337 行"新模型对 CRITICAL、MUST 一类词反应过度"：**有偏差（泛化）**。原文只就 Opus 4.5 和 4.6 的工具或 skill 触发而言，不是一般性结论。
- 支撑：做法的"带理由"、3.3 节写法。

### [54] Anthropic. Harness design for long-running application development（Prithvi Rajasekaran，2026-03-24）

- 链接：https://www.anthropic.com/engineering/harness-design-long-running-apps ；本地：无
- 关键说法："every component in a harness encodes an assumption about what the model can't do on its own, and those assumptions are worth stress testing… they can quickly go stale as models improve"。作者在从 Opus 4.5 换到 4.6 时去掉了 sprint 结构。
- 文中说法与判定：
  - 第 474 行"每个组件都编码一个关于模型做不到什么的假设，模型进步就该拆掉脚手架"：**准确**。
  - 第 199 行"进度文件、任务清单用 JSON [54]"：**错引**。这出自另一篇 "Effective harnesses for long-running agents"（2025-11-26，https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents），文中有 `claude-progress.txt` 和 JSON feature list，理由是 "the model is less likely to inappropriately change or overwrite JSON files compared to Markdown files"。建议新增这条参考文献。
- 支撑：2.4 自我管理、4.4 节淘汰。

### [55] Anthropic. Writing effective tools for agents（2025-09-11）

- 链接：https://www.anthropic.com/engineering/writing-tools-for-agents ；本地：无
- 关键说法：
  - "think of how you would describe your tool to a new hire on your team"。
  - 按服务或资源做命名空间。
  - "For Claude Code, we restrict tool responses to 25,000 tokens by default"。
  - 精简的响应格式约省 2/3 token。
  - 全文**没有** 72%、90%、85% 这些数字，也没有讲延迟加载或 input_examples 功能。
- 文中说法与判定：
  - 第 214 行"按对新人讲的方式描述、命名空间、输出上限"：**准确**。"输入示例"在这篇里只是顺带提及。
  - 第 126 行"示例把调用准确率从 72% 提到 90%"：**错引且有泛化**。出自 "Introducing advanced tool use on the Claude Developer Platform"（2025-11-24，https://www.anthropic.com/engineering/advanced-tool-use），原文："In our own internal testing, tool use examples improved accuracy from 72% to 90% on complex parameter handling"，只是内部测试，且限于复杂参数处理。
  - 第 286 行"延迟加载省 85% 的 token"：**错引且有泛化**。同样出自 advanced tool use 一文，是一个示例场景：50 多个 MCP 工具预加载约 77K token，用 Tool Search 后约 8.7K，"an 85% reduction"。
- 支撑：工具与资源、表 15 工具描述一行。

### [56] 刘承越. 长程智能体任务：地图与定位（笔记，待发）

- 链接：无（未发表）；本地：无
- 文中说法：
  - 第 58 行"四组与系统层的四种性质也对得上：机制、理解、偏好与责任"。
  - 第 69 行"长程任务对系统的十二项需求里，能力侧每一项都要有内容告诉模型，十二项逐项落进九件事，无一落空"。
- 判定：**无法核实**。作者本人的未发表笔记，"十二项需求"的具体内容和逐项对应在本文中没有列出。四组九件的完整性论证有一条线依赖它，建议在附录列出十二项及其对应，或等笔记发表后引用。
- 支撑：2.2 节完整性检查。

---

## 无法获取或未完整核对的参考文献

- **[20] Google/Kaggle 白皮书**：Kaggle 页面由 JavaScript 渲染，自动抓取只得到标题。核对时读的是第三方转载的全文，没有下载保存（版权不明）。
- **[42] Alavi & Leidner（MISQ 2001）**：只确认了期刊落地页能打开。全文可能需要订阅，按规则没有下载。正文也没有引用这一条。
- **[56] 作者未发表笔记**：无法获取，相关说法无法核实。
- **[4] 中的具体数字**（857/4260 词、20 到 24 个工具、4.7k 到 8.8k 词、"Context management"一节）：仓库可以获取，但其中找不到这些数字和章节，见 C1。
- **[11]、[45]、[10]**：链接可以打开，但正文没有引用，所以没有可核对的说法。
- 其余 21 篇 arXiv 论文都已下载到 `reference/papers/`，均以 `%PDF` 开头。非 arXiv 的来源是网页、文档或仓库，没有可下载的开放 PDF，因此只做了在线核对，没有存本地副本。
