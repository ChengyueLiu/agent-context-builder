import { Cascader } from 'antd';
import type { AgentSpec, Template } from '../../core/types';
import { SKELETON_KEYS } from '../../core/types';
import { ALL_KINDS, isParamKind, parseWhen } from '../../core/when';

interface Props {
  agent: AgentSpec;
  template: Template;
  value: string;
  onChange: (when: string) => void;
}

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
  children?: Option[];
}

/** 选适用条件：全部 / 某个阶段 / 某个领域 / 某个工具 / 某种情形 / 需要时查阅 */
export default function WhenPicker({ agent, template, value, onChange }: Props) {
  const options: Option[] = ALL_KINDS.map((kind) => {
    const c = template.conditions[kind];
    const label = `${c.name} → ${c.place}`;
    if (!isParamKind(kind)) return { value: kind, label };
    const items = agent[SKELETON_KEYS[kind]];
    return {
      value: kind,
      label: items.length ? label : `${label}（骨架里还没有）`,
      disabled: !items.length,
      children: items.map((it) => ({ value: it.id, label: it.name || it.id })),
    };
  });
  const w = parseWhen(value);
  const cascaderValue = w ? (w.value ? [w.kind, w.value] : [w.kind]) : [];

  return (
    <Cascader
      style={{ width: '100%' }}
      options={options}
      value={cascaderValue}
      allowClear={false}
      expandTrigger="hover"
      displayRender={(labels) => labels.map((l) => String(l).split(' → ')[0]).join(' · ')}
      onChange={(v) => {
        const [kind, id] = (v ?? []) as string[];
        if (!kind) return;
        onChange(id ? `${kind}:${id}` : kind);
      }}
    />
  );
}
