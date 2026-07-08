# 每日 AI 资讯编辑台

本地/私有运行的 AI 资讯采集、摘要、编辑和导出工具。第一版支持：

- 默认采集 OpenAI、Anthropic、Google AI/DeepMind、Microsoft AI、Meta AI、Hugging Face、Hacker News AI、GitHub Trending。
- 使用 OpenAI API 生成中文精编草稿；没有 API Key 时会使用本地兜底摘要，方便先跑通流程。
- 在网页里编辑 Markdown 草稿，复制 Markdown 或富文本 HTML。
- 设置来源开关、模型、每日生成时间、工作流模式和导出模板。

## 启动

```bash
npm install
npm run db:up
npm run db:push
npm run seed
npm run dev
```

打开 http://127.0.0.1:3001。

## 每日自动任务

```bash
npm run worker
```

或者同时启动网页和 worker：

```bash
npm run dev:all
```

## 环境变量

复制 `.env.example` 为 `.env`，填入：

```env
DATABASE_URL="postgresql://ai_news:ai_news@localhost:55432/ai_news?schema=public"
OPENAI_API_KEY="sk-..."
```

也可以在网页设置页里保存 OpenAI API Key。

## 数据库容器

当前目录名可能让 Docker Compose 无法自动推导项目名，所以项目脚本固定使用 `daily-ai-news`：

```bash
npm run db:up
npm run db:down
```
