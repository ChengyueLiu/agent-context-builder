import { PlusOutlined } from '@ant-design/icons';
import { App, Button, Flex, Select } from 'antd';
import { useState } from 'react';
import type { Card, TemplateEntry } from '../../core/types';
import { SKELETON_KEYS } from '../../core/types';
import { isParamKind } from '../../core/when';
import { useAgentApi } from '../agentContext';
import type { ProjectPayload } from '../api';
import { editablePieces } from '../util';
import WhenPicker from './WhenPicker';

interface Props {
  project: ProjectPayload;
  /** 固定条目（在条目面板里新建），或固定条件（在条件分组里新建）；两者给一个。 */
  entry?: TemplateEntry;
  when?: string;
  onCreated: (card: Card, project: ProjectPayload) => void;
}

function defaultWhen(project: ProjectPayload, entry: TemplateEntry): string {
  const kind = entry.default_when;
  if (!isParamKind(kind)) return kind;
  const first = project.agent[SKELETON_KEYS[kind]][0];
  return first ? `${kind}:${first.id}` : 'always';
}

/** 新建卡片：选好条目和适用条件，建一张空卡片并打开它。 */
export default function NewCard({ project, entry, when, onCreated }: Props) {
  const { message } = App.useApp();
  const api = useAgentApi();
  const { template, agent } = project;
  const [entryId, setEntryId] = useState<string | undefined>(entry?.id);
  const [whenValue, setWhenValue] = useState<string>(when ?? (entry ? defaultWhen(project, entry) : 'always'));
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!entryId) return;
    setBusy(true);
    try {
      const res = await api.createCard({ entry: entryId, when: whenValue, body: '' });
      onCreated(res.card, res.project);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Flex gap={8} align="center" wrap>
      {!entry && (
        <Select
          style={{ width: 220 }}
          placeholder="选择条目"
          value={entryId}
          onChange={setEntryId}
          showSearch={{ optionFilterProp: 'label' }}
          options={editablePieces(template).map((p) => ({
            label: `${p.number} ${p.name}`,
            title: p.name,
            options: p.entries.map((e) => ({ label: e.name, value: e.id })),
          }))}
        />
      )}
      {!when && (
        <div style={{ width: 260 }}>
          <WhenPicker agent={agent} template={template} value={whenValue} onChange={setWhenValue} />
        </div>
      )}
      <Button type="primary" icon={<PlusOutlined />} disabled={!entryId} loading={busy} onClick={create}>
        新建卡片
      </Button>
    </Flex>
  );
}
