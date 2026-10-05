import { Tag, Tooltip } from 'antd';
import type { LoadMode, LoadWhy } from '../../core/compile';
import { useLang } from '../i18n';

const COLOR: Record<LoadMode, string | undefined> = { resident: 'blue', on_demand: 'green', timed: 'orange', hidden: undefined };

/** 这样东西怎么给到 agent：常驻、按需、按时机、不给 agent。悬停看为什么 */
export default function LoadTag({ mode, why }: { mode: LoadMode; why: LoadWhy }) {
  const { t } = useLang();
  return (
    <Tooltip title={t.loadWhy[why]}>
      <Tag color={COLOR[mode]} style={{ margin: 0 }}>
        {t.load[mode]}
      </Tag>
    </Tooltip>
  );
}
