import MDEditor from '@uiw/react-md-editor';

/** 把 markdown 渲染出来看 */
export default function Markdown({ source }: { source: string }) {
  return (
    <div data-color-mode="light" className="markdown">
      <MDEditor.Markdown source={source} style={{ background: 'transparent', fontSize: 14 }} />
    </div>
  );
}
