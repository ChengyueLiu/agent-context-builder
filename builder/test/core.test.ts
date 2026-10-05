import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { compile, renderAuto } from '../src/core/compile';
import { itemStatus, listDef, nextId, sectionStatus } from '../src/core/outline';
import { agentDir, createAgent, emptyDef, listAgents, loadDef, loadTemplate, patchDef, saveDef, writeBuild } from '../src/core/store';
import type { AgentDef, NavEntry, Template } from '../src/core/types';
import { AUTO_IDS } from '../src/core/types';

const example = fileURLToPath(new URL('../../examples/research-agent', import.meta.url));

let template: Template;
beforeAll(async () => {
  template = await loadTemplate();
});

function def(patch: Partial<AgentDef> = {}): AgentDef {
  return { ...emptyDef(), ...patch };
}
const file = (d: AgentDef, p: string) => compile(template, d).files.find((f) => f.path === p);

describe('大纲', () => {
  it('系统提示词：工作说明、资源、环境、运行时管理、安全、合规；可靠性的机制不进系统提示词', () => {
    expect(template.prompt.sections.map((s) => s.name)).toEqual(['身份与目标', '工作流程', '交付与验收', '用户协作', '原则与红线', '资源', '环境', '记忆', '项目管理', '产出物', '信息安全', '人身与社会安全', '合规', '可靠性']);
    const resources = template.prompt.sections.find((s) => s.id === 'resources')!;
    expect((resources.auto ?? []).map((a) => a.from_part)).toEqual(['skills', 'knowledge', 'tools', 'helpers']);
    expect(template.prompt.sections.find((s) => s.id === 'reliability')!.fields.every((f) => f.prompt === false)).toBe(true);
  });

  it('左侧目录：功能性、非功能性两组，顺序和系统提示词一致；每个部分只出现一次，人写的格子都有地方填', async () => {
    const shape = (entries: NavEntry[]): string[] => entries.map((e) => (typeof e === 'string' ? e : `${e.name}[${shape(e.items).join(',')}]`));
    expect(shape(template.nav)).toEqual([
      '功能性配置[工作说明[identity,workflow,standards,collab,principles],资源说明[skills,knowledge,tools,helpers],environment,运行时管理规则[memory,process,outputs]]',
      '非功能性配置[安全与合规[security,harm,compliance],可靠性[guarantees,reminders,cases]]',
    ]);
    const { validateTemplate } = await import('../src/core/store');
    expect(validateTemplate(template)).toEqual([]);
    expect(validateTemplate({ ...template, nav: template.nav.slice(1) })).not.toEqual([]);
  });

  it('标题都是名词短语；每一格都有要写到的几点；身份放在最开头', () => {
    expect(template.prompt.sections[0].opening).toBe(true);
    const labels = [...template.prompt.sections.map((s) => s.name), ...template.prompt.sections.flatMap((s) => [...s.fields.map((f) => f.label), ...(s.auto ?? []).map((a) => a.label)])];
    for (const l of labels) expect(l).not.toMatch(/[？?]|怎么|什么|你/);
    for (const f of template.prompt.sections.flatMap((s) => s.fields)) expect(f.covers?.length).toBeGreaterThan(0);
  });
  it('有条件的格子只在条件满足时要填；条件写错了大纲报错', async () => {
    const knowledge = listDef(template, 'knowledge');
    expect(itemStatus(knowledge, { id: 'a', name: '甲', when: '需要时' }).missingRequired).toEqual(['内容']);
    expect(itemStatus(knowledge, { id: 'a', name: '甲', when: '需要时', form: 'elsewhere' }).missingRequired).toEqual(['在哪']);
    const { validateTemplate } = await import('../src/core/store');
    const broken = structuredClone(template);
    listDef(broken, 'knowledge').fields.find((f) => f.id === 'content')!.show_if = { form: 'nowhere' };
    expect(validateTemplate(broken).join()).toContain('show_if');
  });
});

