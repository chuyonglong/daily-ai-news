# AGENTS.md

## 沟通约定

- 默认使用中文回复。
- 解释实现方案时保持简洁，优先给出结论、改动位置和验证结果。
- 如果需要联网确认最新信息，先说明查询目的，再引用可靠来源。

## 项目概览

- 这是一个 AI 新闻工作台项目，基于 Next.js、React、TypeScript、Prisma 和 Vitest。
- 前端页面位于 `src/app` 与 `src/components`。
- API 路由位于 `src/app/api`。
- 业务逻辑位于 `src/lib`。
- Prisma schema 与种子数据位于 `prisma`。
- 后台 worker 位于 `scripts/worker.ts`。

## 常用命令

```bash
npm install
npm run db:up
npm run db:push
npm run seed
npm run dev
```

- 开发服务：`npm run dev`，默认端口 `3001`。
- Web 与 worker 一起启动：`npm run dev:all`。
- 单独启动 worker：`npm run worker`。
- 类型检查：`npm run typecheck`。
- 测试：`npm test`。
- 构建：`npm run build`。
- 启动数据库容器：`npm run db:up`。
- 关闭数据库容器：`npm run db:down`。

## 环境变量

- 参考 `.env.example` 创建 `.env`。
- 主要变量：
  - `DATABASE_URL`
  - `OPENAI_API_KEY`
- 不要提交真实密钥、token、数据库密码或本地私有配置。

## 开发约定

- 优先沿用现有目录结构、命名风格和组件写法。
- 修改共享逻辑时，同步补充或更新邻近的 `.test.ts` 测试。
- API 路由应尽量保持薄层，把可测试逻辑放到 `src/lib`。
- Prisma 相关改动需要确认 schema、迁移/推送命令和种子数据是否一致。
- 不要随意重写无关文件，也不要回滚用户已有改动。

## UI 与图标

- 图标可以使用以下网站：
  - https://www.iconfont.cn/
  - https://fonts.google.com/icons?icon.query=music&icon.style=Rounded
- 如果项目中已有图标库或组件约定，优先复用现有方式。
- 前端改动需要关注移动端与桌面端布局，避免文本溢出、遮挡或控件跳动。

## 验证建议

- 小范围文案或样式改动：至少运行相关测试或说明未运行原因。
- TypeScript/业务逻辑改动：优先运行 `npm run typecheck` 和相关 `npm test`。
- API、数据库或 worker 改动：补充对应路由/库函数测试，并按需验证数据库命令。
- 前端交互改动：启动本地服务后进行浏览器检查。


## 关于浏览器
- 不能连接浏览器

