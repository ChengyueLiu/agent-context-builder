// 合成：把大纲里填的内容，合成 agent 最终拿到的文件。纯函数，不碰磁盘。

import YAML from 'yaml';
import type { AgentDef, AutoId, BuildResult, Diagnostic, FieldDef, FileGroup, Item, ListKind, OutputFile, PromptSection, Segment, Template } from './types';
import { LIST_KINDS } from './types';
import { ID_RULES, itemFields, listDef, optionLabel, selectValue, text } from './outline';
import { CONTENT, UI, type ContentPhrases, type Lang } from './phrases';
import { countLines, estimateTokens } from './tokens';

/** 进 agent 文件的固定说法，跟着大纲的语言 */
const phrasesOf = (template: Template): ContentPhrases => CONTENT[template.language ?? 'zh'];

export const SYSTEM_PROMPT_FILE = 'system-prompt.md';
export const GUARANTEES_FILE = 'guarantees.md';
export const TOOLS_FILE = 'tools.json';
export const CASES_FILE = 'cases.md';
export const INSERT_FILE = 'auto-insert.md';
/** 一条提醒插入时的样子：用系统提醒的标签包起来 */
export function renderReminder(template: Template, r: Item): string {
  const P = phrasesOf(template);
  return `<${P.tag.reminder}>\n${text(r.text) || P.reminderEmpty}\n</${P.tag.reminder}>`;
}

/** 系统自动插入消息的内容：每条消息开头一块；会话开始和压缩之后，运行信息一块、自动加载的记忆一块。用示例值预览，真实的值由系统运行时填 */
export function renderInsertions(template: Template, def: AgentDef): { perMessage: string; sessionStart: string; memory: string } {
  const P = phrasesOf(template);
  const block = (items: Item[]) =>
    items.length ? [`<${P.tag.insert}>`, ...items.map((x) => `${x.name}${P.colon}${text(x.sample) || P.sampleEmpty}`), `</${P.tag.insert}>`].join('\n') : '';
  const items = def.provided.filter((x) => text(x.name));
  const memory = autoMemory(def);
  return {
    perMessage: block(items.filter((x) => x.where !== 'session_start')),
    sessionStart: block(items.filter((x) => x.where === 'session_start')),
    memory: memory.length ? [`<${P.tag.memory}>`, ...memory.map((m) => `## ${m.name}${P.paren(text(m.path))}\n${P.memoryFileBody}`), `</${P.tag.memory}>`].join('\n') : '',
  };
}

/** 开工和压缩之后由系统自动加载的记忆 */
const autoMemory = (def: AgentDef): Item[] => def.memory.filter((m) => text(m.name) && text(m.path) && m.load !== 'on_demand');
export const MANIFEST_FILE = 'manifest.yaml';

/** skill 的头部：这两格进系统提示词的 Skill 目录，其余是正文 */
const SKILL_HEAD = ['when_use', 'when_not'];

export function skillHasBody(template: Template, skill: Item): boolean {
  return listDef(template, 'skills').fields.some((f) => !SKILL_HEAD.includes(f.id) && text(skill[f.id]));
}

export function skillDescription(template: Template, skill: Item): string {
  const P = phrasesOf(template);
  const use = P.sentence(text(skill.when_use));
  const not = text(skill.when_not);
  return [use, not ? `${P.notFor}${P.sentence(not)}` : ''].filter(Boolean).join(template.language === 'en' ? ' ' : '');
}

/** 自己实现的工具进工具定义；平台自带和 MCP 的工具说明改不了，补充用法进系统提示词 */
const isOwnTool = (tool: Item): boolean => !tool.source || tool.source === 'own';

/** 知识放在别处时，写的是位置；写在这里时，生成一个文件 */
const isInlineKnowledge = (k: Item): boolean => k.form !== 'elsewhere';
const knowledgeWhere = (k: Item): string => (isInlineKnowledge(k) ? (text(k.content) ? `knowledge/${k.id}.md` : '') : text(k.location));

/** 工具的影响，对应 MCP 的工具标注 */
const EFFECT_ANNOTATIONS: Record<string, Record<string, boolean>> = {
  read: { readOnlyHint: true },
  local: { readOnlyHint: false, destructiveHint: false },
  irreversible: { readOnlyHint: false, destructiveHint: true },
  external: { readOnlyHint: false, openWorldHint: true },
};

