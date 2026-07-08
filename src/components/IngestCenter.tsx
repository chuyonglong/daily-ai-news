"use client";

import { CheckCircle2, ChevronDown, ChevronUp, Circle, Loader2, MinusCircle, Play, RefreshCcw, XCircle } from "lucide-react";
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
  initialDefaultCategoryScope: string;
};

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

export function IngestCenter({ initialRun, initialCategories, initialDefaultCategoryScope }: IngestCenterProps) {
  const initialCategoryScope = initialDefaultCategoryScope;
  const [categories] = useState(initialCategories);
  const [categoryScope, setCategoryScope] = useState(initialRun.categoryScope || initialCategoryScope);
  const [run, setRun] = useState(initialRun);
  const [rows, setRows] = useState<SourceRow[]>(() => rowsFromRun(initialRun));
  const [message, setMessage] = useState(initialRun.message);
  const [refreshing, setRefreshing] = useState(false);

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

      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">来源列表</h2>
          <span className="meta">刷新或重新进入页面会恢复最近一次采集结果</span>
        </div>
        <div className="panel-body">
          {rows.length === 0 ? (
            <div className="empty">
              当前类别没有启用的来源，请到 <a href="/sources">来源管理</a> 添加或启用来源。
            </div>
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
