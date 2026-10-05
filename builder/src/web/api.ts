import type { Lang } from '../core/phrases';
import type { AgentSummary } from '../core/store';
import type { BuildResult, DefPatch, ProjectData, Template } from '../core/types';

/** 服务端每次返回的完整状态：定义、两种语言的大纲、最新的生成结果。 */
export type ServerProject = ProjectData & { build: BuildResult; buildError?: string };

/** 编辑器里用的状态：template 是界面语言的大纲（标签、提示），contentTemplate 是内容语言的大纲（生成、例子） */
export type ProjectPayload = ServerProject & { template: Template; contentTemplate: Template };

/** 界面语言，随每个请求带给服务端，问题提示和出错信息按它写 */
let uiLang: Lang = 'zh';
export const setApiLang = (lang: Lang) => {
  uiLang = lang;
};

export type { AgentSummary };

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { 'x-lang': uiLang, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `${res.status} ${res.statusText}`);
  return data as T;
}

export const workspaceApi = {
  list: () => call<{ workspace: string; agents: AgentSummary[] }>('GET', '/api/agents'),
  create: (id: string, name: string, language: Lang) => call<{ workspace: string; agents: AgentSummary[] }>('POST', '/api/agents', { id, name, language }),
};

/** 某一个 agent 的读写接口 */
export function agentApi(id: string) {
  const base = `/api/agents/${encodeURIComponent(id)}`;
  return {
    project: () => call<ServerProject>('GET', `${base}/project`),
    /** 改一部分：名称和系统提示词按格子合并，清单整份替换 */
    patch: (patch: DefPatch) => call<ServerProject>('PUT', `${base}/def`, patch),
  };
}

export type AgentApi = ReturnType<typeof agentApi>;
