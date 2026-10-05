// 读写一个 agent 的文件夹。只在 node 里用。
//
//   agent.yaml            名称（新建时填写）
//   system-prompt.yaml    系统提示词里人写的格子，按节分组
//   workflows.yaml        流程清单
//   skills.yaml           Skill
//   knowledge.yaml        知识
//   tools.yaml            工具
//   helpers.yaml          帮手
//   memory.yaml           记忆管理
//   outputs.yaml          产出物管理
//   reminders.yaml        自动提醒
//   guarantees.yaml       系统保证
//   provided.yaml         运行信息
//   cases.yaml            检验用例
//   build/                生成结果，每次整体重写

import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { MANIFEST_FILE } from './compile';
import { AppError, CONTENT, LANGS, type Lang } from './phrases';
import { contentLang, fieldPage, listDef, navPages, selectValue, text } from './outline';
export { contentLang };
import type { AgentDef, BuildResult, DefPatch, FieldDef, Item, ListDef, ListKind, Template } from './types';
import { AUTO_IDS, LIST_KINDS } from './types';

// 大纲在仓库根目录，builder 和以后的配置 agent 共用。中英文各一份，结构一样，只有文字不同
const TEMPLATE_FILES: Record<Lang, string> = {
  zh: fileURLToPath(new URL('../../../template/default.yaml', import.meta.url)),
  en: fileURLToPath(new URL('../../../template/default.en.yaml', import.meta.url)),
};
const DEFAULT_TEMPLATE = TEMPLATE_FILES.zh;

const CONFIG_FILE = 'agent.yaml';
const PROMPT_FILE = 'system-prompt.yaml';

/** 每种清单存在哪个文件 */
const LIST_FILES: Record<ListKind, string> = {
  workflows: 'workflows.yaml',
  skills: 'skills.yaml',
  knowledge: 'knowledge.yaml',
  tools: 'tools.yaml',
  helpers: 'helpers.yaml',
  memory: 'memory.yaml',
  outputs: 'outputs.yaml',
  cases: 'cases.yaml',
  reminders: 'reminders.yaml',
  guarantees: 'guarantees.yaml',
  provided: 'provided.yaml',
};

/** 两种语言的大纲。英文版还没有时，用中文版代替 */
export async function loadTemplates(): Promise<Record<Lang, Template>> {
  const zh = await loadTemplate(TEMPLATE_FILES.zh);
  const en = existsSync(TEMPLATE_FILES.en) ? await loadTemplate(TEMPLATE_FILES.en) : zh;
  const problems = shapeProblems(zh, en);
  if (problems.length) throw new Error(`中英文大纲的结构不一样：\n${problems.join('\n')}`);
  return { zh, en };
}

/** 大纲去掉文字后的骨架：id、类型、选项值、顺序、去处。两种语言的骨架必须一样 */
const TEXT_KEYS = new Set(['name', 'title', 'intro', 'label', 'covers', 'hint', 'example', 'preset', 'dest', 'item', 'name_label', 'id_hint', 'from', 'language']);
/** 预置项里这些格子存的是选项值或标识，两种语言必须一样；其余文字格子随语言不同 */
const DEFAULT_MACHINE_KEYS = new Set(['id', 'where', 'belongs', 'scope', 'load', 'kind', 'effect', 'source', 'form', 'skill']);
function shape(v: unknown, inDefaults = false): unknown {
  if (Array.isArray(v)) return v.map((x) => shape(x, inDefaults));
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) {
      if (inDefaults ? typeof x === 'string' && !DEFAULT_MACHINE_KEYS.has(k) : TEXT_KEYS.has(k)) continue;
      out[k] = shape(x, inDefaults || k === 'defaults');
    }
    return out;
  }
  return v;
}
export function shapeProblems(a: Template, b: Template): string[] {
  const problems: string[] = [];
  const walk = (x: unknown, y: unknown, at: string) => {
    if (problems.length > 20) return;
    if (Array.isArray(x) || Array.isArray(y)) {
      if (!Array.isArray(x) || !Array.isArray(y) || x.length !== y.length) return void problems.push(`${at}：长度不同`);
      x.forEach((v, i) => walk(v, y[i], `${at}[${i}]`));
    } else if (x && typeof x === 'object' && y && typeof y === 'object') {
      const keys = new Set([...Object.keys(x), ...Object.keys(y)]);
      for (const k of keys) walk((x as Record<string, unknown>)[k], (y as Record<string, unknown>)[k], `${at}.${k}`);
    } else if (x !== y) problems.push(`${at}：${JSON.stringify(x)} ≠ ${JSON.stringify(y)}`);
  };
  walk(shape(a), shape(b), 'template');
  return problems;
}

export async function loadTemplate(file = DEFAULT_TEMPLATE): Promise<Template> {
  const template = YAML.parse(await fs.readFile(file, 'utf8')) as Template;
  const problems = validateTemplate(template);
  if (problems.length) throw new Error(`大纲 ${file} 有问题：\n${problems.join('\n')}`);
  return template;
}