/** 一张清单按 group_by 那一格分块，每块一串条目；只有一块时不加小标题 */
function groupedLines(template: Template, kind: 'memory' | 'outputs', items: Item[], line: (x: Item) => string): string {
  const list = listDef(template, kind);
  const by = list.fields.find((f) => f.id === list.group_by);
  const options = by?.options ?? [];
  const rank = (x: Item) => {
    const i = options.findIndex((o) => o.value === (by ? selectValue(by, x[by.id]) : undefined));
    return i < 0 ? options.length : i;
  };
  const sorted = [...items].sort((a, b) => rank(a) - rank(b));
  const lines = (rows: Item[]) => rows.map(line).join('\n');
  const groups = [...new Set(sorted.map(rank))];
  if (!by || groups.length === 1) return lines(sorted);
  return groups.map((g) => `**${options[g]?.label ?? phrasesOf(template).other}**\n\n${lines(sorted.filter((x) => rank(x) === g))}`).join('\n\n');
}

/** 把几句拼成一段：中文直接连，英文句间加空格 */
const joinSentences = (template: Template, bits: string[]): string => bits.filter(Boolean).join(template.language === 'en' ? ' ' : '');

/** 条目的开头：- **名称**（位置）： */
const entryHead = (P: ContentPhrases, name: string, where?: string): string => `- **${name}**${where ? P.paren(where) : ''}${P.colon}`;

/** 一样产出物的一行：放在哪、写什么、什么时候写、怎么改 */
function outputLine(template: Template, o: Item): string {
  const P = phrasesOf(template);
  const list = listDef(template, 'outputs');
  return (
    entryHead(P, String(o.name), `\`${text(o.path) || '—'}\``) +
    joinSentences(template, [
      text(o.format) ? P.sentence(text(o.format)) : '',
      text(o.when) ? `${P.whenWrite}${P.sentence(text(o.when))}` : '',
      P.sentence(optionLabel(list, 'write', o)),
      o.confirm === true ? P.confirmed : '',
    ])
  );
}

/** 一样东西怎么给到 agent：常驻（系统提示词或工具定义里）、按需读、按时机由系统插入、不给 agent */
export type LoadMode = 'resident' | 'on_demand' | 'timed' | 'hidden';
/** 为什么是这种加载方式，界面按它写成一句说明 */
export type LoadWhy =
  | 'field'
  | 'field_hidden'
  | 'index_body'
  | 'not_generated'
  | 'tool_definition'
  | 'platform_tool'
  | 'runtime'
  | 'memory_auto'
  | 'memory_on_demand'
  | 'output_in_skill'
  | 'output_listed'
  | 'reminder'
  | 'guarantee'
  | 'case';

/** 系统提示词里的一格 */
export const fieldLoad = (f: FieldDef): { mode: LoadMode; why: LoadWhy } => (f.prompt === false ? { mode: 'hidden', why: 'field_hidden' } : { mode: 'resident', why: 'field' });

/** 清单里的一项怎么给到 agent。和下面 compile 的生成规则一致 */
export function itemLoad(template: Template, def: AgentDef, kind: ListKind, item: Item): { mode: LoadMode; why: LoadWhy } {
  switch (kind) {
    case 'workflows':
      return text(item.steps) ? { mode: 'on_demand', why: 'index_body' } : { mode: 'hidden', why: 'not_generated' };
    case 'skills':
      return skillHasBody(template, item) ? { mode: 'on_demand', why: 'index_body' } : { mode: 'hidden', why: 'not_generated' };
    case 'knowledge':
    case 'helpers':
      return { mode: 'on_demand', why: 'index_body' };
    case 'tools':
      return { mode: 'resident', why: isOwnTool(item) ? 'tool_definition' : 'platform_tool' };
    case 'provided':
      return { mode: 'timed', why: 'runtime' };
    case 'memory':
      return item.load === 'on_demand' ? { mode: 'on_demand', why: 'memory_on_demand' } : { mode: 'timed', why: 'memory_auto' };
    case 'outputs':
      return outputsOf(template, def).includes(item) ? { mode: 'resident', why: 'output_listed' } : { mode: 'on_demand', why: 'output_in_skill' };
    case 'reminders':
      return { mode: 'timed', why: 'reminder' };
    case 'guarantees':
      return { mode: 'hidden', why: 'guarantee' };
    case 'cases':
      return { mode: 'hidden', why: 'case' };
  }
}

