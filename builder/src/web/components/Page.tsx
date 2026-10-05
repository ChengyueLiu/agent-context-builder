import { QuestionCircleOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { theme, Tooltip, Typography } from 'antd';
import type { ReactNode } from 'react';

/** 名字后面的问号：写什么的提示，鼠标移上去才显示 */
export function Help({ text }: { text?: ReactNode }) {
  const { token } = theme.useToken();
  if (!text) return null;
  return (
    <Tooltip title={text} styles={{ root: { maxWidth: 420 } }}>
      <QuestionCircleOutlined style={{ marginInlineStart: 6, fontSize: token.fontSize, color: token.colorTextDescription, cursor: 'help' }} />
    </Tooltip>
  );
}

interface Props {
  /** 它在大纲里的上级，从外到里 */
  path?: { title: string; onClick?: () => void }[];
  title: string;
  /** 这一页写什么 */
  help?: ReactNode;
  /** 标题下面的一行：这一页的内容生成到哪 */
  note?: ReactNode;
  /** 这一页的按钮 */
  actions?: ReactNode;
  children: ReactNode;
}

/** 所有页面共用的骨架：面包屑、标题、去向、本页按钮，下面是正文。 */
export default function Page({ path = [], title, help, note, actions, children }: Props) {
  return (
    <PageContainer
      fixedHeader
      breadcrumb={
        path.length
          ? { items: [...path.map((p) => ({ title: p.onClick ? <a onClick={p.onClick}>{p.title}</a> : p.title })), { title }] }
          : undefined
      }
      title={
        <>
          {title}
          <Help text={help} />
        </>
      }
      content={note ? <Typography.Text type="secondary">{note}</Typography.Text> : undefined}
      extra={actions}
    >
      {children}
    </PageContainer>
  );
}