export function validateTemplate(template: Template): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const section of template.prompt?.sections ?? []) {
    for (const f of section.fields ?? []) {
      if (seen.has(f.id)) problems.push(`系统提示词里格子的 id 重复：${f.id}`);
      seen.add(f.id);
    }
    for (const a of section.auto ?? []) {
      if (!(AUTO_IDS as readonly string[]).includes(a.id)) problems.push(`不认识的自动内容：${a.id}`);
    }
  }
  for (const kind of LIST_KINDS) {
    if ((template.lists ?? []).filter((l) => l.kind === kind).length !== 1) problems.push(`清单 ${kind} 要定义且只定义一次`);
  }
  for (const list of template.lists ?? []) {
    if (list.placed_by) {
      const by = list.fields.find((f) => f.id === list.placed_by);
      if (!by?.options) problems.push(`清单 ${list.kind} 的 placed_by 要指向一个选择格`);
      for (const o of by?.options ?? []) {
        if (!(template.parts ?? []).some((p) => p.id === o.value && p.lists.includes(list.kind))) problems.push(`清单 ${list.kind} 的「${o.label}」不是放了这张清单的部分`);
      }
    }
    for (const f of list.fields ?? []) {
      if (f.type === 'ref' && !(LIST_KINDS as readonly string[]).includes(f.ref ?? '')) problems.push(`清单 ${list.kind} 的「${f.label}」：ref 要写一张清单`);
      for (const [id, v] of Object.entries(f.show_if ?? {})) {
        const by = list.fields.find((x) => x.id === id);
        if (!by?.options?.some((o) => o.value === v)) problems.push(`清单 ${list.kind} 的「${f.label}」：show_if 里的 ${id}=${v} 不是某个选择格的选项`);
      }
    }
  }
  const navItems = navPages(template.nav ?? []);
  const partIds = (template.parts ?? []).map((p) => p.id);
  const sectionIds = (template.prompt?.sections ?? []).map((s) => s.id);
  for (const id of navItems) {
    if (!partIds.includes(id) && !sectionIds.includes(id)) problems.push(`左侧目录里的「${id}」既不是某个部分，也不是系统提示词的某一节`);
  }
  for (const id of new Set([...partIds, ...navItems])) {
    const n = navItems.filter((x) => x === id).length;
    if (partIds.includes(id) && n !== 1) problems.push(`左侧目录里「${id}」要出现且只出现一次，现在是 ${n} 次`);
    if (n > 1) problems.push(`左侧目录里「${id}」出现了 ${n} 次`);
  }
  // 系统提示词里人写的每一格，都要在左侧目录的某一页上能填
  for (const section of template.prompt?.sections ?? []) {
    for (const f of section.fields ?? []) {
      if (!navItems.includes(fieldPage(section, f))) problems.push(`「${section.name} › ${f.label}」在左侧目录里找不到填写它的页面`);
    }
  }
  const placed = (template.parts ?? []).flatMap((p) => p.lists);
  for (const kind of LIST_KINDS) if (!placed.includes(kind)) problems.push(`清单 ${kind} 没有放进任何部分`);
  return problems;
}

export function emptyDef(): AgentDef {
  return { config: {}, prompt: {}, workflows: [], skills: [], knowledge: [], tools: [], helpers: [], memory: [], outputs: [], reminders: [], guarantees: [], provided: [], cases: [] };
}

function normalizeValue(field: FieldDef, v: unknown): string | boolean | undefined {
  if (field.type === 'switch') return v === true ? true : undefined;
  if (field.type === 'select') return selectValue(field, v);
  return text(v) || undefined;
}

function normalizeItem(list: ListDef, raw: unknown): Item {
  const r = (raw ?? {}) as Record<string, unknown>;
  const item: Item = { id: text(r.id), name: text(r.name) };
  for (const f of list.fields) {
    const v = normalizeValue(f, r[f.id]);
    if (v !== undefined) item[f.id] = v;
  }
  return item;
}

function normalizeFields(fields: FieldDef[], raw: unknown): Record<string, string> {
  const r = (raw ?? {}) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const f of fields) if (text(r[f.id])) out[f.id] = text(r[f.id]);
  return out;
}

/** 只保留大纲里有的格子，去掉空值。 */
export function normalizeDef(template: Template, raw: DefPatch): AgentDef {
  const def = emptyDef();
  def.config = normalizeFields(template.config.fields, raw.config);
  // 内容语言不在大纲的格子里，单独保留
  const language = (raw.config ?? {}).language;
  if (LANGS.includes(language as Lang)) def.config.language = language as string;
  def.prompt = normalizeFields(template.prompt.sections.flatMap((s) => s.fields), raw.prompt);
  for (const kind of LIST_KINDS) {
    const list = listDef(template, kind);
    def[kind] = (Array.isArray(raw[kind]) ? raw[kind]! : []).map((x) => normalizeItem(list, x));
  }
  return def;
}

async function readYaml(file: string): Promise<Record<string, unknown>> {
  if (!existsSync(file)) return {};
  return (YAML.parse(await fs.readFile(file, 'utf8')) ?? {}) as Record<string, unknown>;
}

