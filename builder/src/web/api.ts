import type { AgentSummary } from '../core/project';
import type { AgentSpec, BuildResult, Card, CardInput, ProjectData } from '../core/types';

/** 服务端每次返回的完整状态：项目内容 + 最新的编译结果。 */
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
    saveAgent: (agent: AgentSpec) => call<ProjectPayload>('PUT', `${base}/agent`, agent),
    createCard: (input: CardInput) => call<{ card: Card; project: ProjectPayload }>('POST', `${base}/card`, input),
    saveCard: (card: Card) => call<{ card: Card; project: ProjectPayload }>('PUT', `${base}/card`, card),
    deleteCard: (path: string) => call<ProjectPayload>('DELETE', `${base}/card?path=${encodeURIComponent(path)}`),
    rebuild: () => call<ProjectPayload>('POST', `${base}/build`),
  };
}

export type AgentApi = ReturnType<typeof agentApi>;