/** 选了某个 skill 的产出物写进那个 skill；没选、或选的 skill 不生成的，写进系统提示词 */
function outputsOf(template: Template, def: AgentDef, skillId?: string): Item[] {
  const generated = new Set(def.skills.filter((s) => skillHasBody(template, s)).map((s) => s.id));
  return def.outputs.filter((o) => text(o.name) && (skillId ? o.skill === skillId : !generated.has(String(o.skill ?? ''))));
}

/** 系统提示词里自动生成的正文（不含标题）。来源还没填时返回空串。 */
export function renderAuto(id: AutoId, template: Template, def: AgentDef): string {
  const P = phrasesOf(template);
  const S = P.sentence;
  const join = (bits: string[]) => joinSentences(template, bits);
  const named = (items: Item[]) => items.filter((x) => text(x.name));
  switch (id) {
    case 'guarantee_note': {
      // 规矩本身写在它该在的地方；这里只告诉 agent 有系统在拦，被拦下时怎么办
      if (!named(def.guarantees).length) return '';
      return P.guaranteeNote;
    }
    case 'insert_note': {
      const line = (x: Item) => `- **${x.name}**${text(x.explain) ? `${P.colon}${S(text(x.explain))}` : ''}`;
      const provided = named(def.provided);
      const each = provided.filter((x) => x.where !== 'session_start');
      const once = provided.filter((x) => x.where === 'session_start');
      const memory = autoMemory(def);
      const memorySection = template.prompt.sections.find((sec) => (sec.auto ?? []).some((a) => a.id === 'memory_list'))?.name ?? '';
      const parts: string[] = [];
      if (each.length) parts.push(`${P.perMessageHead(P.tag.insert)}\n\n${each.map(line).join('\n')}`);
      if (once.length) parts.push(`${P.onceHead(P.tag.insert)}\n\n${once.map(line).join('\n')}`);
      if (memory.length) parts.push(P.memoryNote(P.tag.memory, P.list(memory.map((m) => String(m.name))), memorySection));
      if (named(def.reminders).some((r) => text(r.text))) parts.push(P.reminderNote(P.tag.reminder));
      if (!parts.length) return '';
      return [P.insertIntro, ...parts].join('\n\n');
    }
    case 'workflow_index': {
      const flows = def.workflows.filter((w) => text(w.name) && text(w.steps));
      if (!flows.length) return '';
      const lines = flows.map((w) => `${entryHead(P, String(w.name), `\`workflows/${w.id}.md\``)}${S(text(w.when))}`);
      return `${P.workflowsLead}\n\n${lines.join('\n')}`;
    }
    case 'skill_index': {
      const skills = def.skills.filter((s) => skillHasBody(template, s));
      if (!skills.length) return '';
      const lines = skills.map((s) => `${entryHead(P, String(s.name), `\`${s.id}\``)}${skillDescription(template, s)}`);
      return `${P.skillsLead}\n\n${lines.join('\n')}`;
    }
    case 'knowledge_index': {
      const docs = def.knowledge.filter((k) => text(k.name) && knowledgeWhere(k));
      if (!docs.length) return '';
      const lines = docs.map((k) => {
        if (isInlineKnowledge(k)) return `${entryHead(P, String(k.name), `\`${knowledgeWhere(k)}\``)}${S(text(k.when))}`;
        return entryHead(P, String(k.name)) + join([S(text(k.when)), `${P.location}${S(knowledgeWhere(k))}`, text(k.source) ? `${P.source}${S(text(k.source))}` : '']);
      });
      return `${P.knowledgeLead}\n\n${lines.join('\n')}`;
    }
    case 'tool_notes': {
      const list = listDef(template, 'tools');
      const notes = named(def.tools).filter((t) => !isOwnTool(t) && (text(t.when) || text(t.usage)));
      if (!notes.length) return '';
      const lines = notes.map(
        (t) => entryHead(P, String(t.name), `\`${t.id}\``) + join([text(t.when) ? `${P.whenUse}${S(text(t.when))}` : '', text(t.usage) ? S(text(t.usage)) : '', `${P.effect}${S(optionLabel(list, 'effect', t))}`]),
      );
      return `${P.toolNotesLead}\n\n${lines.join('\n')}`;
    }
    case 'helper_list': {
      // 常驻的只有名字、能做什么、什么时候交给它；交代什么、交回什么、怎么检查在它的文件里
      const helpers = named(def.helpers);
      if (!helpers.length) return '';
      const lines = helpers.map(
        (h) => entryHead(P, String(h.name), `\`helpers/${h.id}.md\``) + join([S(text(h.purpose)), text(h.when) ? `${P.helper.when}${P.colon}${S(text(h.when))}` : '']),
      );
      return `${P.helpersLead}\n\n${lines.join('\n')}`;
    }
    case 'memory_list': {
      const items = named(def.memory);
      if (!items.length) return '';
      const auto = new Set(autoMemory(def));
      const line = (m: Item) =>
        entryHead(P, String(m.name), `\`${text(m.path) || '—'}\`${auto.has(m) ? P.autoLoaded : P.onDemand}`) +
        join([text(m.format) ? S(text(m.format)) : '', text(m.when) ? `${P.whenUpdate}${S(text(m.when))}` : '', text(m.write) ? S(text(m.write)) : '']);
      return groupedLines(template, 'memory', items, line);
    }
    case 'output_list': {
      const items = outputsOf(template, def);
      if (!items.length) return '';
      return groupedLines(template, 'outputs', items, (o) => outputLine(template, o));
    }
  }
}

