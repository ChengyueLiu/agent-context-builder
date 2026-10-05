// 数据模型。纯类型，前后端共用。

export type PhaseId = 'framework' | 'design' | 'deploy' | 'project' | 'runtime';
export type ConditionKind = 'always' | 'stage' | 'domain' | 'tool' | 'situation' | 'on_demand';

/** 带参数的条件种类：取值来自骨架里对应的列表。 */
export const PARAM_KINDS = ['stage', 'domain', 'tool', 'situation'] as const;
export type ParamKind = (typeof PARAM_KINDS)[number];

export interface TemplateEntry {
  id: string;
  name: string;
  hint: string;
  phase: PhaseId;
  default_when: ConditionKind;
  /** 输出里的小标题；false 表示不加。 */
  heading: string | false;
  attachment?: string;
  generated?: boolean;
}

export interface TemplatePiece {
  id: string;
  number: number;
  name: string;
  group: string;
  heading: string;
  /** 用途：这一类是干什么的 */
  purpose: string;
  /** 写作要点 */
  tips: string;
  /** 不属于这里：哪些内容该放到别的类别 */
  not_here: string;
  entries: TemplateEntry[];
}

export interface Template {
  version: number;
  budgets: {
    system_prompt_tokens: number;
    skill_lines: number;
    skill_tokens: number;
    skill_description_chars: number;
  };
  phases: Record<PhaseId, { name: string; editable: boolean; who: string }>;
  conditions: Record<ConditionKind, { name: string; place: string }>;
  groups: { id: string; name: string; question: string }[];
  pieces: TemplatePiece[];
}

/** 骨架里的一项：一个阶段、领域、工具或情形。 */
export interface SkeletonItem {
  id: string;
  name: string;
  /** 阶段、领域：skill 的触发描述；工具：一句话说明；情形：何时触发。 */
  description?: string;
}

/** agent.yaml：一个 agent 的骨架。 */
export interface AgentSpec {
  name: string;
  description?: string;
  stages: SkeletonItem[];
  domains: SkeletonItem[];
  tools: SkeletonItem[];
  situations: SkeletonItem[];
}

export const SKELETON_KEYS: Record<ParamKind, keyof Pick<AgentSpec, 'stages' | 'domains' | 'tools' | 'situations'>> = {
  stage: 'stages',
  domain: 'domains',
  tool: 'tools',
  situation: 'situations',
};

/** 一张卡片：一个条目在一个适用条件下的内容。 */
export interface Card {
  /** 相对项目根目录的路径，如 context/3-practice/stage_practice.stage-survey.md */
  path: string;
  entry: string;
  /** always、on_demand，或 stage:<id>、domain:<id>、tool:<id>、situation:<id> */
  when: string;
  /** 只给人看，用来区分同一条目下的多张卡片；资料类卡片的标题会成为文件名。 */
  title?: string;
  order?: number;
  /** 兜底的机制，硬性约束用，列进 mechanisms.md。 */
  mechanism?: string;
  /** 备注：只给维护的人看，不进 agent。给模型的理由写在正文里。 */
  note?: string;
  body: string;
  /** frontmatter 里本工具不认识的字段，原样保留。 */
  extra?: Record<string, unknown>;
}

/** 新建或保存卡片时前端传来的内容，path 由服务端决定。 */
export type CardInput = Omit<Card, 'path'> & { path?: string };

export type Severity = 'error' | 'warning';

export interface Diagnostic {
  severity: Severity;
  message: string;
  /** 相关卡片的路径，便于跳转。 */
  card?: string;
  /** 相关输出文件。 */
  file?: string;
}

export type PlaceKind = 'system_prompt' | 'skill' | 'tool' | 'reminder' | 'file' | 'index' | 'mechanisms' | 'manifest';

export interface OutputFile {
  /** 相对 build/ 的路径 */
  path: string;
  place: PlaceKind;
  content: string;
  /** 进入 agent 上下文的估算 token；不进上下文的文件为 0。 */
  tokens: number;
  lines: number;
  /** 贡献内容的卡片路径。 */
  sources: string[];
}

export interface Destination {
  /** 相对 build/ 的路径 */
  file: string;
  place: PlaceKind;
  /** 文件内的位置，给人看，如「做法 › 流程」 */
  section: string;
  /** 硬规则同时进机制清单 */
  alsoMechanisms?: boolean;
}

export interface BuildResult {
  files: OutputFile[];
  diagnostics: Diagnostic[];
}

export interface ProjectData {
  root: string;
  agent: AgentSpec;
  template: Template;
  cards: Card[];
  /** 读文件时发现的问题，如 frontmatter 解析失败。 */
  loadDiagnostics: Diagnostic[];
}
