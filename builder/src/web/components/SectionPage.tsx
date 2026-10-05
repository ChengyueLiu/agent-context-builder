import { ProCard } from '@ant-design/pro-components';
import { App, Button, Flex } from 'antd';
import { useState } from 'react';
import { pageFields } from '../../core/outline';
import type { PromptSection } from '../../core/types';
import { useEditor } from '../agentContext';
import { groupOf } from '../util';
import Page from './Page';
import PromptFields, { headerHelp, promptPatch, promptValues } from './PromptFields';
import { useDraft, usePage } from './useDraft';

/** 系统提示词里单独成页的一节：工作说明的五页、产出物管理、安全与合规的三页 */
export default function SectionPage({ section }: { section: PromptSection }) {
  const { api, project, setProject } = useEditor();
  const { message } = App.useApp();
  const fields = pageFields(project.template, section.id).map((x) => x.field);
  const { draft, set, dirty } = useDraft(promptValues(fields, project.def.prompt));
  const [saving, setSaving] = useState(false);
  const patch = promptPatch(fields, draft);

  const save = async () => {
    setSaving(true);
    try {
      setProject(await api.patch({ prompt: patch }));
      message.success('已保存');
      return true;
    } catch (e) {
      message.error((e as Error).message);
      return false;
    } finally {
      setSaving(false);
    }
  };
  usePage(dirty, save, { prompt: patch });

  return (
    <Page
      path={groupOf(project.template, section.id).map((title) => ({ title }))}
      title={section.title ?? section.name}
      help={headerHelp(section.intro, fields)}
      actions={
        <Button type="primary" disabled={!dirty} loading={saving} onClick={save}>
          保存
        </Button>
      }
    >
      <ProCard>
        <Flex vertical gap={20}>
          <PromptFields fields={fields} draft={draft} set={set} />
        </Flex>
      </ProCard>
    </Page>
  );
}