/** 系统提示词的一节里，按顺序排好的内容块：人写的格子和自动生成的部分 */
export interface SectionBlock {
  kind: 'field' | 'auto';
  id: string;
  /** 二级标题；一节只有一块时没有 */
  heading?: string;
  content: string;
}

/** 一节里有内容的块。一节有两格以上要进系统提示词时，每块一个二级标题；否则都直接写在节标题下。 */
export function sectionBlocks(section: PromptSection, template: Template, def: AgentDef): SectionBlock[] {
  const fields = section.fields.filter((f) => f.prompt !== false);
  const titled = !section.opening && fields.length + (section.auto ?? []).length > 1;
  let blocks: SectionBlock[] = [
    ...fields.map((f) => ({ kind: 'field' as const, id: f.id, heading: f.label, content: text(def.prompt[f.id]) })),
    ...(section.auto ?? []).map((a) => ({ kind: 'auto' as const, id: a.id, heading: a.label, content: renderAuto(a.id, template, def) })),
  ];
  if (section.order) {
    const rank = (id: string) => (section.order!.includes(id) ? section.order!.indexOf(id) : section.order!.length);
    blocks = [...blocks].sort((x, y) => rank(x.id) - rank(y.id));
  }
  return blocks.filter((b) => b.content).map((b) => (titled ? b : { kind: b.kind, id: b.id, content: b.content }));
}

/** 系统提示词的一节。整节都没内容时返回空串。 */
export function renderSection(section: PromptSection, template: Template, def: AgentDef): string {
  const body = sectionBlocks(section, template, def)
    .map((b) => (b.heading ? `## ${b.heading}\n\n${b.content}` : b.content))
    .join('\n\n');
  if (!body) return '';
  return section.opening ? body : `# ${section.name}\n\n${body}`;
}

/** 整份系统提示词，按节分段 */
export function renderPrompt(template: Template, def: AgentDef): Segment[] {
  const segments: Segment[] = [];
  for (const section of template.prompt.sections) {
    const content = renderSection(section, template, def);
    if (content) segments.push({ heading: section.name, content, target: `section:${section.id}` });
  }
  return segments;
}

function renderSkill(template: Template, def: AgentDef, skill: Item): { main: string; reference?: string } {
  const P = phrasesOf(template);
  const front = YAML.stringify({ name: skill.id, description: skillDescription(template, skill) }, { lineWidth: 0 }).trimEnd();
  const parts = [`---\n${front}\n---`, `# ${skill.name}`];
  // 正文是整段 markdown，原样放进来；别的格子（如果大纲里还有）各成一节
  for (const f of listDef(template, 'skills').fields) {
    if (SKILL_HEAD.includes(f.id) || f.id === 'reference') continue;
    const v = text(skill[f.id]);
    if (v) parts.push(f.id === 'body' ? v : `## ${f.label}\n\n${v}`);
  }
  const outputs = outputsOf(template, def, skill.id);
  if (outputs.length) parts.push(`## ${P.skillOutputs}\n\n${outputs.map((o) => outputLine(template, o)).join('\n')}`);
  const reference = text(skill.reference);
  if (reference) parts.push(`## ${P.reference}\n\n${P.referenceLine}`);
  return {
    main: parts.join('\n\n') + '\n',
    reference: reference ? `# ${skill.name} · ${P.reference}\n\n${reference}\n` : undefined,
  };
}

