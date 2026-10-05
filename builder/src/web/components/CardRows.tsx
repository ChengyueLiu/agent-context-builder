import { Empty, Flex, Typography } from 'antd';
import { indexTemplate } from '../../core/template';
import type { Card } from '../../core/types';
import { whenLabel } from '../../core/when';
import type { ProjectPayload } from '../api';
import { firstLine } from '../util';

interface Props {
  project: ProjectPayload;
  cards: Card[];
  /** 主标签显示什么：适用条件（条目面板里）或条目名（适用条件分组里） */
  label: 'when' | 'entry';
  onOpen: (path: string) => void;
}

/** 卡片列表，点一行打开。 */
export default function CardRows({ project, cards, label, onOpen }: Props) {
  if (!cards.length) return <Empty description="暂无卡片" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  const refs = indexTemplate(project.template);
  return (
    <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0' }}>
      {cards.map((c) => (
        <a key={c.path} className="row-link" onClick={() => onOpen(c.path)}>
          <Flex gap={8} align="center">
            <Typography.Text strong>
              {label === 'when' ? whenLabel(c.when, project.agent, project.template) : (refs.get(c.entry)?.entry.name ?? c.entry)}
            </Typography.Text>
            {c.title && <Typography.Text type="secondary">{c.title}</Typography.Text>}
          </Flex>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            {firstLine(c.body)}
          </Typography.Text>
        </a>
      ))}
    </div>
  );
}
