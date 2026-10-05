import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { parseCard, serializeCard } from '../src/core/card';
import { compile } from '../src/core/compile';
import { agentDir, createAgent, deleteCard, listAgents, loadProject, loadTemplate, saveAgent, saveCard, writeBuild } from '../src/core/project';
import { destinationOf } from '../src/core/route';
import { indexTemplate } from '../src/core/template';
import type { AgentSpec, Card, Template } from '../src/core/types';
import { parseWhen } from '../src/core/when';

const example = fileURLToPath(new URL('../../examples/research-agent', import.meta.url));

let template: Template;
beforeAll(async () => {
  template = await loadTemplate();
});

const agent: AgentSpec = {
  name: 't',
  stages: [{ id: 'survey', name: '调研', description: '调研时加载' }],
  domains: [{ id: 'ml', name: '机器学习', description: 'ML 时加载' }],
  tools: [{ id: 'run', name: '运行' }],
  situations: [{ id: 'stale', name: '待办久未更新' }],
};

function card(entry: string, when: string, body = '正文', extra: Partial<Card> = {}): Card {
  return { path: `context/x/${entry}.${when}.md`, entry, when, body, ...extra };
}

describe('卡片格式', () => {
  it('写出再读回，内容不变', () => {
    const c = card('hr_truth', 'always', '- 不编造\n- 如实报告', { mechanism: '日志比对', note: '多行\n备注' });
    const back = parseCard(c.path, serializeCard(c));
    expect(back).toEqual({ ...c, body: c.body + '\n' });
  });

  it('不认识的字段原样保留', () => {
    const text = '---\nentry: role\nwhen: always\nowner: 张三\n---\n\n你是助手\n';
    const c = parseCard('context/1-job/role.md', text);
    expect(c.extra).toEqual({ owner: '张三' });
    expect(serializeCard(c)).toContain('owner: 张三');
  });

  it('没有 frontmatter 时报错', () => {
    expect(() => parseCard('a.md', '只有正文')).toThrow(/frontmatter/);
  });
});

describe('适用条件', () => {
  it('解析各种写法', () => {
    expect(parseWhen('always')).toEqual({ kind: 'always' });
    expect(parseWhen('stage:survey')).toEqual({ kind: 'stage', value: 'survey' });
    expect(parseWhen('stage:')).toBeNull();
    expect(parseWhen('phase:x')).toBeNull();
  });
});

describe('去向', () => {
  it('适用条件决定地方', () => {
    const refs = indexTemplate(template);
    const dest = (entry: string, when: string) => destinationOf(card(entry, when), refs, agent)?.file;
    expect(dest('role', 'always')).toBe('system-prompt.md');
    expect(dest('stage_practice', 'stage:survey')).toBe('skills/stage-survey/SKILL.md');
    expect(dest('examples', 'stage:survey')).toBe('skills/stage-survey/examples.md');
    expect(dest('domain_knowledge', 'domain:ml')).toBe('skills/domain-ml/SKILL.md');
    expect(dest('tool_procedure', 'tool:run')).toBe('tools/run.md');
    expect(dest('nudges', 'situation:stale')).toBe('reminders/stale.md');
    expect(dest('stage_practice', 'stage:nope')).toBeUndefined();
  });
});