/** 清单里一项的说明文件：每一格一节，标题用大纲里的栏目名。流程、帮手都这样生成 */
function renderEntry(template: Template, kind: 'workflows' | 'helpers', item: Item): string {
  const parts = [`# ${item.name}`];
  for (const f of listDef(template, kind).fields) {
    const v = text(item[f.id]);
    if (v) parts.push(`## ${f.label}\n\n${v}`);
  }
  return parts.join('\n\n') + '\n';
}

/** 一个工具的说明，写进工具定义的 description */
export function toolDescription(template: Template, tool: Item): string {
  const P = phrasesOf(template);
  const list = listDef(template, 'tools');
  const parts: string[] = [];
  if (text(tool.purpose)) parts.push(P.sentence(text(tool.purpose)));
  if (text(tool.when)) parts.push(`${P.whenUse}${P.sentence(text(tool.when))}`);
  for (const f of itemFields(list, tool)) {
    if (['purpose', 'when'].includes(f.id) || f.options) continue;
    const v = text(tool[f.id]);
    if (v) parts.push(`${f.label}${P.colon.trim()}\n${v}`);
  }
  parts.push(`${P.effect}${P.sentence(optionLabel(list, 'effect', tool))}`);
  return parts.join('\n\n');
}

function renderGuarantees(template: Template, def: AgentDef): string {
  const P = phrasesOf(template);
  const parts = [`# ${P.guarantees.title}`, P.guarantees.intro];
  const rules = def.guarantees.filter((g) => text(g.name));
  if (!rules.length) parts.push(P.none);
  for (const g of rules) parts.push(`## ${text(g.name)}\n\n${P.guarantees.how}${text(g.how) || P.notWritten}`);
  return parts.join('\n\n') + '\n';
}

function renderCases(template: Template, def: AgentDef): string {
  const P = phrasesOf(template);
  const parts = [`# ${P.cases.title}`, P.cases.intro];
  const cases = def.cases.filter((c) => text(c.name) || text(c.scenario));
  if (!cases.length) parts.push(P.none);
  for (const c of cases) {
    const lines = [`- ${P.cases.scenario}${text(c.scenario) || P.notWritten}`, `- ${P.cases.expected}${text(c.expected) || P.notWritten}`];
    if (text(c.check)) lines.push(`- ${P.cases.check}${text(c.check)}`);
    parts.push(`## ${text(c.name) || P.unnamed}\n\n${lines.join('\n')}`);
  }
  return parts.join('\n\n') + '\n';
}

