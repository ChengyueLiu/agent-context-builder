import { Form, Input, Select, Switch } from 'antd';
import type { ReactNode } from 'react';
import type { FieldDef } from '../../core/types';
import { useEditor } from '../agentContext';
import { useLang } from '../i18n';
import { anchorId } from '../util';

interface Props {
  field: FieldDef;
  /** 空框里的例子，用内容语言那份大纲的；不给就用 field 自己的 */
  example?: string;
  value: string | boolean | undefined;
  onChange: (v: string | boolean) => void;
}

/** 人写的一格：名字在上，内容在框里。写什么的提示在名字后面的问号里，例子是空框里的灰字。 */
export default function Slot({ field, example = field.example, value, onChange }: Props) {
  const { project } = useEditor();
  const { t } = useLang();
  const type = field.type ?? 'text';
  const placeholder = example ? t.example(example) : undefined;
  let control: ReactNode;
  if (type === 'text') {
    control = <Input.TextArea autoSize={{ minRows: 2 }} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
  } else if (type === 'line') {
    control = <Input value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
  } else if (type === 'ref') {
    const options = [{ value: '', label: t.none }, ...project.def[field.ref!].filter((x) => x.name).map((x) => ({ value: x.id, label: x.name }))];
    control = <Select value={String(value ?? '')} onChange={(v) => onChange(v)} options={options} />;
  } else if (type === 'select') {
    control = <Select value={String(value ?? field.options?.[0]?.value ?? '')} onChange={(v) => onChange(v)} options={field.options} />;
  } else {
    control = <Switch checked={value === true} onChange={(v) => onChange(v)} />;
  }
  return (
    <div id={anchorId(field.id)}>
      <Form.Item label={field.label} tooltip={field.hint} required={field.required}>
        {control}
      </Form.Item>
    </div>
  );
}
