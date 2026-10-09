import { useEffect, useMemo, useState } from "react";

import searchIcon from "../../assets/icons/search.png";
import settingsIcon from "../../assets/icons/settings.png";
import nextIcon from "../../assets/icons/next.png";
import "../../assets/styles/Staff.css";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const initialSchedule = [
  { id: 1, name: "Dr. Maria Santos", hours: "8:00–17:00", week: ["8:00–17:00", "8:00–17:00", "8:00–17:00", "8:00–17:00", "8:00–15:00"], conflicts: 0, notes: "" },
  { id: 2, name: "Dr. Daniel Reyes", hours: "9:00–18:00", week: ["9:00–18:00", "9:00–18:00", "Leave", "9:00–18:00", "9:00–18:00"], conflicts: 1, notes: "" },
  { id: 3, name: "Dr. Angela Cruz", hours: "8:00–16:00", week: ["8:00–16:00", "8:00–16:00", "8:00–16:00", "Blocked", "8:00–16:00"], conflicts: 0, notes: "" },
];

const statuses = ["Active", "Leave", "Blocked"];
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const baseMonday = new Date(2025, 5, 23); // June 23, 2025

// "June 23–27, 2025" (handles weeks that cross a month)
function weekLabel(offset) {
  const start = new Date(baseMonday);
  start.setDate(start.getDate() + offset * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 4);
  const sameMonth = start.getMonth() === end.getMonth();
  return `${months[start.getMonth()]} ${start.getDate()}–${sameMonth ? "" : months[end.getMonth()] + " "}${end.getDate()}, ${end.getFullYear()}`;
}

const isOff = (cell) => cell === "Leave" || cell === "Blocked";

