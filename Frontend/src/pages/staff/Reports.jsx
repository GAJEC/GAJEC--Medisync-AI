import { useMemo, useState } from "react";

import { staffApi } from "../../api/client";
import { useStaffData } from "../../components/staff/useStaffData";

import searchIcon from "../../assets/icons/search.png";
import scheduleIcon from "../../assets/icons/schedule.png";
import historyIcon from "../../assets/icons/history.png";
import patientsIcon from "../../assets/icons/patients.png";
import StaffStyle from "../../assets/styles/Staff.module.css";

const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const monthLabel = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

const rangeLabel = (from, to) => {
  if (!from || !to) return "";
  const f = new Date(`${from}T00:00:00`);
  const t = new Date(`${to}T00:00:00`);
  return `${f.toLocaleDateString("en-US", { month: "short", day: "numeric" })}–${t.toLocaleDateString("en-US", { day: "numeric", year: "numeric" })}`;
};

const signed = (v, unit) => (v == null ? null : `${v > 0 ? "↑" : v < 0 ? "↓" : "→"} ${Math.abs(v)}${unit}`);

// Wraps a value in quotes so commas and quotes inside it don't break the CSV
const csvCell = (v) => `"${String(v).replace(/"/g, '""')}"`;

export default function Reports() {
  const [month, setMonth] = useState(thisMonth());
  const [query, setQuery] = useState("");
  const { data, error, loading } = useStaffData((t) => staffApi.reports(t, { month }), [month]);

  const metrics = useMemo(() => data?.metrics ?? [], [data]);
  const s = data?.stats;
  const stats = [
    {
      label: "Completion rate", tone: "teal", glyph: "✓",
      value: s ? `${s.completionRate}%` : "—",
      note: s ? `${signed(s.completionChange, "%")} month over month` : "",
    },
    {
      label: "Average response", tone: "blue", icon: historyIcon,
      value: s?.avgConfirmMinutes != null ? `${s.avgConfirmMinutes}m` : "—",
      note: s?.avgConfirmChange != null
        ? `${Math.abs(s.avgConfirmChange)}m ${s.avgConfirmChange <= 0 ? "faster" : "slower"} than last month`
        : "Booking to first staff action",
    },
    {
      label: "No-show rate", tone: "amber", icon: patientsIcon,
      value: s ? `${s.noShowRate}%` : "—",
      note: s ? `${signed(s.noShowChange, "%")} month over month` : "",
    },
  ];

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return metrics.filter((m) => !q || m.metric.toLowerCase().includes(q) || m.status.toLowerCase().includes(q));
  }, [metrics, query]);

  const exportCsv = () => {
    const header = ["Metric", "This month", "Last month", "Change", "Target", "Status"];
    const lines = [header, ...visible.map((m) => [m.metric, m.thisMonth, m.lastMonth, m.change, m.target, m.status])];
    const csv = lines.map((row) => row.map(csvCell).join(",")).join("\n");

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `operational-report-${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={StaffStyle['st-page']}>
      {/* ---------- Title ---------- */}
      <div className={StaffStyle['st-pagehead']}>
        <div>
          <h1 className={StaffStyle['st-title']}>Operational Reports</h1>
          <p className={StaffStyle['st-sub']}>
            {monthLabel(month)} compared with the previous month{data ? ` · ${rangeLabel(data.from, data.to)}` : ""}.
          </p>
        </div>
        <div className={StaffStyle['st-actions']}>
          <label className={StaffStyle['st-btn']}>
            <img src={scheduleIcon} alt="" className={StaffStyle['st-btn__ico']} />
            <input type="month" value={month} max={thisMonth()} onChange={(e) => e.target.value && setMonth(e.target.value)}
                   aria-label="Report month" style={{ border: 0, background: "none", font: "inherit", color: "inherit" }} />
          </label>
          <button type="button" className={`${StaffStyle['st-btn']} ${StaffStyle['st-btn--primary']}`} onClick={exportCsv} disabled={visible.length === 0}>
            <span aria-hidden="true">↓</span> Export CSV
          </button>
        </div>
      </div>

      {error && <p className={StaffStyle['st-alert']} role="alert">{error}</p>}

      {/* ---------- Stat cards ---------- */}
      <section className={`${StaffStyle['st-stats']} ${StaffStyle['st-stats--3']} ${loading ? StaffStyle['st-loading'] : ""}`}>
        {stats.map((st) => (
          <article className={`${StaffStyle['st-card']} ${StaffStyle['st-stat']}`} key={st.label}>
            <span className={`${StaffStyle['st-stat__icon']} ${StaffStyle[`st-tone--${st.tone}`]}`}>
              {st.icon ? <img src={st.icon} alt="" /> : st.glyph}
            </span>
            <div>
              <p className={StaffStyle['st-stat__label']}>{st.label}</p>
              <p className={StaffStyle['st-stat__value']}>{st.value}</p>
              <p className={StaffStyle['st-stat__note']}>{st.note}</p>
            </div>
          </article>
        ))}
      </section>

      {/* ---------- Table card ---------- */}
      <article className={`${StaffStyle['st-card']} ${StaffStyle['st-table-card']} ${loading ? StaffStyle['st-loading'] : ""}`}>
        <header className={`${StaffStyle['st-toolbar']} ${StaffStyle['st-toolbar--top']}`}>
          <label className={`${StaffStyle['st-searchbox']} ${StaffStyle['st-searchbox--sm']}`}>
            <img src={searchIcon} alt="" className={StaffStyle['st-btn__ico']} />
            <input type="search" placeholder="Search reports…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <p className={`${StaffStyle['st-count']} ${StaffStyle['st-count--right']}`}>{visible.length} metric{visible.length === 1 ? "" : "s"}</p>
        </header>

        <div className={StaffStyle['st-tablewrap']}>
          <table className={`${StaffStyle['st-table']} ${StaffStyle['st-table--compact']}`}>
            <thead>
              <tr>
                <th>Metric</th><th>This month</th><th>Last month</th><th>Change</th>
                <th>Target</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((m) => (
                <tr key={m.metric}>
                  <td className={StaffStyle['st-ref']}>{m.metric}</td>
                  <td className={StaffStyle['st-muted']}>{m.thisMonth}</td>
                  <td className={StaffStyle['st-muted']}>{m.lastMonth}</td>
                  <td className={StaffStyle['st-muted']}>{m.change}</td>
                  <td className={StaffStyle['st-muted']}>{m.target}</td>
                  <td className={StaffStyle['st-muted']}>{m.status}</td>
                </tr>
              ))}
              {!loading && visible.length === 0 && (
                <tr><td colSpan="6" className={StaffStyle['st-empty']}>
                  {metrics.length === 0 ? "No report data yet." : "No reports match this search. Try a different metric name."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}
