// 编译：把按意义组织的卡片，拼成按加载方式组织的文件。纯函数，不碰磁盘。

import YAML from 'yaml';
import type { AgentSpec, BuildResult, Card, Diagnostic, OutputFile, PlaceKind, SkeletonItem, Template } from './types';
import { SKELETON_KEYS } from './types';
import { indexTemplate, isEditable, type EntryRef } from './template';
import {
  destinationOf,
  FILES_INDEX,
  MANIFEST_FILE,
  MECHANISMS_FILE,
  SYSTEM_PROMPT_FILE,
  skillName,
} from './route';
import { isParamKind, parseWhen, skeletonItem } from './when';
import { countLines, estimateTokens } from './tokens';

interface Placed {
  card: Card;
  ref: EntryRef;
}

const KIND_NAME = { stage: '阶段', domain: '领域', tool: '工具', situation: '情形' } as const;

/** 进入 agent 上下文的地方才计 token */
const IN_CONTEXT: PlaceKind[] = ['system_prompt', 'skill', 'tool', 'reminder', 'file', 'index'];

export function compile(template: Template, agent: AgentSpec, cards: Card[]): BuildResult {
  const refs = indexTemplate(template);
  const diags: Diagnostic[] = [];
  checkSkeleton(agent, diags);

  // 1. 校验每张卡片，按去向分桶
  const buckets = new Map<string, Placed[]>();
  const hardRules: Placed[] = [];
  for (const card of cards) {
    const ref = refs.get(card.entry);
    if (!ref) {
      diags.push({ severity: 'error', message: `条目「${card.entry || '（空）'}」不在模板里，未编译`, card: card.path });
      continue;
    }
    const w = parseWhen(card.when);
    if (!w) {
      diags.push({ severity: 'error', message: `适用条件「${card.when}」无法识别，未编译`, card: card.path });
      continue;
    }
    if (isParamKind(w.kind) && !skeletonItem(agent, w.kind, w.value!)) {
      diags.push({
        severity: 'error',
        message: `适用条件引用的${KIND_NAME[w.kind]}「${w.value}」在骨架里不存在，未编译`,
        card: card.path,
      });
      continue;
    }
    if (!isEditable(template, ref.entry)) {
      diags.push({ severity: 'warning', message: `「${ref.entry.name}」不是由开发者编写的条目，未编译`, card: card.path });
      continue;
    }
    // 正文为空的卡片不编译，也不算问题
    if (!card.body.trim()) continue;
    const dest = destinationOf(card, refs, agent)!;
    const placed = { card, ref };
    if (!buckets.has(dest.file)) buckets.set(dest.file, []);
    buckets.get(dest.file)!.push(placed);
    if (dest.alsoMechanisms) hardRules.push(placed);
  }
  for (const list of buckets.values()) list.sort(byTemplateOrder);
  hardRules.sort(byTemplateOrder);

  const files: OutputFile[] = [];
  const add = (path: string, place: PlaceKind, content: string, sources: string[]) => {
    files.push({
      path,
      place,
      content,
      tokens: IN_CONTEXT.includes(place) ? estimateTokens(content) : 0,
      lines: countLines(content),
      sources,
    });
  };
  const take = (path: string) => buckets.get(path) ?? [];

  // 2. 系统提示词
  const sp = take(SYSTEM_PROMPT_FILE);
  add(SYSTEM_PROMPT_FILE, 'system_prompt', renderSystemPrompt(sp), paths(sp));

  // 3. skill：每个阶段、每个领域一个
  const skillsManifest: unknown[] = [];
  for (const kind of ['stage', 'domain'] as const) {
    for (const item of agent[SKELETON_KEYS[kind]]) {
      const name = skillName(kind, item.id);
      const dir = `skills/${name}`;
      const all = [...buckets.entries()].filter(([f]) => f.startsWith(`${dir}/`)).flatMap(([, l]) => l);
      if (!all.length) continue;
      const main = take(`${dir}/SKILL.md`);
      const attachments = new Map<string, Placed[]>();
      for (const p of all) {
        const a = p.ref.entry.attachment;
        if (a) attachments.set(a, [...(attachments.get(a) ?? []), p]);
      }
      const attachmentFiles: string[] = [];
      const links: string[] = [];
      for (const [a, list] of attachments) {
        const file = `${dir}/${a}.md`;
        const heading = list[0].ref.entry.heading || list[0].ref.entry.name;
        add(file, 'skill', `# ${item.name} · ${heading}\n\n${joinBodies(list)}\n`, paths(list));
        attachmentFiles.push(file);
        links.push(`## ${heading}\n\n见同目录下的 [${a}.md](${a}.md)。`);
      }
      const skillFile = `${dir}/SKILL.md`;
      const content = renderSkill(name, item, main, links);
      add(skillFile, 'skill', content, paths(main));
      checkSkill(template, kind, item, skillFile, content, diags);
      skillsManifest.push({
        name,
        kind,
        title: item.name,
        description: item.description ?? '',
        file: skillFile,
        ...(attachmentFiles.length ? { attachments: attachmentFiles } : {}),
        load: 'on_trigger',
      });
    }
  }

  // 4. 工具描述：骨架里的每个工具一个
  const toolsManifest: unknown[] = [];
  for (const tool of agent.tools) {
    const file = `tools/${tool.id}.md`;
    // 工具描述先说它是什么（事实组），再说怎么用（规则组）
    const list = [...take(file)].sort((a, b) => factsFirst(a) - factsFirst(b) || byTemplateOrder(a, b));
    const head = `# ${tool.name}（\`${tool.id}\`）\n\n${tool.description ? `${tool.description.trim()}\n\n` : ''}`;
    add(file, 'tool', `${head}${renderEntries(list, '##')}`.trimEnd() + '\n', paths(list));
    toolsManifest.push({ id: tool.id, name: tool.name, file, load: 'with_tool' });
  }

  // 5. 运行时提醒：每个情形一个
  const remindersManifest: unknown[] = [];
  for (const s of agent.situations) {
    const file = `reminders/${s.id}.md`;
    const list = take(file);
    if (!list.length) continue;
    add(file, 'reminder', `${joinBodies(list)}\n`, paths(list));
    remindersManifest.push({ id: s.id, name: s.name, trigger: s.description ?? '', file, load: 'on_situation' });
  }

  // 6. 需要时查阅的文件与常驻索引
  const fileItems: { file: string; title: string; entry: string; card: string }[] = [];
  const used = new Set<string>();
  for (const [file, list] of [...buckets.entries()].filter(([f]) => f.startsWith('files/'))) {
    for (const p of list) {
      let target = file;
      for (let n = 2; used.has(target); n++) target = file.replace(/\.md$/, `-${n}.md`);
      if (target !== file) {
        diags.push({ severity: 'warning', message: `资料文件名重复，改名为 ${target}；给卡片起个不同的标题可以避免`, card: p.card.path });
      }
      used.add(target);
      const title = p.card.title || p.ref.entry.name;
      add(target, 'file', `# ${title}\n\n${p.card.body.trim()}\n`, [p.card.path]);
      fileItems.push({ file: target, title, entry: p.ref.entry.name, card: p.card.path });
    }
  }
  if (fileItems.length) {
    const lines = fileItems.map((f) => `- [${f.title}](${f.file.slice('files/'.length)})：${f.entry}`);
    const index = `# 资料索引\n\n以下资料不常驻，需要时读取对应文件。\n\n${lines.join('\n')}\n`;
    add(FILES_INDEX, 'index', index, fileItems.map((f) => f.card));
  }

  // 7. 机制清单：给工程实现看，不进上下文
  add(MECHANISMS_FILE, 'mechanisms', renderMechanisms(hardRules), paths(hardRules));

  // 8. 清单：告诉任何 harness 每个文件是什么、何时加载
  const spFile = files.find((f) => f.path === SYSTEM_PROMPT_FILE)!;
  const manifest = {
    agent: agent.name,
    ...(agent.description ? { description: agent.description } : {}),
    note: '本目录由 agent-context-builder 编译生成，不要手改。改 context/ 里的卡片后重新编译。',
    system_prompt: { file: SYSTEM_PROMPT_FILE, load: 'always', tokens: spFile.tokens },
    skills: skillsManifest,
    tools: toolsManifest,
    reminders: remindersManifest,
    files: fileItems.length
      ? { index: { file: FILES_INDEX, load: 'always' }, items: fileItems.map((f) => ({ file: f.file, title: f.title, load: 'on_demand' })) }
      : { items: [] },
    mechanisms: MECHANISMS_FILE,
    sources: Object.fromEntries(files.filter((f) => f.sources.length).map((f) => [f.path, f.sources])),
  };
  add(MANIFEST_FILE, 'manifest', YAML.stringify(manifest, { lineWidth: 0 }), []);

  if (spFile.tokens > template.budgets.system_prompt_tokens) {
    diags.push({
      severity: 'warning',
      message: `系统提示词约 ${spFile.tokens} token，超过建议上限 ${template.budgets.system_prompt_tokens}。常驻内容越少越好，按阶段才用的可以挪进 skill`,
      file: SYSTEM_PROMPT_FILE,
    });
  }

  return { files, diagnostics: diags };
}

