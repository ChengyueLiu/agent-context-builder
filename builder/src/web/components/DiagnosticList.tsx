import { CloseCircleFilled, WarningFilled } from '@ant-design/icons';
import { Empty, Flex, Typography } from 'antd';
import type { Diagnostic, Severity } from '../../core/types';

const ICON: Record<Severity, React.ReactNode> = {
  error: <CloseCircleFilled style={{ color: '#ff4d4f' }} />,
  warning: <WarningFilled style={{ color: '#faad14' }} />,
};

const RANK: Record<Severity, number> = { error: 0, warning: 1 };

interface Props {
  diagnostics: Diagnostic[];
  /** 去问题所在的位置 */
  onOpen: (target: string) => void;
}

export default function DiagnosticList({ diagnostics, onOpen }: Props) {
  if (!diagnostics.length) return <Empty description="没有发现问题" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  const sorted = [...diagnostics].sort((a, b) => RANK[a.severity] - RANK[b.severity]);
  return (
    <Flex vertical gap={12}>
      {sorted.map((d, i) => (
        <Flex key={i} gap={8} align="baseline">
          {ICON[d.severity]}
          <div>
            <Typography.Text>{d.message}</Typography.Text>
            {d.target && (
              <div>
                <Typography.Link onClick={() => onOpen(d.target!)} style={{ fontSize: 12 }}>
                  去看看
                </Typography.Link>
              </div>
            )}
          </div>
        </Flex>
      ))}
    </Flex>
  );
}