describe('填写情况', () => {
  it('一节里填了几格、还空着哪些', () => {
    const collab = template.prompt.sections.find((s) => s.id === 'collab')!;
    const s = sectionStatus(collab, def({ prompt: { asking: '一次问一组' } }));
    expect(s.filled).toBe(1);
    expect(s.total).toBe(collab.fields.length);
    expect(s.missingRequired).toEqual(['决定权']);
  });

  it('一样记忆要写放在哪、记什么、什么时候更新', () => {
    const list = listDef(template, 'memory');
    expect(itemStatus(list, { id: 'm2', name: '进展' }).missingRequired).toEqual(['文件', '记什么', '什么时候更新']);
  });

  it('新加的一项，标识不重复', () => {
    expect(nextId('memory', [{ id: 'm1', name: 'a' }, { id: 'm3', name: 'b' }])).toBe('m2');
  });
});

describe('合成', () => {
  it('系统提示词按节的顺序拼，空的节不出现；身份在最开头，不加标题', () => {
    const sp = file(def({ prompt: { red_lines: '- 不编造数据', role: '你是科研助手', goal: '目标是写出论文初稿', done: '逐条有证据' } }), 'system-prompt.md')!;
    expect(sp.content.startsWith('你是科研助手\n\n目标是写出论文初稿\n\n# 交付与验收')).toBe(true);
    expect(sp.content.indexOf('# 交付与验收')).toBeLessThan(sp.content.indexOf('# 原则与红线'));
    expect(sp.content).not.toContain('# 身份');
    expect(sp.content).not.toContain('## 身份');
    expect(sp.content).not.toContain('# 工作流程');
    expect(sp.segments!.map((s) => s.target)).toEqual(['section:identity', 'section:standards', 'section:principles']);
  });

  it('一节有两块以上内容时每块一个二级标题；只有一块时正文直接写在节标题下；没有三级标题', () => {
    const d = def({
      prompt: { steps: '分七步', fallback: '退回上一步', all_tools: '并行调用', resume: '开工先确认在哪一步', plan_rules: '随时更新' },
      memory: [{ id: 'm1', name: '进展', scope: 'project', path: 'memory/progress.md', format: '在做什么', when: '一步结束', write: '可以改写', load: 'auto' }],
    });
    const sp = file(d, 'system-prompt.md')!.content;
    expect(sp).toContain('# 工作流程\n\n## 步骤\n\n分七步\n\n## 回退\n\n退回上一步');
    expect(sp).toContain('# 资源\n\n## 工具的通用规则\n\n并行调用');
    expect(sp).toContain('# 项目管理\n\n随时更新');
    expect(sp).toContain('# 记忆\n\n## 开工与接续\n\n开工先确认在哪一步\n\n## 记忆清单\n\n- **进展**（`memory/progress.md`，自动加载）：在做什么。什么时候更新：一步结束。可以改写。');
    expect(sp).not.toContain('###');
  });

  it('skill 的头部进系统提示词，正文单独成文件；没写正文的不列', () => {
    const d = def({
      skills: [
        { id: 'survey', name: '调研', when_use: '进入调研这一步时', when_not: '只查一篇论文时', practice: '先检索' },
        { id: 'idea', name: '想法', when_use: '进入想法这一步时' },
      ],
    });
    const { files } = compile(template, d);
    const sp = files.find((f) => f.path === 'system-prompt.md')!.content;
    expect(sp).toContain('# Skill\n\n下面这些 skill');
    expect(sp).toContain('- **调研**（`survey`）：进入调研这一步时。不用于：只查一篇论文时。');
    expect(sp).not.toContain('想法');
    const skill = files.find((f) => f.path === 'skills/survey/SKILL.md')!;
    expect(skill.group).toBe('on_demand');
    expect(skill.content).toContain('name: survey');
    expect(skill.content).toContain('## 具体做法\n\n先检索');
    expect(skill.content).not.toContain('什么时候用');
    expect(files.some((f) => f.path.startsWith('skills/idea/'))).toBe(false);
  });

  it('系统提示词只放常驻的：资源只列清单，记忆和产出物只列要点，插入的内容说明一次，系统保证和提醒的时机不列', () => {
    const d = def({
      knowledge: [
        { id: 'venue', name: '投稿要求', when: '写论文时', content: '页数不超过 9 页', source: '2026 年征稿说明' },
        { id: 'papers', name: '论文原文', when: '核对细节时', form: 'elsewhere', location: 'data/papers/', source: '2026-09 下载' },
      ],
      skills: [{ id: 'writing', name: '论文写作', when_use: '写论文时', practice: '先写提纲' }],
      tools: [{ id: 'web_search', name: '网页搜索', source: 'platform', when: '查最新消息时', effect: 'read' }],
      helpers: [{ id: 'h1', name: '审稿 agent', purpose: '审读稿件', when: '初稿完成后' }],
      memory: [
        { id: 'u1', name: '用户', scope: 'cross', path: '~/memory/user.md', format: '用户是谁', when: '了解到新情况时', write: '可以改写', load: 'auto', limit: '20 行以内' },
        { id: 'r1', name: '参考', scope: 'project', path: 'memory/reference.md', format: '去哪找', when: '得知时', load: 'on_demand' },
      ],
      outputs: [
        { id: 'o1', name: '实验方案', kind: 'interim', path: 'outputs/design/plan.md', when: '实验设计时', format: '方案', write: 'versioned', confirm: true },
        { id: 'o2', name: '论文初稿', kind: 'final', skill: 'writing', path: 'outputs/paper/', when: '写作时', write: 'versioned' },
      ],
      prompt: { upkeep: '每三个月复查一次' },
      reminders: [{ id: 'r1', name: '一步结束', trigger: '一步结束时', text: '请复盘' }],
      provided: [
        { id: 'p1', name: '预算用量', belongs: 'guarantees', where: 'per_message', explain: '已用和剩下的预算', sample: '已用 3 / 10' },
        { id: 'p2', name: '环境快照', where: 'session_start', explain: '开工时的机器' },
      ],
      guarantees: [{ id: 'g1', name: '引用必须真实存在', how: '程序核对' }],
    });
    const { files } = compile(template, d);
    const sp = files.find((f) => f.path === 'system-prompt.md')!.content;
    // 资源：只列清单，正文按需读
    expect(sp).toContain('## 知识\n\n下面这些资料平时不加载');
    expect(sp).toContain('- **投稿要求**（`knowledge/venue.md`）：写论文时。');
    expect(sp).not.toContain('页数不超过');
    expect(files.find((f) => f.path === 'knowledge/venue.md')!.content).toBe('# 投稿要求\n\n> 来源与更新时间：2026 年征稿说明\n\n页数不超过 9 页\n');
    expect(sp).toContain('- **论文原文**：核对细节时。位置：data/papers/。来源：2026-09 下载。');
    expect(files.some((f) => f.path === 'knowledge/papers.md')).toBe(false);
    expect(sp).toContain('## 平台工具的补充用法\n\n下面这些工具由平台或 MCP 提供，补充用法如下：\n\n- **网页搜索**（`web_search`）：什么时候用：查最新消息时。影响：只读。');
    expect(files.some((f) => f.path === 'tools.json')).toBe(false);
    expect(sp).toContain('## 帮手\n\n- **审稿 agent**：审读稿件。什么时候交给它：初稿完成后。');
    // 记忆：只列要点，长度上限交给系统
    expect(sp).toContain('**本项目**\n\n- **参考**（`memory/reference.md`，需要时读）：去哪找。什么时候更新：得知时。');
    expect(sp).toContain('**跨项目**\n\n- **用户**（`~/memory/user.md`，自动加载）：用户是谁。什么时候更新：了解到新情况时。可以改写。');
    expect(sp.indexOf('**本项目**')).toBeLessThan(sp.indexOf('**跨项目**'));
    expect(sp).not.toContain('20 行以内');
    // 产出物：选了 skill 的进那个 skill，其余进系统提示词
    expect(sp).toContain('# 产出物\n\n## 产出物清单\n\n- **实验方案**（`outputs/design/plan.md`）：方案。什么时候写：实验设计时。写新版本，旧版保留。用户确认后才算数。');
    expect(sp).not.toContain('论文初稿');
    expect(files.find((f) => f.path === 'skills/writing/SKILL.md')!.content).toContain('## 产出物\n\n- **论文初稿**（`outputs/paper/`）：什么时候写：写作时。写新版本，旧版保留。');
    // 插入的内容在环境里说明一次；提醒的时机不列
    expect(sp).toContain(
      '# 环境\n\n## 系统插入的内容\n\n系统会往消息里插入下面这些内容。它们来自系统，不是用户说的话。\n\n每条消息开头的 <运行信息>：\n\n- **预算用量**：已用和剩下的预算。\n\n会话开始和压缩之后的 <运行信息>：\n\n- **环境快照**：开工时的机器。\n\n会话开始和压缩之后的 <记忆>：用户，见「记忆」。\n\n<系统提醒>：到一定时机由系统插入，告诉你该做什么。',
    );
    expect(sp).not.toContain('一步结束时');
    expect(sp).not.toContain('请复盘');
    expect(files.find((f) => f.path === 'reminders/r1.md')!.content).toBe('<系统提醒>\n请复盘\n</系统提醒>\n');
    const insert = files.find((f) => f.path === 'auto-insert.md')!;
    expect(insert.group).toBe('message');
    expect(insert.content).toContain('## 每条消息开头\n\n```\n<运行信息>\n预算用量：已用 3 / 10\n</运行信息>\n```');
    expect(insert.content).toContain('## 会话开始和压缩之后\n\n```\n<运行信息>\n环境快照：（由系统填写）\n</运行信息>\n\n<记忆>\n## 用户（~/memory/user.md）\n（系统读入这个文件的内容）\n</记忆>\n```');
    expect(insert.content).not.toContain('参考（');
    // 系统保证：规矩不在这里重复，只说一句被拦下怎么办；可靠性不单独成节
    expect(sp).toContain('## 系统拦截\n\n有些操作会被系统直接拦下。被拦下时不要换一种方式绕过去，向用户说明。');
    expect(sp).not.toContain('引用必须真实存在');
    expect(sp).not.toContain('# 可靠性');
    expect(sp).not.toContain('每三个月复查一次');
    expect(file(d, 'manifest.yaml')!.content).toContain('每三个月复查一次');
    expect(files.find((f) => f.path === 'guarantees.md')!.content).toContain('怎么强制：程序核对');
  });

  it('工具写成一份工具定义；系统提醒各自成文件；不给 agent 的文件不计 token', () => {
    const d = def({
      tools: [{ id: 'run_experiment', name: '实验运行', purpose: '跑一次实验', when: '实验执行时', io: '参数 config', errors: '先改配置', effect: 'irreversible' }],
      reminders: [{ id: 'r1', name: '待办久未更新', trigger: '10 轮没更新', text: '请更新待办' }],
    });
    const { files } = compile(template, d);
    const tools = files.find((f) => f.path === 'tools.json')!;
    expect(tools.group).toBe('start');
    const [definition] = JSON.parse(tools.content);
    expect(definition.name).toBe('run_experiment');
    expect(definition.description).toBe('跑一次实验。\n\n什么时候用：实验执行时。\n\n参数与返回：\n参数 config\n\n出错怎么办：\n先改配置\n\n影响：不可撤销。');
    expect(definition.annotations).toEqual({ readOnlyHint: false, destructiveHint: true });
    expect(files.some((f) => f.path.startsWith('tools/'))).toBe(false);
    expect(files.find((f) => f.path === 'reminders/r1.md')!.group).toBe('situation');
    for (const f of files.filter((x) => x.group === 'hidden')) expect(f.tokens).toBe(0);
  });

  it('标识有问题时报出来，不生成对应的文件', () => {
    const d = def({
      skills: [
        { id: 'Bad Name', name: '甲', when_use: 'x', practice: 'y' },
        { id: 'ok', name: '乙', when_use: 'x', practice: 'y' },
        { id: 'ok', name: '丙', when_use: 'x', practice: 'y' },
      ],
    });
    const { files, diagnostics } = compile(template, d);
    expect(diagnostics.filter((x) => x.severity === 'error')).toHaveLength(2);
    expect(files.filter((f) => f.path.startsWith('skills/')).map((f) => f.path)).toEqual(['skills/ok/SKILL.md']);
  });

  it('自动内容的来源没填时不输出', () => {
    for (const id of AUTO_IDS) expect(renderAuto(id, template, def())).toBe('');
  });
});

