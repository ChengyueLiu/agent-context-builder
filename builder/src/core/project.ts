// 读写一个 agent 项目文件夹。只在 node 里用。
//
// 项目布局
//   agent.yaml   骨架
//   context/     卡片，按件分文件夹
//   build/       编译产物，每次整体重写

import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import type { AgentSpec, BuildResult, Card, CardInput, Diagnostic, ProjectData, SkeletonItem, Template } from './types';
import { cardBaseName, CardParseError, parseCard, serializeCard } from './card';
import { indexTemplate, pieceDir, validateTemplate } from './template';
import { MANIFEST_FILE } from './route';

// 模板在仓库根目录，builder 和以后的配置 agent 共用
const DEFAULT_TEMPLATE = fileURLToPath(new URL('../../../template/default.yaml', import.meta.url));

const AGENT_HEADER = `# agent 的骨架：有哪些阶段、领域、工具、情形。卡片的适用条件引用这里的 id。
# 阶段和领域的 description 会成为 skill 的触发描述，agent 靠它判断何时加载；
# 工具的 description 是一句话说明；情形的 description 写何时触发。
`;

export async function loadTemplate(file = DEFAULT_TEMPLATE): Promise<Template> {
  const template = YAML.parse(await fs.readFile(file, 'utf8')) as Template;
  const problems = validateTemplate(template);
  if (problems.length) throw new Error(`模板 ${file} 有问题：\n${problems.join('\n')}`);
  return template;
}

function normalizeItems(raw: unknown): SkeletonItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => ({
    id: String(x?.id ?? '').trim(),
    name: String(x?.name ?? '').trim(),
    ...(x?.description ? { description: String(x.description).trim() } : {}),
  }));
}

export function normalizeAgent(raw: unknown): AgentSpec {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    name: String(r.name ?? '未命名 agent'),
    ...(r.description ? { description: String(r.description) } : {}),
    stages: normalizeItems(r.stages),
    domains: normalizeItems(r.domains),
    tools: normalizeItems(r.tools),
    situations: normalizeItems(r.situations),
  };
}

// ---------- 工作区：一个文件夹，里面每个子文件夹是一个 agent ----------

export interface AgentSummary {
  /** 文件夹名，也是网址里的标识 */
  id: string;
  name: string;
  description?: string;
  cards: number;
}

const AGENT_ID = /^[^./\\][^/\\]*$/;

/** agent 文件夹的绝对路径；id 不合法时报错。 */
export function agentDir(workspace: string, id: string): string {
  if (!AGENT_ID.test(id) || id.includes('..')) throw new Error(`不合法的 agent 名：${id}`);
  return path.join(workspace, id);
}

export function isAgentDir(dir: string): boolean {
  return existsSync(path.join(dir, 'agent.yaml'));
}

