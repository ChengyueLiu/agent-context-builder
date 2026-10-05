import type { AgentSummary } from '../core/store';
import type { BuildResult, DefPatch, ProjectData } from '../core/types';

/** 服务端每次返回的完整状态：定义 + 最新的生成结果。 */
export type ProjectPayload = ProjectData & { build: BuildResult; buildError?: string };

export type { AgentSummary };

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `${res.status} ${res.statusText}`);
  return data as T;
}

export const workspaceApi = {
  list: () => call<{ workspace: string; agents: AgentSummary[] }>('GET', '/api/agents'),
  create: (id: string, name: string) => call<{ workspace: string; agents: AgentSummary[] }>('POST', '/api/agents', { id, name }),
};

/** 某一个 agent 的读写接口 */
export function agentApi(id: string) {
  const base = `/api/agents/${encodeURIComponent(id)}`;
  return {
    project: () => call<ProjectPayload>('GET', `${base}/project`),
    /** 改一部分：名称和系统提示词按格子合并，清单整份替换 */
    patch: (patch: DefPatch) => call<ProjectPayload>('PUT', `${base}/def`, patch),
  };
}

export type AgentApi = ReturnType<typeof agentApi>;
