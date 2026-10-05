// 命令行生成：npm run build-agent -- <agent 文件夹>

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '../core/compile';
import { loadDef, loadTemplate, writeBuild } from '../core/store';

const ICON = { error: '✗', warning: '!' } as const;
const GROUP = { start: '一开始就给', message: '每条消息插入', on_demand: '用到才加载', situation: '到时机时插入', hidden: '不给 agent 看' } as const;

async function main() {
  // npm run 会把工作目录切到 builder/，用户给的相对路径按他敲命令的目录解析
  const root = process.argv[2]
    ? path.resolve(process.env.INIT_CWD ?? process.cwd(), process.argv[2])
    : fileURLToPath(new URL('../../../examples/research-agent', import.meta.url));
  const template = await loadTemplate();
  const def = await loadDef(root, template);
  const result = compile(template, def);
  await writeBuild(root, result);

  console.log(`已生成 → ${path.join(root, 'build')}\n`);
  for (const f of result.files) {
    const size = f.tokens ? `约 ${f.tokens} token` : '';
    console.log(`  ${GROUP[f.group].padEnd(8)} ${f.path.padEnd(40)} ${String(f.lines).padStart(4)} 行  ${size}`);
  }
  if (result.diagnostics.length) {
    console.log('\n问题：');
    for (const d of result.diagnostics) console.log(`  ${ICON[d.severity]} ${d.message}`);
  }
  if (result.diagnostics.some((d) => d.severity === 'error')) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
