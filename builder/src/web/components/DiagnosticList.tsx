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
  onOpenCard: (path: string) => void;
  onOpenFile: (file: string) => void;
}

export default function DiagnosticList({ diagnostics, onOpenCard, onOpenFile }: Props) {
  if (!diagnostics.length) return <Empty description="无" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  const sorted = [...diagnostics].sort((a, b) => RANK[a.severity] - RANK[b.severity]);
  return (
    <Flex vertical gap={8}>
      {sorted.map((d, i) => (
        <Flex key={i} gap={8} align="baseline">
          {ICON[d.severity]}
          <div>
            <Typography.Text>{d.message}</Typography.Text>
            {d.card && (
              <div>
                <Typography.Link onClick={() => onOpenCard(d.card!)} style={{ fontSize: 12 }}>
                  {d.card}
                </Typography.Link>
              </div>
            )}
            {!d.card && d.file && (
              <div>
                <Typography.Link onClick={() => onOpenFile(d.file!)} style={{ fontSize: 12 }}>
                  build/{d.file}
                </Typography.Link>
              </div>
            )}
          </div>
        </Flex>
      ))}
    </Flex>
  );
}
