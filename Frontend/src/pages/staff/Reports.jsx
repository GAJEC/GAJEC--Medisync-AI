import { useMemo, useState } from "react";

import searchIcon from "../../assets/icons/search.png";
import scheduleIcon from "../../assets/icons/schedule.png";
import historyIcon from "../../assets/icons/history.png";
import patientsIcon from "../../assets/icons/patients.png";
import "../../assets/styles/Staff.css";

const stats = [
  { label: "Completion rate", value: "88.4%", note: "↑ 2.3% month over month", tone: "teal", glyph: "✓" },
  { label: "Average confirmation", value: "18m", note: "4m faster than May", tone: "blue", icon: historyIcon },
  { label: "No-show rate", value: "4.1%", note: "↓ 0.7% month over month", tone: "amber", icon: patientsIcon },
];

const metrics = [
  { metric: "Appointment volume", thisMonth: "2,842", lastMonth: "2,591", change: "+9.7%", target: "2,700", status: "On track", notes: "Sample data" },
  { metric: "Completion rate", thisMonth: "88.4%", lastMonth: "86.1%", change: "+2.3%", target: "90%", status: "Near target", notes: "Sample data" },
  { metric: "Cancellation rate", thisMonth: "6.2%", lastMonth: "7.4%", change: "-1.2%", target: "< 6%", status: "Review", notes: "Sample data" },
  { metric: "No-show rate", thisMonth: "4.1%", lastMonth: "4.8%", change: "-0.7%", target: "< 4%", status: "Near target", notes: "Sample data" },
];

const dateRange = "Jun 1–24, 2025";

// Wraps a value in quotes so commas and quotes inside it don't break the CSV
const csvCell = (v) => `"${String(v).replace(/"/g, '""')}"`;

export default function Reports() {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return metrics.filter((m) => !q || m.metric.toLowerCase().includes(q) || m.status.toLowerCase().includes(q));
  }, [query]);

  const exportCsv = () => {
    const header = ["Metric", "This month", "Last month", "Change", "Target", "Status", "Notes"];
    const lines = [header, ...visible.map((m) => [m.metric, m.thisMonth, m.lastMonth, m.change, m.target, m.status, m.notes])];
    const csv = lines.map((row) => row.map(csvCell).join(",")).join("\n");

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "operational-report-jun-2025.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="st-page">
      {/* ---------- Title ---------- */}
      <div className="st-pagehead">
        <div>
          <h1 className="st-title">Operational Reports</h1>
          <p className="st-sub">Understand appointment activity using the displayed prototype dataset.</p>
        </div>
        <div className="st-actions">
          <button type="button" className="st-btn">
            <img src={scheduleIcon} alt="" className="st-btn__ico" /> {dateRange}
          </button>
          <button type="button" className="st-btn st-btn--primary" onClick={exportCsv} disabled={visible.length === 0}>
            <span aria-hidden="true">↓</span> Export CSV
          </button>
        </div>
      </div>

      {/* ---------- Stat cards ---------- */}
      <section className="st-stats st-stats--3">
        {stats.map((s) => (
          <article className="st-card st-stat" key={s.label}>
            <span className={`st-stat__icon st-tone--${s.tone}`}>
              {s.icon ? <img src={s.icon} alt="" /> : s.glyph}
            </span>
            <div>
              <p className="st-stat__label">{s.label}</p>
              <p className="st-stat__value">{s.value}</p>
              <p className="st-stat__note">{s.note}</p>
            </div>
          </article>
        ))}
      </section>

      {/* ---------- Table card ---------- */}
      <article className="st-card st-table-card">
        <header className="st-toolbar st-toolbar--top">
          <label className="st-searchbox st-searchbox--sm">
            <img src={searchIcon} alt="" className="st-btn__ico" />
            <input type="search" placeholder="Search reports…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <p className="st-count st-count--right">{visible.length} sample record{visible.length === 1 ? "" : "s"}</p>
        </header>

        <div className="st-tablewrap">
          <table className="st-table st-table--compact">
            <thead>
              <tr>
                <th>Metric</th><th>This month</th><th>Last month</th><th>Change</th>
                <th>Target</th><th>Status</th><th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((m) => (
                <tr key={m.metric}>
                  <td className="st-ref">{m.metric}</td>
                  <td className="st-muted">{m.thisMonth}</td>
                  <td className="st-muted">{m.lastMonth}</td>
                  <td className="st-muted">{m.change}</td>
                  <td className="st-muted">{m.target}</td>
                  <td className="st-muted">{m.status}</td>
                  <td><span className="st-pill st-pill--sample">{m.notes}</span></td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan="7" className="st-empty">No reports match this search. Try a different metric name.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}