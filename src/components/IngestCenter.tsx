"use client";

import { CheckCircle2, ChevronDown, ChevronUp, Circle, Loader2, MinusCircle, Plus, Play, RefreshCcw, X, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { IngestRunView } from "@/lib/ingest/runs";

type IngestResult = {
  sourceName: string;
  fetched: number;
  inserted: number;
  duplicate: number;
  skipped: number;
  failed: number;
  errors: string[];
};

type RowStatus = "idle" | "running" | "success" | "empty" | "failed";

type SourceRow = {
  id: string;
  name: string;
  type: string;
  url: string;
  categoryId: string | null;
  categoryName: string;
  fetchFrequencyMinutes: number;
  lastFetchedAt: string | null;
  status: RowStatus;
  result?: IngestResult;
  errors: string[];
  detailsOpen?: boolean;
};

type CategoryOption = { id: string; name: string };

type IngestCenterProps = {
  initialRun: IngestRunView;
  initialCategories: CategoryOption[];
};

const SOURCE_TYPES = ["RSS", "HTML", "HN", "GITHUB_TRENDING"] as const;

function statusLabel(status: RowStatus) {
  if (status === "running") return "采集中";
  if (status === "success") return "成功";
  if (status === "empty") return "无新增";
  if (status === "failed") return "失败";
  return "等待中";
}

function StatusIcon({ status }: { status: RowStatus }) {
  if (status === "running") return <Loader2 size={16} className="spin" aria-hidden="true" />;
  if (status === "success") return <CheckCircle2 size={16} aria-hidden="true" />;
  if (status === "empty") return <MinusCircle size={16} aria-hidden="true" />;
  if (status === "failed") return <XCircle size={16} aria-hidden="true" />;
  return <Circle size={16} aria-hidden="true" />;
}

function formatLastFetched(value: string | null) {
  if (!value) return "从未采集";
  return new Date(value).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function isRunActive(status: IngestRunView["status"]) {
  return status === "pending" || status === "running";
}

function rowsFromRun(run: IngestRunView, current: SourceRow[] = []) {
  const detailsState = new Map(current.map((row) => [row.id, row.detailsOpen]));
  return run.sources.map((source) => ({
    ...source,
    status: source.status,
    detailsOpen: detailsState.get(source.id) ?? source.status === "failed",
  }));
}

async function fetchRun(categoryScope: string) {
  const response = await fetch(`/api/jobs/ingest?categoryScope=${encodeURIComponent(categoryScope)}`, { cache: "no-store" });
  if (!response.ok) throw new Error(await response.text());
  const data = (await response.json()) as { run: IngestRunView };
  return data.run;
}

async function startRun(categoryScope: string) {
  const response = await fetch("/api/jobs/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ categoryScope }),
  });
  const data = (await response.json().catch(() => ({}))) as { run?: IngestRunView; error?: string };
  if (!response.ok || !data.run) throw new Error(data.error ?? "采集启动失败");
  return data.run;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "操作失败");
  return data;
}