export async function listAgents(workspace: string): Promise<AgentSummary[]> {
  const out: AgentSummary[] = [];
  if (!existsSync(workspace)) return out;
  for (const d of await fs.readdir(workspace, { withFileTypes: true })) {
    const dir = path.join(workspace, d.name);
    if (!d.isDirectory() || !isAgentDir(dir)) continue;
    let agent: AgentSpec;
    try {
      agent = normalizeAgent(YAML.parse(await fs.readFile(path.join(dir, 'agent.yaml'), 'utf8')));
    } catch {
      agent = normalizeAgent({ name: d.name });
    }
    out.push({
      id: d.name,
      name: agent.name,
      ...(agent.description ? { description: agent.description } : {}),
      cards: (await listMarkdown(path.join(dir, 'context'))).length,
    });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

export async function createAgent(workspace: string, id: string, name: string) {
  const dir = agentDir(workspace, id.trim());
  if (existsSync(dir)) throw new Error(`已经有一个叫「${id}」的文件夹了`);
  await initProject(dir, name.trim() || id.trim());
}

export async function initProject(root: string, name: string) {
  await fs.mkdir(path.join(root, 'context'), { recursive: true });
  const agent: AgentSpec = { name, stages: [], domains: [], tools: [], situations: [] };
  await saveAgent(root, agent);
}

export async function loadProject(root: string, template: Template): Promise<ProjectData> {
  const agentFile = path.join(root, 'agent.yaml');
  const agent = normalizeAgent(YAML.parse(await fs.readFile(agentFile, 'utf8')));
  const cards: Card[] = [];
  const loadDiagnostics: Diagnostic[] = [];
  const contextDir = path.join(root, 'context');
  for (const abs of await listMarkdown(contextDir)) {
    const rel = toRel(root, abs);
    try {
      cards.push(parseCard(rel, await fs.readFile(abs, 'utf8')));
    } catch (e) {
      if (!(e instanceof CardParseError)) throw e;
      loadDiagnostics.push({ severity: 'error', message: `无法读取：${e.message}`, card: rel });
    }
  }
  cards.sort((a, b) => a.path.localeCompare(b.path));
  return { root, agent, template, cards, loadDiagnostics };
}

export async function saveAgent(root: string, agent: AgentSpec) {
  const clean = normalizeAgent(agent);
  await fs.writeFile(path.join(root, 'agent.yaml'), AGENT_HEADER + '\n' + YAML.stringify(clean, { lineWidth: 0 }), 'utf8');
}

/**
 * 保存卡片。文件名由条目和适用条件决定：改了条目或条件，文件会移到新的规范路径。
 * 返回保存后的卡片（含最终路径）。
 */
export async function saveCard(root: string, template: Template, input: CardInput): Promise<Card> {
  const ref = indexTemplate(template).get(input.entry);
  if (!ref) throw new Error(`条目「${input.entry}」不在模板里`);
  const dir = `context/${pieceDir(ref.piece)}`;
  const base = cardBaseName(input.entry, input.when);

  let target: string | undefined;
  if (input.path) {
    resolveInside(root, input.path);
    const current = input.path.replace(/\.md$/, '');
    const stem = current.slice(current.lastIndexOf('/') + 1);
    const sameDir = current.slice(0, current.lastIndexOf('/')) === dir;
    if (sameDir && (stem === base || new RegExp(`^${escapeRe(base)}-\\d+$`).test(stem))) target = input.path;
  }
  if (!target) target = await freePath(root, dir, base);

  const card: Card = { ...input, path: target };
  const abs = resolveInside(root, target);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, serializeCard(card), 'utf8');
  if (input.path && input.path !== target) await fs.rm(resolveInside(root, input.path), { force: true });
  return card;
}

export async function deleteCard(root: string, rel: string) {
  await fs.rm(resolveInside(root, rel));
}

/**
 * 把编译结果写到 build/。build/ 整体重写；若它存在却不像是本工具生成的（没有 manifest.yaml），拒绝覆盖。
 */
export async function writeBuild(root: string, result: BuildResult) {
  const buildDir = path.join(root, 'build');
  if (existsSync(buildDir)) {
    const entries = await fs.readdir(buildDir);
    if (entries.length && !entries.includes(MANIFEST_FILE)) {
      throw new Error(`${buildDir} 里已有不是本工具生成的文件，为避免误删，没有覆盖。请先移走它们。`);
    }
    await fs.rm(buildDir, { recursive: true, force: true });
  }
  for (const f of result.files) {
    const abs = path.join(buildDir, f.path);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, f.content, 'utf8');
  }
}

// ---------- 内部 ----------

async function freePath(root: string, dir: string, base: string): Promise<string> {
  for (let n = 1; ; n++) {
    const rel = `${dir}/${n === 1 ? base : `${base}-${n}`}.md`;
    if (!existsSync(resolveInside(root, rel))) return rel;
  }
}

/** 把相对路径解析成绝对路径，并确认它在项目的 context/ 里。 */
function resolveInside(root: string, rel: string): string {
  const contextDir = path.resolve(root, 'context');
  const abs = path.resolve(root, rel);
  if (!abs.startsWith(contextDir + path.sep) || !abs.endsWith('.md')) throw new Error(`非法的卡片路径：${rel}`);
  return abs;
}

async function listMarkdown(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const d of await fs.readdir(dir, { withFileTypes: true })) {
    const abs = path.join(dir, d.name);
    if (d.isDirectory()) out.push(...(await listMarkdown(abs)));
    else if (d.isFile() && d.name.endsWith('.md')) out.push(abs);
  }
  return out;
}

function toRel(root: string, abs: string): string {
  return path.relative(root, abs).split(path.sep).join('/');
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
