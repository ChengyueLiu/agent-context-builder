import { Typography } from 'antd';

const { Title, Paragraph, Text } = Typography;

/** 帮助：怎么用这个编辑器。 */
export default function Help() {
  return (
    <Typography>
      <Paragraph>这个编辑器管理一个 agent 的全部上下文：系统提示词、skill、工具描述、提醒、资料。你按内容的意思编辑，它负责保存成 agent 加载用的文件。</Paragraph>

      <Title level={5}>三个视图</Title>
      <Paragraph>
        <ul>
          <li>
            <Text strong>骨架</Text>：定义这个 agent 有哪些阶段、领域、工具、需要提醒的情形。卡片的适用条件从这里选。
          </li>
          <li>
            <Text strong>编辑</Text>：左边是九件事的条目。点一个条目，看它写什么，新建卡片来写。
          </li>
          <li>
            <Text strong>预览</Text>：agent 实际拿到的每个文件，以及大约多少 token。
          </li>
        </ul>
      </Paragraph>

      <Title level={5}>卡片</Title>
      <Paragraph>
        一张卡片是一个条目在一种适用条件下的内容。适用条件决定它保存到哪里：
        <ul>
          <li>全部 → 系统提示词，每次都在</li>
          <li>某个阶段、某个领域 → 对应的 skill，用到时才加载</li>
          <li>用某个工具时 → 该工具的描述</li>
          <li>某种情形出现时 → 运行时提醒</li>
          <li>需要时查阅 → 资料文件，常驻一份索引</li>
        </ul>
        同一条目在不同条件下用，就分成几张卡片，比如每个阶段一张。
      </Paragraph>

      <Title level={5}>保存</Title>
      <Paragraph>
        保存卡片后自动编译到 agent 文件夹下的 <Text code>build/</Text>。卡片本身存在 <Text code>context/</Text>，是带几行字段的 markdown 文件，可以用任何编辑器改，改完点右上角的刷新。
      </Paragraph>
      <Paragraph>
        <Text code>build/manifest.yaml</Text> 说明每个文件是什么、何时加载，给接入 agent 的程序用；<Text code>build/mechanisms.md</Text> 列出每条硬性约束和兜底的机制，给工程实现用。这两个文件不进 agent 的上下文。
      </Paragraph>
    </Typography>
  );
}