describe('编译', () => {
  it('系统提示词按件的顺序拼，角色在最前', () => {
    const { files } = compile(template, agent, [
      card('flow_map', 'always', '流程'),
      card('role', 'always', '你是科研助手'),
      card('hr_truth', 'always', '不编造', { mechanism: '日志比对' }),
    ]);
    const sp = files.find((f) => f.path === 'system-prompt.md')!.content;
    expect(sp.indexOf('你是科研助手')).toBeLessThan(sp.indexOf('不编造'));
    expect(sp.indexOf('不编造')).toBeLessThan(sp.indexOf('流程'));
    expect(sp).not.toContain('## 角色');
    const mech = files.find((f) => f.path === 'mechanisms.md')!;
    expect(mech.content).toContain('日志比对');
    expect(mech.tokens).toBe(0);
  });

  it('工具描述里定义在规程之前', () => {
    const { files } = compile(template, agent, [card('tool_procedure', 'tool:run', '先登记'), card('tool_definition', 'tool:run', '参数 x')]);
    const tool = files.find((f) => f.path === 'tools/run.md')!.content;
    expect(tool.indexOf('参数 x')).toBeLessThan(tool.indexOf('先登记'));
  });

  it('只给人看的字段不进输出', () => {
    const { files } = compile(template, agent, [card('role', 'always', '你是助手', { note: '备注Y', title: '标题Z' })]);
    const all = files.filter((f) => f.place !== 'manifest').map((f) => f.content).join('\n');
    expect(all).not.toMatch(/备注Y|标题Z/);
  });

  it('问题都报成诊断，不中断编译', () => {
    const { diagnostics, files } = compile(template, agent, [
      card('nope', 'always'),
      card('role', 'stage:missing'),
      card('user_prefs', 'always'),
      card('role', 'always', '   '),
      card('scope', 'always', '负责调研'),
    ]);
    const msgs = diagnostics.map((d) => `${d.severity}:${d.message}`);
    expect(msgs.some((m) => m.startsWith('error:') && m.includes('nope'))).toBe(true);
    expect(msgs.some((m) => m.startsWith('error:') && m.includes('missing'))).toBe(true);
    expect(msgs.some((m) => m.startsWith('warning:') && m.includes('用户偏好'))).toBe(true);
    // 正文为空不算问题
    expect(msgs).toHaveLength(3);
    expect(files.find((f) => f.path === 'system-prompt.md')!.content).toContain('负责调研');
  });

  it('示例 agent 没有错误', async () => {
    const project = await loadProject(example, template);
    expect(project.loadDiagnostics).toEqual([]);
    const { diagnostics, files } = compile(template, project.agent, project.cards);
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(files.map((f) => f.path)).toContain('skills/stage-experiment-design/SKILL.md');
  });
});

describe('读写项目', () => {
  it('改了适用条件，卡片文件跟着改名', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'acb-'));
    await saveAgent(root, agent);
    const base = { entry: 'stage_practice', body: '步骤' };
    const a = await saveCard(root, template, { ...base, when: 'stage:survey' });
    expect(a.path).toBe('context/3-practice/stage_practice.stage-survey.md');
    const b = await saveCard(root, template, { ...base, when: 'stage:survey' });
    expect(b.path).toBe('context/3-practice/stage_practice.stage-survey-2.md');
    const moved = await saveCard(root, template, { ...b, when: 'always' });
    expect(moved.path).toBe('context/3-practice/stage_practice.md');
    const project = await loadProject(root, template);
    expect(project.cards.map((c) => c.path).sort()).toEqual([a.path, moved.path].sort());
    await deleteCard(root, a.path);
    expect((await loadProject(root, template)).cards).toHaveLength(1);
  });

  it('拒绝 context/ 之外的路径', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'acb-'));
    await expect(deleteCard(root, '../agent.yaml')).rejects.toThrow(/非法/);
    await expect(deleteCard(root, 'context/../agent.yaml')).rejects.toThrow(/非法/);
  });

  it('工作区：新建、列出 agent，拒绝不合法的名字', async () => {
    const ws = await fs.mkdtemp(path.join(os.tmpdir(), 'acb-ws-'));
    await createAgent(ws, '客服', '客服 agent');
    await expect(createAgent(ws, '客服', '重名')).rejects.toThrow(/已经有/);
    expect(await listAgents(ws)).toEqual([{ id: '客服', name: '客服 agent', cards: 0 }]);
    expect(() => agentDir(ws, '../x')).toThrow(/不合法/);
    expect(() => agentDir(ws, '.hidden')).toThrow(/不合法/);
  });

  it('build/ 里有别的文件时不覆盖', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'acb-'));
    await fs.mkdir(path.join(root, 'build'));
    await fs.writeFile(path.join(root, 'build', 'mine.txt'), 'x');
    await expect(writeBuild(root, { files: [], diagnostics: [] })).rejects.toThrow(/没有覆盖/);
  });
});