/** 合成。uiLang：文件标题和问题提示用哪种语言（默认跟大纲一样） */
export function compile(template: Template, def: AgentDef, uiLang?: Lang): BuildResult {
  const P = phrasesOf(template);
  const U = UI[uiLang ?? template.language ?? 'zh'];
  const diags: Diagnostic[] = [];
  const files: OutputFile[] = [];
  const add = (path: string, group: FileGroup, title: string, content: string, target: string, segments?: Segment[]) => {
    files.push({
      path,
      group,
      title,
      content,
      tokens: group === 'hidden' ? 0 : estimateTokens(content),
      lines: countLines(content),
      target,
      ...(segments ? { segments } : {}),
    });
  };
  const usable = checkIds(template, def, diags, uiLang ?? template.language ?? 'zh');

  // 一开始就给：系统提示词
  const segments = renderPrompt(template, def);
  const prompt = segments.map((s) => s.content).join('\n\n');
  add(SYSTEM_PROMPT_FILE, 'start', U.title.systemPrompt, prompt ? prompt + '\n' : '', `section:${template.prompt.sections[0].id}`, segments);
  const promptTokens = files[0].tokens;
  if (promptTokens > template.budgets.system_prompt_tokens) {
    diags.push({ severity: 'warning', message: U.diag.promptTooLong(promptTokens, template.budgets.system_prompt_tokens) });
  }

  // 一开始就给：工具定义，由程序随请求交给模型（API 会把它们和系统提示词拼在一起）
  const tools = def.tools.filter((t) => usable.has(t) && isOwnTool(t));
  if (tools.length) {
    const definitions = tools.map((t) => ({ name: t.id, description: toolDescription(template, t), annotations: EFFECT_ANNOTATIONS[String(t.effect)] ?? EFFECT_ANNOTATIONS.read }));
    add(TOOLS_FILE, 'start', U.title.tools, JSON.stringify(definitions, null, 2) + '\n', 'part:tools');
  }

  // 选定后读：每个流程一份
  const workflows = def.workflows.filter((w) => usable.has(w) && text(w.steps));
  for (const w of workflows) add(`workflows/${w.id}.md`, 'on_demand', U.title.workflow(String(w.name)), renderEntry(template, 'workflows', w), `item:workflows:${w.id}`);

  // 派活前读：每个帮手一份说明
  const helpers = def.helpers.filter((h) => usable.has(h) && text(h.name));
  for (const h of helpers) add(`helpers/${h.id}.md`, 'on_demand', U.title.helper(String(h.name)), renderEntry(template, 'helpers', h), `item:helpers:${h.id}`);

  // 用到才加载：每个 skill 的正文
  const skills = def.skills.filter((s) => usable.has(s) && skillHasBody(template, s));
  for (const s of def.skills) {
    if (usable.has(s) && !skillHasBody(template, s)) {
      diags.push({ severity: 'warning', message: U.diag.skillNoBody(String(s.name)), target: `item:skills:${s.id}` });
    }
  }
  for (const s of skills) {
    const target = `item:skills:${s.id}`;
    const { main, reference } = renderSkill(template, def, s);
    add(`skills/${s.id}/SKILL.md`, 'on_demand', U.title.skill(String(s.name)), main, target);
    if (reference) add(`skills/${s.id}/reference.md`, 'on_demand', U.title.skillReference(String(s.name)), reference, target);
    const description = skillDescription(template, s);
    if (!description) diags.push({ severity: 'warning', message: U.diag.skillNoWhen(String(s.name)), target });
    if (description.length > template.budgets.skill_description_chars) {
      diags.push({ severity: 'warning', message: U.diag.skillDescTooLong(String(s.name), description.length, template.budgets.skill_description_chars), target });
    }
    const lines = countLines(main);
    const tokens = estimateTokens(main);
    if (lines > template.budgets.skill_lines || tokens > template.budgets.skill_tokens) {
      diags.push({ severity: 'warning', message: U.diag.skillTooLong(String(s.name), lines, tokens), target });
    }
  }

  // 系统插入消息：运行信息、自动加载的记忆
  const inserts = renderInsertions(template, def);
  if (inserts.perMessage || inserts.sessionStart || inserts.memory) {
    const parts = [`# ${P.insertFile.title}`, P.insertFile.intro];
    if (inserts.perMessage) parts.push(`## ${P.insertFile.perMessage}\n\n\`\`\`\n${inserts.perMessage}\n\`\`\``);
    const once = [inserts.sessionStart, inserts.memory].filter(Boolean).join('\n\n');
    if (once) parts.push(`## ${P.insertFile.once}\n\n\`\`\`\n${once}\n\`\`\``);
    add(INSERT_FILE, 'message', U.title.insert, parts.join('\n\n') + '\n', 'part:environment');
  }

  // 用到才加载：知识
  const knowledge = def.knowledge.filter((k) => usable.has(k) && knowledgeWhere(k));
  for (const k of knowledge.filter(isInlineKnowledge)) {
    const source = text(k.source) ? `> ${P.knowledgeSource}${text(k.source)}\n\n` : '';
    add(`knowledge/${k.id}.md`, 'on_demand', U.title.knowledge(String(k.name)), `# ${k.name}\n\n${source}${text(k.content)}\n`, `item:knowledge:${k.id}`);
  }

  // 到时机时插入：系统提醒
  const reminders = def.reminders.filter((r) => usable.has(r) && text(r.text));
  for (const r of reminders) add(`reminders/${r.id}.md`, 'situation', U.title.reminder(String(r.name)), renderReminder(template, r) + '\n', `item:reminders:${r.id}`);

  // 不给 agent 看
  add(GUARANTEES_FILE, 'hidden', U.title.guarantees, renderGuarantees(template, def), 'part:guarantees');
  add(CASES_FILE, 'hidden', U.title.cases, renderCases(template, def), 'part:cases');
  const manifest = {
    agent: text(def.config.name) || P.unnamed,
    language: template.language ?? 'zh',
    ...(text(def.config.description) ? { description: text(def.config.description) } : {}),
    ...(text(def.config.model) ? { model: text(def.config.model) } : {}),
    note: P.manifestNote,
    given_at_start: {
      system_prompt: SYSTEM_PROMPT_FILE,
      ...(tools.length ? { tools: TOOLS_FILE } : {}),
    },
    loaded_on_demand: {
      workflows: workflows.map((w) => ({ id: w.id, name: w.name, when: text(w.when), file: `workflows/${w.id}.md` })),
      helpers: helpers.map((h) => ({ id: h.id, name: h.name, file: `helpers/${h.id}.md` })),
      skills: skills.map((s) => ({
        id: s.id,
        name: s.name,
        description: skillDescription(template, s),
        file: `skills/${s.id}/SKILL.md`,
        ...(text(s.reference) ? { reference: `skills/${s.id}/reference.md` } : {}),
      })),
      knowledge: knowledge.map((k) => ({ id: k.id, name: k.name, when: text(k.when), [isInlineKnowledge(k) ? 'file' : 'location']: knowledgeWhere(k), ...(text(k.source) ? { source: text(k.source) } : {}) })),
    },
    injected_on_timing: {
      reminders: reminders.map((r) => ({ id: r.id, name: r.name, trigger: text(r.trigger), file: `reminders/${r.id}.md` })),
    },
    ...(def.tools.some((t) => text(t.name) && !isOwnTool(t)) ? { platform_tools: def.tools.filter((t) => text(t.name) && !isOwnTool(t)).map((t) => ({ name: t.id, source: t.source, effect: t.effect })) } : {}),
    memory: def.memory.filter((m) => text(m.name)),
    outputs: def.outputs.filter((o) => text(o.name)),
    provided_by_system: def.provided.filter((x) => text(x.name)),
    not_in_prompt: Object.fromEntries(template.prompt.sections.flatMap((sec) => sec.fields.filter((f) => f.prompt === false && text(def.prompt[f.id])).map((f) => [f.label, text(def.prompt[f.id])]))),
    not_for_agent: { guarantees: GUARANTEES_FILE, cases: CASES_FILE },
  };
  add(MANIFEST_FILE, 'hidden', U.title.manifest, YAML.stringify(manifest, { lineWidth: 0 }), `section:${template.prompt.sections[0].id}`);

  return { files, diagnostics: diags };
}