export function IngestCenter({ initialRun, initialCategories }: IngestCenterProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [categoryScope, setCategoryScope] = useState(initialRun.categoryScope || "all");
  const [run, setRun] = useState(initialRun);
  const [rows, setRows] = useState<SourceRow[]>(() => rowsFromRun(initialRun));
  const [message, setMessage] = useState(initialRun.message);
  const [refreshing, setRefreshing] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSource, setNewSource] = useState({
    name: "",
    type: "RSS",
    url: "",
    categoryId: initialCategories[0]?.id ?? "",
    fetchFrequencyMinutes: 720,
  });

  const running = isRunActive(run.status);
  const completed = rows.filter((row) => row.status === "success" || row.status === "empty" || row.status === "failed").length;
  const successSources = rows.filter((row) => row.status === "success").length;
  const emptySources = rows.filter((row) => row.status === "empty").length;
  const failedSources = rows.filter((row) => row.status === "failed").length;
  const percent = rows.length === 0 ? 0 : Math.round((completed / rows.length) * 100);
  const totals = useMemo(
    () =>
      rows.reduce(
        (sum, row) => ({
          fetched: sum.fetched + (row.result?.fetched ?? 0),
          inserted: sum.inserted + (row.result?.inserted ?? 0),
          duplicate: sum.duplicate + (row.result?.duplicate ?? 0),
          skipped: sum.skipped + (row.result?.skipped ?? 0),
          failed: sum.failed + (row.result?.failed ?? 0),
        }),
        { fetched: 0, inserted: 0, duplicate: 0, skipped: 0, failed: 0 },
      ),
    [rows],
  );

  const applyRun = (nextRun: IngestRunView) => {
    setRun(nextRun);
    setMessage(nextRun.message);
    setRows((current) => rowsFromRun(nextRun, current));
  };

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      void fetchRun(categoryScope).then(applyRun).catch((error) => {
        setMessage(error instanceof Error ? error.message : "刷新采集状态失败");
      });
    }, 1500);

    return () => window.clearInterval(timer);
  }, [categoryScope, running]);

  const refreshRun = async (scope = categoryScope) => {
    setRefreshing(true);
    setMessage("正在刷新采集状态");
    try {
      applyRun(await fetchRun(scope));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "刷新采集状态失败");
    } finally {
      setRefreshing(false);
    }
  };

  const changeCategoryScope = (scope: string) => {
    setCategoryScope(scope);
    void refreshRun(scope);
  };

  const toggleDetails = (id: string) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, detailsOpen: !row.detailsOpen } : row)));
  };

  const start = async () => {
    if (running || rows.length === 0) return;
    setMessage("正在启动采集任务");
    try {
      applyRun(await startRun(categoryScope));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "采集启动失败");
    }
  };

  const createCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      setMessage("类别名称不能为空");
      return;
    }
    try {
      const result = await postJson<{ category: CategoryOption }>("/api/categories", { name });
      setCategories((current) => (current.some((category) => category.id === result.category.id) ? current : [...current, result.category]));
      setNewCategoryName("");
      setNewSource((current) => ({ ...current, categoryId: result.category.id }));
      setMessage("类别已新增");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "新增类别失败");
    }
  };

  const createSource = async () => {
    if (!newSource.categoryId) {
      setMessage("请选择类别");
      return;
    }
    try {
      await postJson<{ source: unknown }>("/api/jobs/ingest/sources", { ...newSource, enabled: true });
      setNewSource({ name: "", type: "RSS", url: "", categoryId: newSource.categoryId, fetchFrequencyMinutes: 720 });
      setMessage("来源已新增");
      await refreshRun(categoryScope);
      setAddDialogOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "新增来源失败");
    }
  };

  const closeAddDialog = () => {
    setAddDialogOpen(false);
  };

  return (
    <div className="grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">采集进度</h2>
            <div className="meta">{message}</div>
          </div>
          <div className="toolbar">
            <select className="toolbar-select" value={categoryScope} onChange={(event) => changeCategoryScope(event.target.value)} disabled={running} title="选择采集类别">
              <option value="all">全部类别</option>
              {categories.map((category) => (
                <option value={category.id} key={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button className="button" onClick={() => setAddDialogOpen(true)} title="新增类别或来源">
              <Plus size={16} />
              新增
            </button>
            <button className="button" onClick={() => refreshRun()} disabled={refreshing} title="重新读取采集状态">
              <RefreshCcw size={16} />
              刷新状态
            </button>
            <button className="button primary" onClick={start} disabled={running || rows.length === 0} title="启动后端采集任务">
              {running ? <Loader2 size={16} className="spin" /> : <Play size={16} />}
              {running ? "采集中" : "开始采集"}
            </button>
          </div>
        </div>
        <div className="panel-body">
          <div className="progress-summary">
            <div>
              <strong>{completed}</strong> / {rows.length} 来源完成
            </div>
            <div>{percent}%</div>
          </div>
          <div className="progress-track" aria-label="采集总进度" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} role="progressbar">
            <div className="progress-bar" style={{ width: `${percent}%` }} />
          </div>
          <section className="stat-row compact-stats" aria-label="来源结果汇总" style={{ marginTop: 16, marginBottom: 0 }}>
            <div className="stat">
              <div className="stat-label">成功来源</div>
              <div className="stat-value">{successSources}</div>
            </div>
            <div className="stat">
              <div className="stat-label">无新增来源</div>
              <div className="stat-value">{emptySources}</div>
            </div>
            <div className="stat">
              <div className="stat-label">失败来源</div>
              <div className="stat-value">{failedSources}</div>
            </div>
            <div className="stat">
              <div className="stat-label">重复数据</div>
              <div className="stat-value">{totals.duplicate}</div>
            </div>
          </section>
        </div>
      </section>

      {addDialogOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && closeAddDialog()}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="add-source-title">
            <div className="modal-header">
              <div>
                <h2 className="panel-title" id="add-source-title">新增类别与来源</h2>
                <div className="meta">类别会用于采集过滤和简报分组</div>
              </div>
              <button className="button icon-button" onClick={closeAddDialog} title="关闭弹窗" aria-label="关闭弹窗">
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="newCategoryName">类别名称</label>
                  <div className="toolbar" style={{ flexWrap: "nowrap" }}>
                    <input id="newCategoryName" value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="例如：能源" />
                    <button className="button" onClick={createCategory} title="新增类别">
                      <Plus size={16} />
                      新增
                    </button>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="newSourceCategory">来源类别</label>
                  <select id="newSourceCategory" value={newSource.categoryId} onChange={(event) => setNewSource((current) => ({ ...current, categoryId: event.target.value }))}>
                    <option value="">选择类别</option>
                    {categories.map((category) => (
                      <option value={category.id} key={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="newSourceName">来源名称</label>
                  <input id="newSourceName" value={newSource.name} onChange={(event) => setNewSource((current) => ({ ...current, name: event.target.value }))} placeholder="例如：Finance Feed" />
                </div>
                <div className="field">
                  <label htmlFor="newSourceType">来源类型</label>
                  <select id="newSourceType" value={newSource.type} onChange={(event) => setNewSource((current) => ({ ...current, type: event.target.value }))}>
                    {SOURCE_TYPES.map((type) => (
                      <option value={type} key={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field full">
                  <label htmlFor="newSourceUrl">来源 URL</label>
                  <input id="newSourceUrl" value={newSource.url} onChange={(event) => setNewSource((current) => ({ ...current, url: event.target.value }))} placeholder="https://example.com/feed.xml" />
                </div>
                <div className="field">
                  <label htmlFor="newSourceFrequency">抓取间隔分钟</label>
                  <input
                    id="newSourceFrequency"
                    type="number"
                    min={60}
                    value={newSource.fetchFrequencyMinutes}
                    onChange={(event) => setNewSource((current) => ({ ...current, fetchFrequencyMinutes: Number(event.target.value) }))}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="button" onClick={closeAddDialog}>取消</button>
              <button className="button primary" onClick={createSource} title="新增来源">
                <Plus size={16} />
                新增来源
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">来源列表</h2>
          <span className="meta">刷新或重新进入页面会恢复最近一次采集结果</span>
        </div>
        <div className="panel-body">
          {rows.length === 0 ? (
            <div className="empty">当前类别没有启用的来源，请新增来源或选择其他类别。</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>状态</th>
                    <th>来源</th>
                    <th>类别</th>
                    <th>类型</th>
                    <th>抓取</th>
                    <th>新增</th>
                    <th>重复</th>
                    <th>跳过</th>
                    <th>失败</th>
                    <th>上次采集</th>
                    <th>详情</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const detailLines = row.errors.length > 0 ? row.errors : row.result?.errors ?? [];
                    const canShowDetails = detailLines.length > 0;
                    return (
                      <tr key={row.id}>
                        <td>
                          <span className={`status-pill ${row.status}`}>
                            <StatusIcon status={row.status} />
                            {statusLabel(row.status)}
                          </span>
                        </td>
                        <td>
                          <strong>{row.name}</strong>
                          <div className="meta">{row.url}</div>
                          {canShowDetails && row.detailsOpen ? (
                            <div className="error-detail">
                              {detailLines.map((line, index) => (
                                <div key={`${row.id}-${index}`}>{line}</div>
                              ))}
                            </div>
                          ) : null}
                        </td>
                        <td>{row.categoryName || "-"}</td>
                        <td>{row.type}</td>
                        <td>{row.result?.fetched ?? "-"}</td>
                        <td>{row.result?.inserted ?? "-"}</td>
                        <td>{row.result?.duplicate ?? "-"}</td>
                        <td>{row.result?.skipped ?? "-"}</td>
                        <td>{row.result?.failed ?? (row.status === "failed" ? 1 : "-")}</td>
                        <td className="meta">{formatLastFetched(row.lastFetchedAt)}</td>
                        <td>
                          {canShowDetails ? (
                            <button className="button" onClick={() => toggleDetails(row.id)} title="查看失败详情">
                              {row.detailsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              详情
                            </button>
                          ) : (
                            <span className="meta">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
