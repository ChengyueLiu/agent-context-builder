import { Tag, Tooltip } from 'antd';
import type { Status } from '../../core/outline';
import { useLang } from '../i18n';

/** 一格的填写情况 */
export function SlotTag({ filled, required }: { filled: boolean; required?: boolean }) {
  const { t } = useLang();
  if (filled) return <Tag color="green">{t.filled}</Tag>;
  return required ? <Tag color="orange">{t.requiredEmpty}</Tag> : <Tag>{t.blank}</Tag>;
}

/** 几格里填了几格 */
export function CountTag({ status }: { status: Status }) {
  const { t } = useLang();
  if (status.total === 0) return null;
  const done = status.filled === status.total;
  const tag = <Tag color={done ? 'green' : status.missingRequired.length ? 'orange' : undefined}>{done ? t.allFilled : t.filledOf(status.filled, status.total)}</Tag>;
  return done ? tag : <Tooltip title={t.stillEmpty(status.missing)}>{tag}</Tooltip>;
}
