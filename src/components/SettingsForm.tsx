"use client";

import type { Source } from "@prisma/client";
import { ListRestart, Save } from "lucide-react";
import { useState, useTransition } from "react";
import { BRIEF_FILL_MODE_OPTIONS, BRIEF_LANGUAGE_OPTIONS, THEME_MODE_OPTIONS, type AppConfig } from "@/lib/defaults";

type SettingsFormProps = {
  initialConfig: AppConfig;
  initialSources: Source[];
  categories: Array<{ id: string; name: string }>;
};

type ModelsResponse = {
  models?: string[];
  baseUrl?: string;
  error?: string;
};

export function SettingsForm({ initialConfig, initialSources, categories }: SettingsFormProps) {
  const [config, setConfig] = useState(initialConfig);
  const [sources, setSources] = useState(initialSources);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isFetchingModels, startModelTransition] = useTransition();

  const updateConfig = <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => {
    setConfig((current) => ({ ...current, [key]: value }));
  };

  const updateSource = (id: string, patch: Partial<Source>) => {
    setSources((current) => current.map((source) => (source.id === id ? { ...source, ...patch } : source)));
  };

  const fetchModels = () => {
    setMessage("");
    startModelTransition(async () => {
      if (!config.openaiApiKey.trim()) {
        setMessage("请先填写 OpenAI API Key");
        return;
      }

      const response = await fetch("/api/openai/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: config.openaiApiKey, baseUrl: config.openaiBaseUrl }),
      });
      const result = (await response.json().catch(() => ({}))) as ModelsResponse;

      if (!response.ok) {
        setMessage(result.error ?? "获取模型失败");
        return;
      }

      const models = result.models ?? [];
      setConfig((current) => ({
        ...current,
        openaiBaseUrl: result.baseUrl ?? current.openaiBaseUrl,
        openaiModels: models,
        openaiModel: current.openaiModel || models[0] || "",
      }));
      setMessage(models.length > 0 ? `已获取 ${models.length} 个模型` : "模型列表为空，可以手动输入模型名");
    });
  };

  const save = () => {
    setMessage("");
    startTransition(async () => {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config,
          sources: sources.map((source) => ({
            id: source.id,
            enabled: source.enabled,
            fetchFrequencyMinutes: source.fetchFrequencyMinutes,
          })),
        }),
      });
      if (!response.ok) {
        setMessage(await response.text());
        return;
      }
      const result = (await response.json()) as { config: AppConfig; sources: Source[] };
      setConfig(result.config);
      setSources(result.sources);
      document.documentElement.dataset.theme = result.config.themeMode;
      setMessage("设置已保存");
    });
  };

  return (
    <div className="grid">
      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">生成与导出</h2>
          <div className="toolbar">
            {message ? <span className="toast">{message}</span> : null}
            <button className="button primary" onClick={save} disabled={isPending || isFetchingModels}>
              <Save size={16} />
              保存设置
            </button>
          </div>
        </div>
        <div className="panel-body form-grid">
          <div className="field full">
            <label htmlFor="openaiBaseUrl">OpenAI API 地址</label>
            <input
              id="openaiBaseUrl"
              value={config.openaiBaseUrl}
              placeholder="https://api.openai.com/v1"
              onChange={(event) => updateConfig("openaiBaseUrl", event.target.value)}
            />
          </div>
          <div className="field full">
            <label htmlFor="openaiApiKey">OpenAI API Key</label>
            <input
              id="openaiApiKey"
              type="password"
              value={config.openaiApiKey}
              placeholder="sk-..."
              onChange={(event) => updateConfig("openaiApiKey", event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="openaiModelInput">OpenAI 模型</label>
            <input
              id="openaiModelInput"
              list="openaiModelOptions"
              value={config.openaiModel}
              placeholder="例如 gpt-4.1-mini"
              onChange={(event) => updateConfig("openaiModel", event.target.value)}
            />
            <datalist id="openaiModelOptions">
              {config.openaiModels.map((model) => (
                <option value={model} key={model} />
              ))}
            </datalist>
          </div>
          <div className="field">
            <label htmlFor="openaiModelSelect">模型列表</label>
            <div className="toolbar" style={{ flexWrap: "nowrap" }}>
              <select
                id="openaiModelSelect"
                value={config.openaiModels.includes(config.openaiModel) ? config.openaiModel : ""}
                onChange={(event) => updateConfig("openaiModel", event.target.value)}
                disabled={config.openaiModels.length === 0}
              >
                <option value="">{config.openaiModels.length === 0 ? "暂无模型，请先获取" : "选择模型"}</option>
                {config.openaiModels.map((model) => (
                  <option value={model} key={model}>
                    {model}
                  </option>
                ))}
              </select>
              <button className="button" onClick={fetchModels} disabled={isFetchingModels || !config.openaiApiKey.trim()} title="从当前 API 地址获取模型列表">
                <ListRestart size={16} />
                {isFetchingModels ? "获取中" : "获取模型"}
              </button>
            </div>
          </div>
          <div className="field">
            <label htmlFor="dailyRunTime">每日生成时间</label>
            <input id="dailyRunTime" type="time" value={config.dailyRunTime} onChange={(event) => updateConfig("dailyRunTime", event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="defaultCategoryScope">默认类别</label>
            <select id="defaultCategoryScope" value={config.defaultCategoryScope} onChange={(event) => updateConfig("defaultCategoryScope", event.target.value)}>
              <option value="all">全部类别</option>
              {categories.map((category) => (
                <option value={category.id} key={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="briefMinItems">最少条数</label>
            <input id="briefMinItems" type="number" min={1} max={20} value={config.briefMinItems} onChange={(event) => updateConfig("briefMinItems", Number(event.target.value))} />
          </div>
          <div className="field">
            <label htmlFor="briefMaxItems">最多条数</label>
            <input id="briefMaxItems" type="number" min={1} max={20} value={config.briefMaxItems} onChange={(event) => updateConfig("briefMaxItems", Number(event.target.value))} />
          </div>
          <div className="field">
            <label htmlFor="briefLanguage">简报语言</label>
            <select id="briefLanguage" value={config.briefLanguage} onChange={(event) => updateConfig("briefLanguage", event.target.value as AppConfig["briefLanguage"])}>
              {BRIEF_LANGUAGE_OPTIONS.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="themeMode">主题</label>
            <select id="themeMode" value={config.themeMode} onChange={(event) => updateConfig("themeMode", event.target.value as AppConfig["themeMode"])}>
              {THEME_MODE_OPTIONS.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="briefFillMode">生成结果填充方式</label>
            <select id="briefFillMode" value={config.briefFillMode} onChange={(event) => updateConfig("briefFillMode", event.target.value as AppConfig["briefFillMode"])}>
              {BRIEF_FILL_MODE_OPTIONS.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="workflowMode">工作流模式</label>
            <select id="workflowMode" value={config.workflowMode} onChange={(event) => updateConfig("workflowMode", event.target.value as AppConfig["workflowMode"])}>
              <option value="draft_review">草稿编辑后导出</option>
              <option value="auto_ready">自动生成待发布草稿</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="exportTemplate">导出模板</label>
            <select id="exportTemplate" value={config.exportTemplate} onChange={(event) => updateConfig("exportTemplate", event.target.value as AppConfig["exportTemplate"])}>
              <option value="wechat">微信公众号</option>
              <option value="zhihu">知乎</option>
              <option value="juejin">掘金</option>
            </select>
          </div>
          <div className="field full">
            <label htmlFor="languageStyle">简报风格</label>
            <textarea id="languageStyle" className="small" value={config.languageStyle} onChange={(event) => updateConfig("languageStyle", event.target.value)} />
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">资讯来源</h2>
          <span className="meta">禁用后不会再自动采集</span>
        </div>
        <div className="panel-body source-list">
          {sources.map((source) => (
            <div className="source-row" key={source.id}>
              <input
                type="checkbox"
                aria-label={`启用 ${source.name}`}
                checked={source.enabled}
                onChange={(event) => updateSource(source.id, { enabled: event.target.checked })}
              />
              <div>
                <strong>{source.name}</strong>
                <div className="meta">{source.type} · {source.url}</div>
              </div>
              <input
                type="number"
                min={60}
                value={source.fetchFrequencyMinutes}
                aria-label={`${source.name} 抓取间隔分钟`}
                onChange={(event) => updateSource(source.id, { fetchFrequencyMinutes: Number(event.target.value) })}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
