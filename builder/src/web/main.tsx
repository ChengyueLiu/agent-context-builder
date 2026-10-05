import { App as AntApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Editor from './Editor';
import ProjectList from './components/ProjectList';
import './styles.css';

/** 网址 #/<agent> 打开某个 agent，没有就显示 agent 列表。 */
function currentAgent(): string | undefined {
  const m = location.hash.match(/^#\/(.+)$/);
  return m ? decodeURIComponent(m[1]) : undefined;
}

function Root() {
  const [agent, setAgent] = useState(currentAgent);
  useEffect(() => {
    const onHash = () => setAgent(currentAgent());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const open = (id?: string) => {
    location.hash = id ? `#/${encodeURIComponent(id)}` : '';
  };
  return agent ? <Editor key={agent} agentId={agent} onBack={() => open()} /> : <ProjectList onOpen={open} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider locale={zhCN}>
      <AntApp>
        <Root />
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
);