// ---------- 渲染 ----------

function byTemplateOrder(a: Placed, b: Placed): number {
  return a.ref.index - b.ref.index || (a.card.order ?? 0) - (b.card.order ?? 0) || a.card.path.localeCompare(b.card.path);
}

function factsFirst(p: Placed): number {
  return p.ref.piece.group === 'facts' ? 0 : 1;
}

function paths(list: Placed[]): string[] {
  return list.map((p) => p.card.path);
}

function joinBodies(list: Placed[]): string {
  return list.map((p) => p.card.body.trim()).join('\n\n');
}

/** 按条目分组输出，每组一个小标题（heading 为 false 的不加） */
function renderEntries(list: Placed[], level: string): string {
  const out: string[] = [];
  let i = 0;
  while (i < list.length) {
    const entry = list[i].ref.entry;
    const group: Placed[] = [];
    while (i < list.length && list[i].ref.entry.id === entry.id) group.push(list[i++]);
    if (entry.attachment) continue;
    out.push(entry.heading ? `${level} ${entry.heading}\n\n${joinBodies(group)}` : joinBodies(group));
  }
  return out.length ? out.join('\n\n') + '\n' : '';
}

function renderSystemPrompt(list: Placed[]): string {
  const out: string[] = [];
  let i = 0;
  while (i < list.length) {
    const piece = list[i].ref.piece;
    const group: Placed[] = [];
    while (i < list.length && list[i].ref.piece.id === piece.id) group.push(list[i++]);
    out.push(`# ${piece.heading}\n\n${renderEntries(group, '##').trimEnd()}`);
  }
  return out.length ? out.join('\n\n') + '\n' : '';
}