/** 检查标识：会成为文件名的要合规，同一清单里不能重复。返回可以生成文件的项。 */
function checkIds(template: Template, def: AgentDef, diags: Diagnostic[], uiLang: Lang): Set<Item> {
  const U = UI[uiLang];
  const usable = new Set<Item>();
  for (const kind of LIST_KINDS) {
    const seen = new Set<string>();
    for (const item of def[kind]) {
      const target = `item:${kind}:${item.id}`;
      const rule = ID_RULES[kind];
      if (!item.id) {
        const part = template.parts.find((p) => p.lists.includes(kind));
        diags.push({ severity: 'error', message: U.diag.noId(String(item.name ?? '')), ...(part ? { target: `part:${part.id}` } : {}) });
      } else if (seen.has(item.id)) {
        diags.push({ severity: 'error', message: U.diag.dupId(item.id), target });
      } else if (rule && !rule.pattern.test(item.id)) {
        diags.push({ severity: 'error', message: U.diag.badId(String(item.name), item.id, U.idRule[rule.rule]), target });
      } else if (kind === 'skills' && item.id.length > 64) {
        diags.push({ severity: 'error', message: U.diag.skillIdTooLong(String(item.name)), target });
      } else {
        usable.add(item);
      }
      seen.add(item.id);
    }
  }
  return usable;
}
