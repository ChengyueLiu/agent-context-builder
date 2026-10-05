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
import {
  agentDir,
  createAgent,
  deleteCard,
  isAgentDir,
  listAgents,
  loadProject,
  loadTemplate,
  saveAgent,
  saveCard,
  writeBuild,
} from '../core/project';
import type { AgentSpec, CardInput } from '../core/types';

const builderRoot = fileURLToPath(new URL('../..', import.meta.url));
const port = Number(process.env.PORT ?? 5299);

// npm run 会把工作目录切到 builder/，用户给的相对路径按他敲命令的目录解析
const given = process.argv[2] ? path.resolve(process.env.INIT_CWD ?? process.cwd(), process.argv[2]) : undefined;
const workspace = given ? (isAgentDir(given) ? path.dirname(given) : given) : path.join(builderRoot, '../examples');
const openFirst = given && isAgentDir(given) ? path.basename(given) : undefined;

/** 读项目、编译、写 build/，返回给前端的完整状态。每次改动后都调用，保证 build/ 与卡片同步。 */
async function snapshot(root: string) {
  const template = await loadTemplate();
  const project = await loadProject(root, template);
  const build = compile(template, project.agent, project.cards);
  let buildError: string | undefined;
  try {
    await writeBuild(root, build);
  } catch (e) {
    buildError = (e as Error).message;
  }
  return { ...project, build, buildError };
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
  if (!isAgentDir(dir)) throw new Error(`没有这个 agent：${req.params.id}`);
  return dir;
}

const app = express();
app.use(express.json({ limit: '5mb' }));

const api = express.Router();
api.get('/agents', async (_req, res) => {
  res.json({ workspace, agents: await listAgents(workspace) });
});
api.post('/agents', async (req, res) => {
  const { id, name } = req.body as { id: string; name: string };
  await exclusive(() => createAgent(workspace, String(id ?? ''), String(name ?? '')));
  res.json({ workspace, agents: await listAgents(workspace) });
});
api.get('/agents/:id/project', async (req, res) => {
  const root = rootOf(req);
  res.json(await exclusive(() => snapshot(root)));
});
api.put('/agents/:id/agent', async (req, res) => {
  const root = rootOf(req);
  res.json(
    await exclusive(async () => {
      await saveAgent(root, req.body as AgentSpec);
      return snapshot(root);
    }),
  );
});
api.post('/agents/:id/card', async (req, res) => {
  const root = rootOf(req);
  const { path: _ignored, ...input } = req.body as CardInput;
  res.json(
    await exclusive(async () => {
      const card = await saveCard(root, await loadTemplate(), input);
      return { card, project: await snapshot(root) };
    }),
  );
});
api.put('/agents/:id/card', async (req, res) => {
  const root = rootOf(req);
  res.json(
    await exclusive(async () => {
      const card = await saveCard(root, await loadTemplate(), req.body as CardInput);
      return { card, project: await snapshot(root) };
    }),
  );
});
api.delete('/agents/:id/card', async (req, res) => {
  const root = rootOf(req);
  res.json(
    await exclusive(async () => {
      await deleteCard(root, String(req.query.path ?? ''));
      return snapshot(root);
    }),
  );
});
api.post('/agents/:id/build', async (req, res) => {
  const root = rootOf(req);
  res.json(await exclusive(() => snapshot(root)));
});
app.use('/api', api);
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(400).json({ error: err.message });
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