export async function loadDef(root: string, template: Template): Promise<AgentDef> {
  const raw: DefPatch = {};
  raw.config = (await readYaml(path.join(root, CONFIG_FILE))) as Record<string, string>;
  // 系统提示词按节分组存放，读入时摊平
  const bySection = await readYaml(path.join(root, PROMPT_FILE));
  // 按格子的 id 读，不管存在哪一节下：节改名或格子换了节，内容不会丢
  raw.prompt = {};
  for (const group of Object.values(bySection)) if (group && typeof group === 'object') Object.assign(raw.prompt, group);
  for (const kind of LIST_KINDS) {
    const data = await readYaml(path.join(root, LIST_FILES[kind]));
    raw[kind] = (Array.isArray(data.items) ? data.items : []) as Item[];
  }
  return normalizeDef(template, raw);
}

const dump = (header: string, data: unknown) => `# ${header}\n\n${YAML.stringify(data, { lineWidth: 0 })}`;

export async function saveDef(root: string, template: Template, input: AgentDef): Promise<AgentDef> {
  const def = normalizeDef(template, input);
  const headers = CONTENT[contentLang(def)].files;
  await fs.mkdir(root, { recursive: true });
  await fs.writeFile(path.join(root, CONFIG_FILE), dump(headers.config, def.config), 'utf8');

  const bySection: Record<string, Record<string, string>> = {};
  for (const section of template.prompt.sections) {
    const fields = normalizeFields(section.fields, def.prompt);
    if (Object.keys(fields).length) bySection[section.id] = fields;
  }
  await fs.writeFile(path.join(root, PROMPT_FILE), dump(headers.prompt, bySection), 'utf8');

  for (const kind of LIST_KINDS) {
    await fs.writeFile(path.join(root, LIST_FILES[kind]), dump(headers.lists[kind], { items: def[kind] }), 'utf8');
  }
  return def;
}

/** 改一部分：名称和系统提示词按格子合并，清单整份替换。 */
export async function patchDef(root: string, template: Template, patch: DefPatch): Promise<AgentDef> {
  const def = await loadDef(root, template);
  if (patch.config) def.config = { ...def.config, ...patch.config };
  if (patch.prompt) def.prompt = { ...def.prompt, ...patch.prompt };
  for (const kind of LIST_KINDS) if (patch[kind]) def[kind] = patch[kind]!;
  return saveDef(root, template, def);
}

/** 新建 agent 时的内容：通用做法预填好，通用的记忆项和提醒预置好。 */
export function presetDef(template: Template, name: string): AgentDef {
  const def = emptyDef();
  def.config = { name, language: template.language ?? 'zh' };
  for (const section of template.prompt.sections) {
    for (const f of section.fields) if (f.preset) def.prompt[f.id] = f.preset;
  }
  for (const list of template.lists) def[list.kind] = (list.defaults ?? []).map((x) => ({ ...x }));
  return normalizeDef(template, def);
}

// ---------- 工作区：一个文件夹，里面每个子文件夹是一个 agent ----------

export interface AgentSummary {
  /** 文件夹名，也是网址里的标识 */
  id: string;
  name: string;
  description?: string;
}

const AGENT_ID = /^[^./\\][^/\\]*$/;

/** agent 文件夹的绝对路径；名字不合法时报错。 */
export function agentDir(workspace: string, id: string): string {
  if (!AGENT_ID.test(id) || id.includes('..')) throw new AppError('badName', [id]);
  return path.join(workspace, id);
}

export function isAgentDir(dir: string): boolean {
  return existsSync(path.join(dir, CONFIG_FILE));
}

export async function listAgents(workspace: string): Promise<AgentSummary[]> {
  const out: AgentSummary[] = [];
  if (!existsSync(workspace)) return out;
  for (const d of await fs.readdir(workspace, { withFileTypes: true })) {
    const dir = path.join(workspace, d.name);
    if (!d.isDirectory() || !isAgentDir(dir)) continue;
    let config: Record<string, unknown> = {};
    try {
      config = await readYaml(path.join(dir, CONFIG_FILE));
    } catch {
      // 配置文件坏了也列出来，打开时再报错
    }
    out.push({ id: d.name, name: text(config.name) || d.name, ...(text(config.description) ? { description: text(config.description) } : {}) });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

export async function createAgent(workspace: string, id: string, name: string, template: Template) {
  const dir = agentDir(workspace, id.trim());
  if (existsSync(dir)) throw new AppError('exists', [id]);
  await saveDef(dir, template, presetDef(template, name.trim() || id.trim()));
}

/**
 * 把生成结果写到 build/。build/ 整体重写；若它存在却不像是本工具生成的（没有 manifest.yaml），拒绝覆盖。
 */
export async function writeBuild(root: string, result: BuildResult) {
  const buildDir = path.join(root, 'build');
  if (existsSync(buildDir)) {
    const entries = await fs.readdir(buildDir);
    if (entries.length && !entries.includes(MANIFEST_FILE)) {
      throw new AppError('buildNotOurs', [buildDir]);
    }
    await fs.rm(buildDir, { recursive: true, force: true });
  }
  for (const f of result.files) {
    const abs = path.join(buildDir, f.path);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, f.content, 'utf8');
  }
}
