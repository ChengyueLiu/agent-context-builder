// 命令行编译：npm run build-agent -- <agent 文件夹>

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '../core/compile';
import { loadProject, loadTemplate, writeBuild } from '../core/project';

const ICON = { error: '✗', warning: '!', info: '·' } as const;

async function main() {
  // npm run 会把工作目录切到 builder/，用户给的相对路径按他敲命令的目录解析
  const root = process.argv[2]
    ? path.resolve(process.env.INIT_CWD ?? process.cwd(), process.argv[2])
    : fileURLToPath(new URL('../../../examples/research-agent', import.meta.url));
  const template = await loadTemplate();
  const project = await loadProject(root, template);
  const result = compile(template, project.agent, project.cards);
  await writeBuild(root, result);

  console.log(`已编译 ${project.cards.length} 张卡片 → ${path.join(root, 'build')}\n`);
  for (const f of result.files) {
    const size = f.tokens ? `约 ${f.tokens} token` : '不进上下文';
    console.log(`  ${f.path.padEnd(44)} ${String(f.lines).padStart(4)} 行  ${size}`);
  }
  const diags = [...project.loadDiagnostics, ...result.diagnostics];
  if (diags.length) {
    console.log('\n诊断：');
    for (const d of diags) {
      const where = d.card ?? d.file;
      console.log(`  ${ICON[d.severity]} ${d.message}${where ? `  (${where})` : ''}`);
    }
  }
  if (diags.some((d) => d.severity === 'error')) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
