// 本地服务：读写工作区里的 agent 文件夹，提供网页编辑器。
// 用法：npm run dev -- [工作区文件夹]
//   工作区里每个带 agent.yaml 的子文件夹是一个 agent。默认工作区是仓库的 examples/。
//   如果给的是某个 agent 文件夹本身，就用它的上级文件夹当工作区。

import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type NextFunction, type Request, type Response } from 'express';
import { compile } from '../core/compile';
import { AppError, errorMessage, type Lang } from '../core/phrases';
import { agentDir, contentLang, createAgent, isAgentDir, listAgents, loadDef, loadTemplates, patchDef, writeBuild } from '../core/store';
import type { DefPatch } from '../core/types';

const builderRoot = fileURLToPath(new URL('../..', import.meta.url));
const port = Number(process.env.PORT ?? 5299);

// npm run 会把工作目录切到 builder/，用户给的相对路径按他敲命令的目录解析
const given = process.argv[2] ? path.resolve(process.env.INIT_CWD ?? process.cwd(), process.argv[2]) : undefined;
const workspace = given ? (isAgentDir(given) ? path.dirname(given) : given) : path.join(builderRoot, '../examples');
const openFirst = given && isAgentDir(given) ? path.basename(given) : undefined;

/** 界面语言：前端每个请求都带上，问题提示和出错信息按它写 */
const uiLang = (req: Request): Lang => (req.get('x-lang') === 'en' ? 'en' : 'zh');

/**
 * 读定义、合成、写 build/，返回给前端的完整状态。每次改动后都调用，保证 build/ 与定义同步。
 * 两种语言的大纲都给前端：界面用界面语言那份，生成用 agent 内容语言那份。
 */
async function snapshot(root: string, lang: Lang) {
  const templates = await loadTemplates();
  const def = await loadDef(root, templates.zh);
  const build = compile(templates[contentLang(def)], def, lang);
  let buildError: string | undefined;
  try {
    await writeBuild(root, build);
  } catch (e) {
    buildError = errorMessage(e, lang);
  }
  return { root, templates, def, build, buildError };
}

/** 读写磁盘的操作排队执行：两个请求同时重写 build/ 会互相删掉对方的文件。 */
let queue: Promise<unknown> = Promise.resolve();
function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

/** 请求里的 agent，必须是工作区里已有的 agent 文件夹 */
function rootOf(req: Request): string {
  const dir = agentDir(workspace, String(req.params.id));
  if (!isAgentDir(dir)) throw new AppError('noAgent', [String(req.params.id)]);
  return dir;
}

const app = express();
app.use(express.json({ limit: '5mb' }));

const api = express.Router();
api.get('/agents', async (_req, res) => {
  res.json({ workspace, agents: await listAgents(workspace) });
});
api.post('/agents', async (req, res) => {
  const { id, name, language } = req.body as { id: string; name: string; language?: Lang };
  const templates = await loadTemplates();
  await exclusive(async () => createAgent(workspace, String(id ?? ''), String(name ?? ''), templates[language === 'zh' ? 'zh' : 'en']));
  res.json({ workspace, agents: await listAgents(workspace) });
});
api.get('/agents/:id/project', async (req, res) => {
  const root = rootOf(req);
  res.json(await exclusive(() => snapshot(root, uiLang(req))));
});
api.put('/agents/:id/def', async (req, res) => {
  const root = rootOf(req);
  res.json(
    await exclusive(async () => {
      await patchDef(root, (await loadTemplates()).zh, req.body as DefPatch);
      return snapshot(root, uiLang(req));
    }),
  );
});
app.use('/api', api);
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  res.status(400).json({ error: errorMessage(err, uiLang(req)) });
});

async function main() {
  await fs.mkdir(workspace, { recursive: true });
  const server = http.createServer(app);
  const { createServer } = await import('vite');
  const vite = await createServer({
    configFile: path.join(builderRoot, 'vite.config.ts'),
    server: { middlewareMode: true, hmr: { server } },
    appType: 'spa',
  });
  app.use(vite.middlewares);
  server.listen(port, '127.0.0.1', () => {
    const hash = openFirst ? `#/${encodeURIComponent(openFirst)}` : '';
    console.log(`编辑器：http://localhost:${port}/${hash}`);
    console.log(`工作区：${workspace}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
