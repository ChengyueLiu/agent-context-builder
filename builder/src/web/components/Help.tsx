import { Drawer, Typography } from 'antd';
import { useEditor } from '../agentContext';

const { Title, Paragraph, Text } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function Help({ open, onClose }: Props) {
  const { project } = useEditor();
  return (
    <Drawer title="怎么用" open={open} onClose={onClose} size={560}>
      <Title level={5}>一段内容该写在哪</Title>
      <Paragraph>先分功能性还是非功能性：把它去掉以后，agent 还知不知道要做什么、怎么做？</Paragraph>
      <ul className="help-list">
        <li>
          不知道了：属于<Text strong>功能性配置</Text>。每次都要、基本不变、是原则的，写进“工作说明”里对应的一页；某一类任务的做法、格式、细节，写进那一类的 <Text strong>Skill</Text>；查阅用的资料写进<Text strong>知识</Text>；只关于某个工具的，写进那个<Text strong>工具</Text>。
        </li>
        <li>
          照样能做，但可能被攻击、泄露、越权：属于<Text strong>信息安全</Text>；可能伤到人：属于<Text strong>人身与社会安全</Text>；可能违法违规：属于<Text strong>合规</Text>。
        </li>
        <li>
          照样能做，但出错时没人发现、没人纠正：属于<Text strong>可靠性</Text>。出错前就拦住的写进事前预防；干活过程中提醒、把关、评审的写进过程纠正；做完以后检验和改进的写进事后改进。
        </li>
        <li>只属于这一次任务，或者只属于某一个用户：不写在这里，由用户交任务时给。</li>
      </ul>

      <Title level={5}>自动生成的内容</Title>
      <Paragraph>右边的系统提示词由左边的配置自动生成，不能直接改。其中这几项由清单自动列出，要改去来源那里改：</Paragraph>
      <ul className="help-list">
        {project.template.prompt.sections.flatMap((s) =>
          (s.auto ?? []).map((a) => (
            <li key={a.id}>
              「{s.name}」里的<Text strong>{a.label}</Text>，来自「{a.from}」。
            </li>
          )),
        )}
      </ul>

      <Title level={5}>文件在哪</Title>
      <Paragraph>
        填的内容存在 <Text code>{project.root}</Text>。
      </Paragraph>
      <Paragraph>
        每次保存后，合成的结果写到其中的 <Text code>build/</Text>。<Text code>build/</Text> 每次整体重写，不要直接改里面的文件。
      </Paragraph>
    </Drawer>
  );
}
