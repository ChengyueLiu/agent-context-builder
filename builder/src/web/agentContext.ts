import { createContext, useContext } from 'react';
import type { AgentApi } from './api';

/** 当前打开的 agent 的读写接口，编辑器里的组件都从这里取。 */
export const AgentApiContext = createContext<AgentApi | null>(null);

export function useAgentApi(): AgentApi {
  const api = useContext(AgentApiContext);
  if (!api) throw new Error('useAgentApi 必须在打开某个 agent 之后使用');
  return api;
}
