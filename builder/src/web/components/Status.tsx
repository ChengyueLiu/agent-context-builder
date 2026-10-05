import { Tag, Tooltip } from 'antd';
import type { Status } from '../../core/outline';

/** 一格的填写情况 */
export function SlotTag({ filled, required }: { filled: boolean; required?: boolean }) {
  if (filled) return <Tag color="green">已填</Tag>;
  return required ? <Tag color="orange">必填，未填</Tag> : <Tag>空</Tag>;
}

/** 几格里填了几格 */
export function CountTag({ status }: { status: Status }) {
  if (status.total === 0) return null;
  const done = status.filled === status.total;
  const tag = <Tag color={done ? 'green' : status.missingRequired.length ? 'orange' : undefined}>{done ? '已填完' : `已填 ${status.filled}/${status.total}`}</Tag>;
  return done ? tag : <Tooltip title={`还空着：${status.missing.join('、')}`}>{tag}</Tooltip>;
}