export default function Scheduling() {
  const [rows, setRows] = useState(initialSchedule);
  const [weekOffset, setWeekOffset] = useState(0);
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [conflictFilter, setConflictFilter] = useState("");
  const [selectedId, setSelectedId] = useState(null); // null = pop-up closed

  const flagged = rows.reduce((sum, r) => sum + r.conflicts, 0);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!q || r.name.toLowerCase().includes(q)) &&
        (!conflictFilter || (conflictFilter === "None" ? r.conflicts === 0 : r.conflicts > 0))
    );
  }, [rows, query, conflictFilter]);

  const handleSave = ({ id, status, day, notes }) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const value = status === "Active" ? r.hours : status; // Active restores normal hours
        const week = r.week.map((cell, i) => (day === "Whole week" || days[i] === day ? value : cell));
        return { ...r, week, notes };
      })
    );
    setSelectedId(null);
  };

  return (
    <div className="st-page">
      {/* ---------- Title ---------- */}
      <div className="st-pagehead">
        <div>
          <h1 className="st-title">Doctor Scheduling &amp; Availability</h1>
          <p className="st-sub">Set working hours, breaks, leave, and booking limits.</p>
        </div>
        <div className="st-actions">
          <button type="button" className="st-btn" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
            <img src={settingsIcon} alt="" className="st-btn__ico" /> Filters
          </button>
          <button type="button" className="st-btn st-btn--primary" onClick={() => setSelectedId(rows[0].id)}>
            <span className="st-btn__plus" aria-hidden="true">+</span> Block time
          </button>
        </div>
      </div>

      {/* ---------- Week bar ---------- */}
      <div className="st-card st-weekbar">
        <div className="st-weekbar__nav">
          <button type="button" className="st-weekbtn" onClick={() => setWeekOffset((w) => w - 1)} aria-label="Previous week">
            <img src={nextIcon} alt="" className="st-btn__ico st-ico--flip" />
          </button>
          <strong className="st-weekbar__label">{weekLabel(weekOffset)}</strong>
          <button type="button" className="st-weekbtn" onClick={() => setWeekOffset((w) => w + 1)} aria-label="Next week">
            <img src={nextIcon} alt="" className="st-btn__ico" />
          </button>
        </div>
        {flagged > 0 && (
          <span className="st-flag">{flagged} schedule conflict{flagged === 1 ? "" : "s"} require{flagged === 1 ? "s" : ""} review</span>
        )}
      </div>

      {/* ---------- Table card ---------- */}
      <article className="st-card st-table-card">
        <header className="st-toolbar st-toolbar--top">
          <label className="st-searchbox st-searchbox--sm">
            <img src={searchIcon} alt="" className="st-btn__ico" />
            <input type="search" placeholder="Search scheduling…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          {showFilters && (
            <select className="st-select" value={conflictFilter} onChange={(e) => setConflictFilter(e.target.value)} aria-label="Filter by conflicts">
              <option value="">All conflicts</option>
              <option>None</option>
              <option>Flagged</option>
            </select>
          )}
          <p className="st-count st-count--right">{visible.length} sample record{visible.length === 1 ? "" : "s"}</p>
        </header>

        <div className="st-tablewrap">
          <table className="st-table st-table--compact">
            <thead>
              <tr>
                <th>Doctor</th>
                {days.map((d) => <th key={d}>{d}</th>)}
                <th>Conflicts</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="st-row--click" tabIndex={0}
                    onClick={() => setSelectedId(r.id)}
                    onKeyDown={(e) => e.key === "Enter" && setSelectedId(r.id)}>
                  <td className="st-ref">{r.name}</td>
                  {r.week.map((cell, i) => (
                    <td key={days[i]} className={isOff(cell) ? "st-cell--off" : "st-muted"}>{cell}</td>
                  ))}
                  <td>
                    {r.conflicts === 0
                      ? <span className="st-pill st-pill--none">None</span>
                      : <span className="st-pill st-pill--flagged">{r.conflicts} flagged</span>}
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan="7" className="st-empty">No schedules match. Clear the search or the filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      {selectedId && (
        <ScheduleActionModal
          doctors={rows}
          initialId={selectedId}
          onClose={() => setSelectedId(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

/* ---------- Pop-up ---------- */
function ScheduleActionModal({ doctors, initialId, onClose, onSave }) {
  const first = doctors.find((r) => r.id === initialId);
  const [form, setForm] = useState({ id: first.id, status: "Active", day: "Monday", notes: first.notes });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const changeSelection = (e) => {
    const next = doctors.find((r) => r.id === Number(e.target.value));
    setForm((f) => ({ ...f, id: next.id, notes: next.notes }));
  };

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="st-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="st-modal" role="dialog" aria-modal="true" aria-labelledby="sched-title">
        <header className="st-modal__head">
          <div>
            <p className="st-modal__brand">HealthLocal AI</p>
            <h2 id="sched-title" className="st-modal__title">Doctor Scheduling &amp; Availability action</h2>
          </div>
          <button type="button" className="st-modal__close" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <div className="st-modal__body">
          <div className="st-callout st-field--full">
            <img src={settingsIcon} alt="" className="st-callout__ico" />
            <div>
              <strong>Authorized action</strong>
              <p>Changes are simulated and will be recorded in the sample activity log.</p>
            </div>
          </div>

          <label className="st-field">
            <span>Selection</span>
            <select value={form.id} onChange={changeSelection}>
              {doctors.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>

          <label className="st-field">
            <span>Status</span>
            <select value={form.status} onChange={set("status")}>
              {statuses.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>

          <label className="st-field st-field--full">
            <span>Day</span>
            <select value={form.day} onChange={set("day")}>
              {days.map((d) => <option key={d}>{d}</option>)}
              <option>Whole week</option>
            </select>
          </label>

          <label className="st-field st-field--full">
            <span>Notes</span>
            <textarea rows="3" placeholder="Add an optional audit note…" value={form.notes} onChange={set("notes")} />
          </label>
        </div>

        <footer className="st-modal__foot">
          <button type="button" className="st-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="st-btn st-btn--primary" onClick={() => onSave(form)}>Save changes</button>
        </footer>
      </div>
    </div>
  );
}