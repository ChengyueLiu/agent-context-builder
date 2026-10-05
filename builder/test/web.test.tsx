// 每个页面都能用示例 agent 渲染出来，并且该有的内容都在。不开浏览器，只渲染成 HTML。

import { fileURLToPath } from 'node:url';
import { App as AntApp } from 'antd';
import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { compile } from '../src/core/compile';
import { listDef, pageFields, placeOf } from '../src/core/outline';
import { contentLang, loadDef, loadTemplates } from '../src/core/store';
import type { NavEntry } from '../src/core/types';
import { EditorContext } from '../src/web/agentContext';
import { LangProvider } from '../src/web/i18n';
import type { AgentApi, ProjectPayload } from '../src/web/api';
import Help from '../src/web/components/Help';
import ItemPage from '../src/web/components/ItemPage';
import OutlineTree, { buildOutline } from '../src/web/components/OutlineTree';
import PartPage from '../src/web/components/PartPage';
import PromptPane from '../src/web/components/PromptPane';
import SectionPage from '../src/web/components/SectionPage';
import { canonical, firstRoute, hashOf, parseRouteKey, routeKey, sectionOf, type Route } from '../src/web/util';

const root = fileURLToPath(new URL('../../examples/research-agent', import.meta.url));

let project: ProjectPayload;
beforeAll(async () => {
  const templates = await loadTemplates();
  const def = await loadDef(root, templates.zh);
  const contentTemplate = templates[contentLang(def)];
  // 界面用中文，内容用 agent 自己的语言（示例是英文）
  project = { root, templates, def, build: compile(contentTemplate, def, 'zh'), template: templates.zh, contentTemplate };
});

/** 页面里的文字会被转义，比较前先按同样的规则转义 */
const esc = (v: unknown) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function html(node: ReactNode): string {
  const value = { api: {} as AgentApi, project, setProject: () => {}, go: () => {}, jump: () => {}, setPage: () => {}, setLive: () => {} };
  return renderToString(
    <AntApp>
      <EditorContext.Provider value={value}>{node}</EditorContext.Provider>
    </AntApp>,
  );
}

describe('配置', () => {
  it('左边列出每一组和组里的每一页', () => {
    const { template } = project;
    const out = html(<OutlineTree route={firstRoute(template)} />);
    const walk = (entries: NavEntry[]) => {
      for (const e of entries) {
        if (typeof e !== 'string') {
          expect(out).toContain(e.name);
          walk(e.items);
          continue;
        }
        const section = template.prompt.sections.find((s) => s.id === e);
        const name = template.parts.find((p) => p.id === e)?.name ?? section?.title ?? section?.name;
        expect(out).toContain(name);
      }
    };
    walk(template.nav);
    expect(out).toContain('产出物管理');
  });

  it('目录里每个节点只出现一次：分散在几页上的清单项只挂在所属的那一页下', () => {
    const { nodes } = buildOutline(project.template, project.def, (x) => x);
    const keys: string[] = [];
    const walk = (ns: { key: unknown; children?: unknown[] }[]) => ns.forEach((n) => (keys.push(String(n.key)), walk((n.children ?? []) as never)));
    walk(nodes as never);
    expect(keys.length).toBeGreaterThan(10);
    expect(new Set(keys).size).toBe(keys.length);
    const list = listDef(project.template, 'provided');
    for (const item of project.def.provided) {
      const above = project.template.parts.filter((p) => p.lists.includes('provided') && placeOf(list, item) === p.id);
      expect(above).toHaveLength(1);
    }
  });

  it('单独成页的节：每一格都有填写的地方', () => {
    for (const id of ['identity', 'workflow', 'standards', 'collab', 'principles', 'process', 'security', 'harm', 'compliance']) {
      const section = project.template.prompt.sections.find((s) => s.id === id)!;
      const out = html(<SectionPage section={section} />);
      expect(out.match(/<textarea/g)?.length ?? 0).toBe(pageFields(project.template, id).length);
    }
  });

  it('部分的页面：顶上是在这一页填的系统提示词格子，下面是清单；记忆按范围、产出物按类别分块', () => {
    for (const part of project.template.parts) {
      const out = html(<PartPage part={part} />);
      expect(out.match(/<textarea/g)?.length ?? 0).toBe(pageFields(project.template, part.id).length);
      for (const kind of part.lists) {
        const list = listDef(project.template, kind);
        for (const item of project.def[kind]) {
          if (!list.placed_by || placeOf(list, item) === part.id) expect(out).toContain(esc(item.name));
          else expect(out).not.toContain(esc(item.name));
        }
      }
    }
    const memory = html(<PartPage part={project.template.parts.find((p) => p.id === 'memory')!} />);
    for (const label of ['本项目', '跨项目', 'Project overview', 'Progress', 'References', 'User', 'Feedback']) expect(memory).toContain(label);
    const outputs = html(<PartPage part={project.template.parts.find((p) => p.id === 'outputs')!} />);
    for (const label of ['最终交付', '过程成果', '工作记录', 'Paper draft', 'Evaluation plan', esc('Attempts & failures')]) expect(outputs).toContain(label);
    const reminders = html(<PartPage part={project.template.parts.find((p) => p.id === 'reminders')!} />);
    for (const label of ['关卡', '独立评审', '出错处理', '压缩']) expect(reminders).toContain(label);
  });

  it('每一项都能打开', () => {
    for (const part of project.template.parts) {
      for (const kind of part.lists) {
        for (const item of project.def[kind]) expect(html(<ItemPage kind={kind} id={item.id} />)).toContain('生成到：');
      }
    }
    expect(html(<ItemPage kind="skills" id="没有这一项" />)).toContain('没有这个');
  });

  it('帮助', () => {
    expect(html(<Help open onClose={() => {}} />)).toBeTypeOf('string');
  });
});