describe('读写', () => {
  it('存了再读，内容不变；空格子不留', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'acb-'));
    const d = def({
      config: { name: '测试' },
      prompt: { role: '你是助手', steps: '第一步\n\n第二步', asking: '  ' },
      skills: [{ id: 'a', name: '甲', when_use: '用的时候', practice: '1. 做\n2. 查' }],
      tools: [{ id: 't', name: '工具', purpose: '干活', io: '无', effect: 'external', confirm: true }],
      memory: [{ id: 'm1', name: '待办', by: 'agent', when: '每步', path: 'todo.md', write: 'edit', load: 'always' }],
    });
    const saved = await saveDef(root, template, d);
    expect(saved.prompt.asking).toBeUndefined();
    expect(await loadDef(root, template)).toEqual(saved);
    expect(saved.tools[0].effect).toBe('external');
    expect(saved.tools[0].confirm).toBeUndefined();
  });

  it('改一部分：格子合并，清单整份替换', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'acb-'));
    await saveDef(root, template, def({ config: { name: '测试' }, prompt: { role: 'A', steps: 'B' }, guarantees: [{ id: 'g1', name: '旧', how: 'x' }] }));
    const after = await patchDef(root, template, { prompt: { steps: 'C' }, guarantees: [] });
    expect(after.prompt).toEqual({ role: 'A', steps: 'C' });
    expect(after.guarantees).toEqual([]);
    expect(after.config.name).toBe('测试');
  });

  it('新建的 agent 预填了通用内容', async () => {
    const ws = await fs.mkdtemp(path.join(os.tmpdir(), 'acb-ws-'));
    await createAgent(ws, '客服', '客服 agent', template);
    await expect(createAgent(ws, '客服', '重名', template)).rejects.toThrow(/已经有/);
    expect(await listAgents(ws)).toEqual([{ id: '客服', name: '客服 agent' }]);
    const d = await loadDef(path.join(ws, '客服'), template);
    expect(d.prompt.judgment).toContain('最小代价');
    expect(d.prompt.role).toBeUndefined();
    expect(d.memory.map((m) => `${m.scope}:${m.name}`)).toEqual(['project:项目概况', 'project:进展', 'project:参考', 'cross:用户', 'cross:反馈']);
    expect(d.outputs.map((m) => `${m.kind}:${m.name}`)).toEqual(['final:最终报告', 'interim:经验提议', 'record:工作记录']);
    expect(d.provided.map((m) => m.name)).toEqual(['时间与位置', '预算用量', '当前任务', '规划全貌']);
    expect(d.knowledge.map((m) => m.name)).toEqual(['经验']);
    expect(d.tools.map((m) => m.name)).toEqual(['规划与待办']);
    expect(d.skills.map((m) => m.name)).toEqual(['复盘']);
    expect(d.reminders.map((r) => r.name)[0]).toBe('一步结束');
    expect(() => agentDir(ws, '../x')).toThrow(/不合法/);
  });

  it('build/ 里有别的文件时不覆盖', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'acb-'));
    await fs.mkdir(path.join(root, 'build'));
    await fs.writeFile(path.join(root, 'build', 'mine.txt'), 'x');
    await expect(writeBuild(root, { files: [], diagnostics: [] })).rejects.toThrow(/没有覆盖/);
  });
});

describe('示例：科研 agent', () => {
  it('能读入、能合成，没有错误', async () => {
    const d = await loadDef(example, template);
    const { files, diagnostics } = compile(template, d);
    expect(diagnostics.filter((x) => x.severity === 'error')).toEqual([]);
    expect(d.skills).toHaveLength(8);
    expect(files.map((f) => f.path)).toContain('skills/experiment-design/SKILL.md');
    const sp = files.find((f) => f.path === 'system-prompt.md')!;
    const withContent = template.prompt.sections.filter((s) => s.fields.some((f) => f.prompt !== false) || (s.auto ?? []).length);
    expect(sp.segments).toHaveLength(withContent.length);
  });
});