function renderSkill(name: string, item: SkeletonItem, main: Placed[], links: string[]): string {
  const front = YAML.stringify({ name, description: item.description ?? '' }, { lineWidth: 0 }).trimEnd();
  const parts = [`---\n${front}\n---`, `# ${item.name}`];
  const body = renderEntries(main, '##').trimEnd();
  if (body) parts.push(body);
  parts.push(...links);
  return parts.join('\n\n') + '\n';
}

function renderMechanisms(list: Placed[]): string {
  const parts = [
    '# 硬性约束与兜底机制',
    '本文件给工程实现看，不进 agent 上下文。硬性约束写进提示词只是引导，每条还要有一个机制兜底：权限、沙箱、hook、只读、自动校验。',
  ];
  if (!list.length) parts.push('（暂无硬性约束）');
  for (const { card, ref } of list) {
    const quoted = card.body.trim().split('\n').map((l) => `> ${l}`.trimEnd()).join('\n');
    const mech = card.mechanism?.trim();
    parts.push(
      `## ${ref.entry.name}${card.title ? ` · ${card.title}` : ''}\n\n${quoted}\n\n- 机制：${mech || '⚠ 尚无机制'}\n- 卡片：\`${card.path}\``,
    );
  }
  return parts.join('\n\n') + '\n';
}

// ---------- 检查 ----------

function checkSkeleton(agent: AgentSpec, diags: Diagnostic[]) {
  for (const kind of ['stage', 'domain', 'tool', 'situation'] as const) {
    const seen = new Set<string>();
    for (const item of agent[SKELETON_KEYS[kind]]) {
      const label = `${KIND_NAME[kind]}「${item.name || item.id}」`;
      if (!item.id) {
        diags.push({ severity: 'error', message: `骨架里有${KIND_NAME[kind]}没有 id` });
        continue;
      }
      if (seen.has(item.id)) diags.push({ severity: 'error', message: `骨架里${KIND_NAME[kind]}的 id 重复：${item.id}` });
      seen.add(item.id);
      if (!item.name) diags.push({ severity: 'warning', message: `骨架里${KIND_NAME[kind]}「${item.id}」没有名称` });
      const skillLike = kind === 'stage' || kind === 'domain';
      const pattern = skillLike ? /^[a-z0-9]+(?:-[a-z0-9]+)*$/ : /^[A-Za-z0-9_-]+$/;
      if (!pattern.test(item.id)) {
        diags.push({
          severity: 'warning',
          message: skillLike
            ? `${label}的 id「${item.id}」会成为 skill 名，只能用小写字母、数字和连字符`
            : `${label}的 id「${item.id}」只能用字母、数字、下划线和连字符`,
        });
      }
    }
  }
}

function checkSkill(template: Template, kind: 'stage' | 'domain', item: SkeletonItem, file: string, content: string, diags: Diagnostic[]) {
  const label = `${KIND_NAME[kind]}「${item.name}」`;
  const desc = item.description?.trim() ?? '';
  if (!desc) {
    diags.push({ severity: 'warning', message: `${label}没有描述。skill 目录里只有描述，agent 靠它判断何时加载`, file });
  } else if (desc.length > template.budgets.skill_description_chars) {
    diags.push({ severity: 'warning', message: `${label}的描述 ${desc.length} 字符，超过上限 ${template.budgets.skill_description_chars}`, file });
  }
  const lines = countLines(content);
  if (lines > template.budgets.skill_lines) {
    diags.push({ severity: 'warning', message: `${file} 有 ${lines} 行，超过建议的 ${template.budgets.skill_lines} 行。可以把细节拆到附件`, file });
  }
  const tokens = estimateTokens(content);
  if (tokens > template.budgets.skill_tokens) {
    diags.push({ severity: 'warning', message: `${file} 约 ${tokens} token，超过建议的 ${template.budgets.skill_tokens}。可以把细节拆到附件`, file });
  }
  const name = skillName(kind, item.id);
  if (name.length > 64) {
    diags.push({ severity: 'warning', message: `skill 名「${name}」超过 64 个字符，${label}的 id 要短一些`, file });
  }
}
