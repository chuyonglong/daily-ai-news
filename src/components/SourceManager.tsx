"use client";

import type { SourceType } from "@prisma/client";
import { Pencil, Plus, Power, Save, Trash2, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

type CategoryOption = { id: string; name: string };

type ManagedSource = {
  id: string;
  name: string;
  type: SourceType;
  url: string;
  categoryId: string | null;
  category: CategoryOption | null;
  enabled: boolean;
  fetchFrequencyMinutes: number;
  lastFetchedAt: Date | string | null;
};

type SourceDraft = {
  id?: string;
  name: string;
  type: SourceType;
  url: string;
  categoryId: string;
  enabled: boolean;
  fetchFrequencyMinutes: number;
};

type SourceManagerProps = {
  initialSources: ManagedSource[];
  initialCategories: CategoryOption[];
};

const SOURCE_TYPES: SourceType[] = ["RSS", "HTML", "HN", "GITHUB_TRENDING"];

const emptyDraft: SourceDraft = {
  name: "",
  type: "RSS",
  url: "",
  categoryId: "",
  enabled: true,
  fetchFrequencyMinutes: 720,
};

function sourceToDraft(source: ManagedSource): SourceDraft {
  return {
    id: source.id,
    name: source.name,
    type: source.type,
    url: source.url,
    categoryId: source.categoryId ?? "",
    enabled: source.enabled,
    fetchFrequencyMinutes: source.fetchFrequencyMinutes,
  };
}

function formatLastFetched(value: Date | string | null) {
  if (!value) return "从未采集";
  return new Date(value).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

async function requestJson<T>(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "操作失败");
  return data;
}

export function SourceManager({ initialSources, initialCategories }: SourceManagerProps) {
  const [sources, setSources] = useState(initialSources);
  const [categories, setCategories] = useState(initialCategories);
  const [draft, setDraft] = useState<SourceDraft | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ManagedSource | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const enabledCount = useMemo(() => sources.filter((source) => source.enabled).length, [sources]);
  const editing = Boolean(draft?.id);

  const openCreate = () => {
    setMessage("");
    setDraft({ ...emptyDraft, categoryId: categories[0]?.id ?? "" });
  };

  const openEdit = (source: ManagedSource) => {
    setMessage("");
    setDraft(sourceToDraft(source));
  };

  const closeForm = () => {
    setDraft(null);
    setNewCategoryName("");
  };

  const updateDraft = <K extends keyof SourceDraft>(key: K, value: SourceDraft[K]) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const applySource = (source: ManagedSource) => {
    setSources((current) => {
      const exists = current.some((item) => item.id === source.id);
      const next = exists ? current.map((item) => (item.id === source.id ? source : item)) : [source, ...current];
      return [...next].sort((left, right) => Number(right.enabled) - Number(left.enabled) || left.name.localeCompare(right.name));
    });
  };

  const saveSource = () => {
    if (!draft) return;
    setMessage("");
    startTransition(async () => {
      try {
        const payload = {
          name: draft.name,
          type: draft.type,
          url: draft.url,
          categoryId: draft.categoryId,
          enabled: draft.enabled,
          fetchFrequencyMinutes: Number(draft.fetchFrequencyMinutes),
        };
        const result = draft.id
          ? await requestJson<{ source: ManagedSource }>(`/api/sources/${draft.id}`, { method: "PATCH", body: JSON.stringify(payload) })
          : await requestJson<{ source: ManagedSource }>("/api/sources", { method: "POST", body: JSON.stringify(payload) });
        applySource(result.source);
        closeForm();
        setMessage(draft.id ? "来源已更新" : "来源已新增");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "保存来源失败");
      }
    });
  };

  const toggleEnabled = (source: ManagedSource) => {
    setMessage("");
    startTransition(async () => {
      try {
        const result = await requestJson<{ source: ManagedSource }>(`/api/sources/${source.id}`, {
          method: "PATCH",
          body: JSON.stringify({ enabled: !source.enabled }),
        });
        applySource(result.source);
        setMessage(result.source.enabled ? "来源已启用" : "来源已停用");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "更新来源失败");
      }
    });
  };

  const createCategory = () => {
    const name = newCategoryName.trim();
    if (!name) {
      setMessage("类别名称不能为空");
      return;
    }
    setMessage("");
    startTransition(async () => {
      try {
        const result = await requestJson<{ category: CategoryOption }>("/api/categories", { method: "POST", body: JSON.stringify({ name }) });
        setCategories((current) => (current.some((category) => category.id === result.category.id) ? current : [...current, result.category]));
        updateDraft("categoryId", result.category.id);
        setNewCategoryName("");
        setMessage("类别已新增");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "新增类别失败");
      }
    });
  };

  const openDeleteDialog = (source: ManagedSource) => {
    setDeleteTarget(source);
    setDeleteConfirmName("");
  };

  const closeDeleteDialog = () => {
    setDeleteTarget(null);
    setDeleteConfirmName("");
  };

  const confirmDelete = () => {
    if (!deleteTarget || deleteConfirmName !== deleteTarget.name) return;
    setMessage("");
    startTransition(async () => {
      try {
        await requestJson<{ source: ManagedSource }>(`/api/sources/${deleteTarget.id}`, { method: "DELETE" });
        setSources((current) => current.filter((source) => source.id !== deleteTarget.id));
        setMessage("来源已删除，相关已采集资讯也已删除");
        closeDeleteDialog();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "删除来源失败");
      }
    });
  };

  return (
    <div className="grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">来源列表</h2>
            <div className="meta">
              共 {sources.length} 个来源，{enabledCount} 个启用
            </div>
          </div>
          <div className="toolbar">
            {message ? <span className="toast">{message}</span> : null}
            <button className="button primary" onClick={openCreate} disabled={isPending}>
              <Plus size={16} />
              新增来源
            </button>
          </div>
        </div>
        <div className="panel-body">
          {sources.length === 0 ? (
            <div className="empty">暂无来源。新增来源后即可在采集中心执行采集。</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>名称</th>
                    <th>类别</th>
                    <th>类型</th>
                    <th>URL</th>
                    <th>抓取间隔</th>
                    <th>状态</th>
                    <th>上次采集</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((source) => (
                    <tr key={source.id}>
                      <td>
                        <strong>{source.name}</strong>
                      </td>
                      <td>{source.category?.name ?? "-"}</td>
                      <td>{source.type}</td>
                      <td className="meta">{source.url}</td>
                      <td>{source.fetchFrequencyMinutes} 分钟</td>
                      <td>
                        <span className={`status-pill ${source.enabled ? "success" : "empty"}`}>{source.enabled ? "启用" : "停用"}</span>
                      </td>
                      <td className="meta">{formatLastFetched(source.lastFetchedAt)}</td>
                      <td>
                        <div className="toolbar">
                          <button className="button" onClick={() => openEdit(source)} disabled={isPending} title="编辑来源">
                            <Pencil size={16} />
                            编辑
                          </button>
                          <button className="button" onClick={() => toggleEnabled(source)} disabled={isPending} title={source.enabled ? "停用来源" : "启用来源"}>
                            <Power size={16} />
                            {source.enabled ? "停用" : "启用"}
                          </button>
                          <button className="button danger" onClick={() => openDeleteDialog(source)} disabled={isPending} title="危险删除来源">
                            <Trash2 size={16} />
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {draft ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && closeForm()}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="source-form-title">
            <div className="modal-header">
              <div>
                <h2 className="panel-title" id="source-form-title">
                  {editing ? "编辑来源" : "新增来源"}
                </h2>
                <div className="meta">来源会用于采集过滤和简报分组</div>
              </div>
              <button className="button icon-button" onClick={closeForm} title="关闭弹窗" aria-label="关闭弹窗">
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="sourceName">来源名称</label>
                  <input id="sourceName" value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} placeholder="例如 OpenAI Blog" />
                </div>
                <div className="field">
                  <label htmlFor="sourceType">来源类型</label>
                  <select id="sourceType" value={draft.type} onChange={(event) => updateDraft("type", event.target.value as SourceType)}>
                    {SOURCE_TYPES.map((type) => (
                      <option value={type} key={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field full">
                  <label htmlFor="sourceUrl">来源 URL</label>
                  <input id="sourceUrl" value={draft.url} onChange={(event) => updateDraft("url", event.target.value)} placeholder="https://example.com/feed.xml" />
                </div>
                <div className="field">
                  <label htmlFor="sourceCategory">来源类别</label>
                  <select id="sourceCategory" value={draft.categoryId} onChange={(event) => updateDraft("categoryId", event.target.value)}>
                    <option value="">选择类别</option>
                    {categories.map((category) => (
                      <option value={category.id} key={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="sourceFrequency">抓取间隔分钟</label>
                  <input id="sourceFrequency" type="number" min={60} value={draft.fetchFrequencyMinutes} onChange={(event) => updateDraft("fetchFrequencyMinutes", Number(event.target.value))} />
                </div>
                <div className="field">
                  <label htmlFor="newCategoryName">新增类别</label>
                  <div className="toolbar" style={{ flexWrap: "nowrap" }}>
                    <input id="newCategoryName" value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="例如：能源" />
                    <button className="button" onClick={createCategory} disabled={isPending} title="新增类别">
                      <Plus size={16} />
                      新增
                    </button>
                  </div>
                </div>
                <label className="field">
                  <span>启用状态</span>
                  <select value={draft.enabled ? "enabled" : "disabled"} onChange={(event) => updateDraft("enabled", event.target.value === "enabled")}>
                    <option value="enabled">启用</option>
                    <option value="disabled">停用</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="button" onClick={closeForm}>
                取消
              </button>
              <button className="button primary" onClick={saveSource} disabled={isPending}>
                <Save size={16} />
                保存
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && closeDeleteDialog()}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="delete-source-title">
            <div className="modal-header">
              <div>
                <h2 className="panel-title" id="delete-source-title">
                  危险删除来源
                </h2>
                <div className="meta">会删除该来源和它已采集的资讯。历史简报文本会保留。</div>
              </div>
              <button className="button icon-button" onClick={closeDeleteDialog} title="关闭弹窗" aria-label="关闭弹窗">
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="field full">
                <label htmlFor="deleteConfirmName">输入来源名称以确认删除：{deleteTarget.name}</label>
                <input id="deleteConfirmName" value={deleteConfirmName} onChange={(event) => setDeleteConfirmName(event.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="button" onClick={closeDeleteDialog}>
                取消
              </button>
              <button className="button danger" onClick={confirmDelete} disabled={isPending || deleteConfirmName !== deleteTarget.name}>
                <Trash2 size={16} />
                确认删除
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
