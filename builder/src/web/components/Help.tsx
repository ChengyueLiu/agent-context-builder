import { Drawer, Typography } from 'antd';
import { useEditor } from '../agentContext';
import { useLang } from '../i18n';

const { Title, Paragraph, Text } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function Help({ open, onClose }: Props) {
  const { project } = useEditor();
  const { t } = useLang();
  return (
    <Drawer title={t.helpTitle} open={open} onClose={onClose} size={560}>
      <Title level={5}>{t.helpWhereTitle}</Title>
      <Paragraph>{t.helpWhereIntro}</Paragraph>
      <ul className="help-list">
        <li>{t.helpFunctional}</li>
        <li>{t.helpSecurity}</li>
        <li>{t.helpReliability}</li>
        <li>{t.helpNotHere}</li>
      </ul>

      <Title level={5}>{t.helpAutoTitle}</Title>
      <Paragraph>{t.helpAutoIntro}</Paragraph>
      <ul className="help-list">
        {project.template.prompt.sections.flatMap((s) => (s.auto ?? []).map((a) => <li key={a.id}>{t.helpAutoItem(s.name, a.label, a.from)}</li>))}
      </ul>

      <Title level={5}>{t.helpFilesTitle}</Title>
      <Paragraph>
        {t.helpFilesRoot} <Text code>{project.root}</Text>
      </Paragraph>
      <Paragraph>{t.helpFilesBuild}</Paragraph>
    </Drawer>
  );
}
