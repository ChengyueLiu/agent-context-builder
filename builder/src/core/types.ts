// 数据模型。纯类型，前后端共用。

export type FieldType = 'text' | 'line' | 'select' | 'switch' | 'ref';

/** 大纲里的一格。 */
export interface FieldDef {
  id: string;
  /** 栏目名。系统提示词里就是这一格的标题 */
  label: string;
  /** 这一格要写到哪几点（系统提示词）。只显示给写的人，不进文件 */
  covers?: string[];
  /** 在左侧目录哪一页上填（系统提示词的格子；默认是它所在那一节） */
  page?: string;
  /** false 表示不进系统提示词 */
  prompt?: boolean;
  hint?: string;
  example?: string;
  /** 新建 agent 时预填的通用内容 */
  preset?: string;
  required?: boolean;
  type?: FieldType;
  options?: { value: string; label: string }[];
  /** type 为 ref 时，选哪张清单里的一项；存的是那一项的标识，空着表示不选 */
  ref?: ListKind;
  /** （清单里的栏目）只在某个选择格取某个值时才填，比如 { form: 'inline' } */
  show_if?: Record<string, string>;
  /** 这一格生成到哪里（与所在部分不同时才写） */
  dest?: string;
}

export const AUTO_IDS = ['insert_note', 'skill_index', 'knowledge_index', 'tool_notes', 'helper_list', 'memory_list', 'output_list', 'guarantee_note'] as const;
export type AutoId = (typeof AUTO_IDS)[number];

/** 系统提示词里自动生成的一项：内容来自别的部分。 */
export interface AutoDef {
  id: AutoId;
  label: string;
  /** 来自哪个部分，给人看 */
  from: string;
  /** 来自哪个部分的 id，用于跳转 */
  from_part: string;
}

/** 系统提示词的一节。一节只有一格时，正文直接写在这一节的标题下；有几格时，每格是一个二级标题。 */
export interface PromptSection {
  id: string;
  name: string;
  intro: string;
  /** 在左侧目录和页面上的名字，不写就用 name（name 是系统提示词里的标题） */
  title?: string;
  /** 放在最开头，不加标题 */
  opening?: boolean;
  /** 人写的格子和自动内容在系统提示词里的先后，不写就是先格子后自动内容 */
  order?: string[];
  fields: FieldDef[];
  auto?: AutoDef[];
}

export const LIST_KINDS = ['skills', 'knowledge', 'tools', 'helpers', 'provided', 'memory', 'outputs', 'guarantees', 'reminders', 'cases'] as const;
export type ListKind = (typeof LIST_KINDS)[number];

/** 一种清单：每一项有哪些格子。 */
export interface ListDef {
  kind: ListKind;
  /** 一项叫什么，如「工具」 */
  item: string;
  /** 名称这一格的叫法，如「记什么」 */
  name_label: string;
  /** 标识是否由人填（skill、工具的标识会成为文件名） */
  needs_id?: boolean;
  id_hint?: string;
  /** 这一项生成到哪里 */
  dest: string;
  fields: FieldDef[];
  /** 新建 agent 时预置的项 */
  defaults?: Item[];
  /** 按哪个选择栏目分块显示，每个选项一块（空的也显示） */
  group_by?: string;
  /** 清单分散在几页上：这个选择栏目记着每项属于哪一页（部分的 id），每页只显示自己的 */
  placed_by?: string;
}

/** 大纲里系统提示词之外的一个部分，包含一种或几种清单。 */
export interface PartDef {
  id: string;
  name: string;
  intro: string;
  lists: ListKind[];
}

export interface Template {
  version: number;
  budgets: {
    system_prompt_tokens: number;
    skill_lines: number;
    skill_tokens: number;
    skill_description_chars: number;
  };
  config: { name: string; intro: string; dest: string; fields: FieldDef[] };
  prompt: { name: string; intro: string; dest: string; sections: PromptSection[] };
  parts: PartDef[];
  /** 左侧目录，从上到下 */
  nav: NavEntry[];
  lists: ListDef[];
}

/** 左侧目录的一组 */
export interface NavGroup {
  name: string;
  intro: string;
  items: NavEntry[];
}

/** 左侧目录的一项：一页（config、某个部分或系统提示词某一节的 id），或者一组 */
export type NavEntry = string | NavGroup;

/** 清单里的一项。除了标识和名称，其余格子按清单的定义。 */
export type Item = { id: string; name: string } & { [key: string]: string | boolean | undefined };

/** 一个 agent 的全部定义：大纲里每一格填的内容。 */
export interface AgentDef {
  config: Record<string, string>;
  /** 系统提示词里人写的格子，按格子的 id */
  prompt: Record<string, string>;
  skills: Item[];
  knowledge: Item[];
  tools: Item[];
  helpers: Item[];
  provided: Item[];
  memory: Item[];
  outputs: Item[];
  guarantees: Item[];
  reminders: Item[];
  cases: Item[];
}

export type DefPatch = Partial<AgentDef>;

export type Severity = 'error' | 'warning';

export interface Diagnostic {
  severity: Severity;
  message: string;
  /** 相关位置的路由键，便于跳转 */
  target?: string;
}

/** agent 什么时候拿到这个文件 */
export type FileGroup = 'start' | 'message' | 'on_demand' | 'situation' | 'hidden';

/** 文件里的一段，对应编写页的一个位置 */
export interface Segment {
  heading: string;
  content: string;
  target: string;
}

export interface OutputFile {
  /** 相对 build/ 的路径 */
  path: string;
  group: FileGroup;
  title: string;
  content: string;
  /** 进入 agent 上下文的估算 token；不给 agent 的文件为 0 */
  tokens: number;
  lines: number;
  /** 这个文件对应编写页的哪个位置 */
  target: string;
  segments?: Segment[];
}

export interface BuildResult {
  files: OutputFile[];
  diagnostics: Diagnostic[];
}

export interface ProjectData {
  root: string;
  template: Template;
  def: AgentDef;
}