describe('系统提示词', () => {
  it('按节显示合成的结果，没有输入框；当前页对应的那一节高亮', () => {
    const out = html(<PromptPane focus="memory" onClose={() => {}} />);
    expect(out).toContain('自动生成');
    expect(out).not.toContain('<textarea');
    expect(out).toContain('data-section="memory"');
    expect(out).toContain('prompt-seg prompt-seg-focus');
  });

  it('还没保存的修改先显示出来', () => {
    const out = html(<PromptPane live={{ prompt: { priority: '还没保存的优先顺序' } }} onClose={() => {}} />);
    expect(out).toContain('还没保存的优先顺序');
  });
});

describe('位置和网址', () => {
  it('位置和字符串互转', () => {
    const routes: Route[] = [
      { type: 'section', id: 'how' },
      { type: 'part', id: 'memory' },
      { type: 'item', kind: 'skills', id: 'experiment-design' },
    ];
    for (const r of routes) expect(parseRouteKey(routeKey(r))).toEqual(r);
    expect(parseRouteKey('不认识')).toBeUndefined();
  });

  it('和部分同名的节就是那个部分的页面；每一页都知道对应系统提示词的哪一节', () => {
    const { template } = project;
    expect(canonical(template, { type: 'section', id: 'memory' })).toEqual({ type: 'part', id: 'memory' });
    expect(firstRoute(template)).toEqual({ type: 'section', id: 'identity' });
    expect(sectionOf(template, { type: 'part', id: 'guarantees' })).toBe('principles');
    expect(sectionOf(template, { type: 'part', id: 'reminders' })).toBe('workflow');
    expect(sectionOf(template, { type: 'part', id: 'environment' })).toBe('environment');
    expect(sectionOf(template, { type: 'item', kind: 'skills', id: 'survey' })).toBe('resources');
  });

  it('生成结果和问题里的每个位置都能找到', () => {
    const { template, def, build } = project;
    const targets = [...build.files.flatMap((f) => [f.target, ...(f.segments ?? []).map((s) => s.target)]), ...build.diagnostics.flatMap((d) => (d.target ? [d.target] : []))];
    for (const target of targets) {
      const r = parseRouteKey(target)!;
      expect(r).toBeDefined();
      if (r.type === 'section') expect(template.prompt.sections.some((s) => s.id === r.id)).toBe(true);
      if (r.type === 'part') expect(template.parts.some((p) => p.id === r.id)).toBe(true);
      if (r.type === 'item') expect(def[r.kind].some((x) => x.id === r.id)).toBe(true);
    }
  });

  it('网址里带着 agent 和位置', () => {
    expect(hashOf('research-agent', { type: 'section', id: 'how' })).toBe('#/research-agent/section%3Ahow');
  });
});

describe('界面语言', () => {
  it('切到英文：界面上的字和大纲的标签都是英文，预览照样用内容语言', () => {
    const en = { ...project, template: project.templates.en };
    const value = { api: {} as AgentApi, project: en, setProject: () => {}, go: () => {}, jump: () => {}, setPage: () => {}, setLive: () => {} };
    const out = renderToString(
      <LangProvider lang="en" setLang={() => {}}>
        <AntApp>
          <EditorContext.Provider value={value}>
            <PartPage part={en.template.parts.find((p) => p.id === 'memory')!} />
            <PromptPane onClose={() => {}} />
          </EditorContext.Provider>
        </AntApp>
      </LangProvider>,
    );
    expect(out).toContain('Memory management');
    expect(out).toContain('This project');
    expect(out).toContain('System prompt preview');
    expect(out).toContain('>Workflow</');
    expect(out).not.toMatch(/[\u4e00-\u9fff]/);
  });
});
