import { createContext, useContext } from 'react';
import type { DefPatch } from '../core/types';
import type { AgentApi, ProjectPayload } from './api';
import type { Route } from './util';

/** 当前这一页有没有未保存的修改，以及怎么保存 */
export interface PageState {
  dirty: boolean;
  /** 保存成功返回 true */
  save?: () => Promise<boolean>;
}

interface EditorContextValue {
  api: AgentApi;
  project: ProjectPayload;
  /** 服务端返回新的状态后，更新整个编辑器 */
  setProject: (p: ProjectPayload) => void;
  /** 去另一个位置；当前页有未保存的修改时先问 */
  go: (r: Route) => void;
  /** 去另一个位置，不问。只在刚保存或刚删除之后用 */
  jump: (r: Route) => void;
  /** 当前页报告自己的保存状态 */
  setPage: (state: PageState) => void;
  /** 当前页还没保存的内容，右边的系统提示词先按它显示 */
  setLive: (patch: DefPatch | undefined) => void;
}

export const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('只能在打开某个 agent 之后使用');
  return ctx;
}
