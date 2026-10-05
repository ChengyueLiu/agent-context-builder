import { Input } from 'antd';
import type { ReactNode } from 'react';
import type { FieldDef } from '../../core/types';
import { anchorId } from '../util';
import { Help } from './Page';
import type { Values } from './useDraft';

/** 提示：这一节写什么，这一格要写到哪几点 */
export function covers(intro: string | undefined, points: string[] | undefined): ReactNode {
  if (!intro && !points?.length) return undefined;
  return (
    <div>
      {intro && <div>{intro}</div>}
      {points?.length ? (
        <>
          <div style={{ marginTop: intro ? 6 : 0 }}>要写到：</div>
          <ul style={{ margin: 0, paddingInlineStart: 18 }}>
            {points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

/** 一页上的格子有两格以上时，每格各有标题；只有一格时，格子的提示放在页面或卡片的标题上 */
export const titled = (fields: FieldDef[]) => fields.length > 1;

/** 标题上的问号要显示什么：说明，加上（只有一格时）这一格要写到的几点 */
export const headerHelp = (intro: string | undefined, fields: FieldDef[]) => covers(intro, titled(fields) ? undefined : fields[0]?.covers);

interface Props {
  fields: FieldDef[];
  draft: Values;
  set: (id: string, v: string) => void;
}

/** 系统提示词里人写的格子：标题（两格以上时）和填写的框 */
export default function PromptFields({ fields, draft, set }: Props) {
  const box = (f: FieldDef) => (
    <div key={f.id} id={anchorId(f.id)} className="prompt-block">
      {titled(fields) && (
        <div className="prompt-block-title">
          {f.label}
          {f.prompt === false && <span className="prompt-block-note">不进系统提示词</span>}
          <Help text={covers(undefined, f.covers)} />
        </div>
      )}
      <Input.TextArea
        autoSize={{ minRows: 3 }}
        value={String(draft[f.id] ?? '')}
        onChange={(e) => set(f.id, e.target.value)}
        placeholder={f.example ? `例：${f.example}` : undefined}
      />
    </div>
  );
  return <>{fields.map(box)}</>;
}

/** 这些格子的草稿和保存时要提交的内容 */
export function promptValues(fields: FieldDef[], prompt: Record<string, string>): Values {
  const out: Values = {};
  for (const f of fields) out[f.id] = prompt[f.id];
  return out;
}

export function promptPatch(fields: FieldDef[], draft: Values): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) out[f.id] = String(draft[f.id] ?? '');
  return out;
}
