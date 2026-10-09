import { useMemo, useState } from "react";

import { staffApi } from "../../api/client";
import { isoDay, useDebounced, useStaffData } from "../../components/staff/useStaffData";
import ModalShell from "../../components/staff/ModalShell";

import searchIcon from "../../assets/icons/search.png";
import settingsIcon from "../../assets/icons/settings.png";
import nextIcon from "../../assets/icons/next.png";
import StaffStyle from "../../assets/styles/Staff.module.css";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const statuses = ["Active", "Leave", "Blocked"];
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const mondayOf = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
};

// "June 23–27, 2025" (handles weeks that cross a month)
function weekLabel(start) {
  const end = new Date(start);
  end.setDate(end.getDate() + 4);
  const sameMonth = start.getMonth() === end.getMonth();
  return `${months[start.getMonth()]} ${start.getDate()}–${sameMonth ? "" : months[end.getMonth()] + " "}${end.getDate()}, ${end.getFullYear()}`;
}

const isOff = (cell) => cell === "Leave" || cell === "Blocked";

export default function Scheduling() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [query, setQuery] = useState("");
  const search = useDebounced(query.trim());
  const [showFilters, setShowFilters] = useState(false);
  const [conflictFilter, setConflictFilter] = useState("");
  const [selectedId, setSelectedId] = useState(null); // null = pop-up closed

  const monday = useMemo(() => {
    const d = mondayOf(new Date());
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);
  const weekStart = isoDay(monday);

  const { data, error, loading, reload, token } = useStaffData(
    (t) => staffApi.schedule(t, { weekStart, search }),
    [weekStart, search],
  );
  const rows = data?.schedules ?? [];
  const flagged = rows.reduce((sum, r) => sum + r.conflicts, 0);

  const visible = rows.filter(
    (r) => !conflictFilter || (conflictFilter === "None" ? r.conflicts === 0 : r.conflicts > 0),
  );

  const done = () => {
    setSelectedId(null);
    reload();
  };

  return (
    <div className={StaffStyle['st-page']}>
      {/* ---------- Title ---------- */}
      <div className={StaffStyle['st-pagehead']}>
        <div>
          <h1 className={StaffStyle['st-title']}>Doctor Scheduling &amp; Availability</h1>
          <p className={StaffStyle['st-sub']}>Set leave and blocked days; working hours are edited on the doctor profile.</p>
        </div>
        <div className={StaffStyle['st-actions']}>
          <button type="button" className={StaffStyle['st-btn']} onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
            <img src={settingsIcon} alt="" className={StaffStyle['st-btn__ico']} /> Filters
          </button>
          <button type="button" className={`${StaffStyle['st-btn']} ${StaffStyle['st-btn--primary']}`}
                  onClick={() => setSelectedId(rows[0]?.id ?? null)} disabled={rows.length === 0}>
            <span className={StaffStyle['st-btn__plus']} aria-hidden="true">+</span> Block time
          </button>
        </div>
      </div>

      {/* ---------- Week bar ---------- */}
      <div className={`${StaffStyle['st-card']} ${StaffStyle['st-weekbar']}`}>
        <div className={StaffStyle['st-weekbar__nav']}>
          <button type="button" className={StaffStyle['st-weekbtn']} onClick={() => setWeekOffset((w) => w - 1)} aria-label="Previous week">
            <img src={nextIcon} alt="" className={`${StaffStyle['st-btn__ico']} ${StaffStyle['st-ico--flip']}`} />
          </button>
          <strong className={StaffStyle['st-weekbar__label']}>{weekLabel(monday)}</strong>
          <button type="button" className={StaffStyle['st-weekbtn']} onClick={() => setWeekOffset((w) => w + 1)} aria-label="Next week">
            <img src={nextIcon} alt="" className={StaffStyle['st-btn__ico']} />
          </button>
          {weekOffset !== 0 && (
            <button type="button" className={StaffStyle['st-link']} onClick={() => setWeekOffset(0)}>This week</button>
          )}
        </div>
        {flagged > 0 && (
          <span className={StaffStyle['st-flag']}>{flagged} schedule conflict{flagged === 1 ? "" : "s"} require{flagged === 1 ? "s" : ""} review</span>
        )}
      </div>

      {error && <p className={StaffStyle['st-alert']} role="alert">{error}</p>}

      {/* ---------- Table card ---------- */}
      <article className={`${StaffStyle['st-card']} ${StaffStyle['st-table-card']} ${loading ? StaffStyle['st-loading'] : ""}`}>
        <header className={`${StaffStyle['st-toolbar']} ${StaffStyle['st-toolbar--top']}`}>
          <label className={`${StaffStyle['st-searchbox']} ${StaffStyle['st-searchbox--sm']}`}>
            <img src={searchIcon} alt="" className={StaffStyle['st-btn__ico']} />
            <input type="search" placeholder="Search doctors…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          {showFilters && (
            <select className={StaffStyle['st-select']} value={conflictFilter} onChange={(e) => setConflictFilter(e.target.value)} aria-label="Filter by conflicts">
              <option value="">All conflicts</option>
              <option>None</option>
              <option>Flagged</option>
            </select>
          )}
          <p className={`${StaffStyle['st-count']} ${StaffStyle['st-count--right']}`}>{visible.length} schedule{visible.length === 1 ? "" : "s"}</p>
        </header>

        <div className={StaffStyle['st-tablewrap']}>
          <table className={`${StaffStyle['st-table']} ${StaffStyle['st-table--compact']}`}>
            <thead>
              <tr>
                <th>Doctor</th>
                {DAYS.map((d, i) => (
                  <th key={d}>{d}{data?.days?.[i] && <small style={{ display: "block", fontWeight: 400 }}>{data.days[i].slice(5)}</small>}</th>
                ))}
                <th>Conflicts</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className={StaffStyle['st-row--click']} tabIndex={0}
                    onClick={() => setSelectedId(r.id)}
                    onKeyDown={(e) => e.key === "Enter" && setSelectedId(r.id)}
                    title={r.notes || undefined}>
                  <td className={StaffStyle['st-ref']}>{r.name}</td>
                  {r.week.map((cell, i) => (
                    <td key={DAYS[i]} className={isOff(cell) ? StaffStyle['st-cell--off'] : StaffStyle['st-muted']}>{cell}</td>
                  ))}
                  <td>
                    {r.conflicts === 0
                      ? <span className={`${StaffStyle['st-pill']} ${StaffStyle['st-pill--none']}`}>None</span>
                      : <span className={`${StaffStyle['st-pill']} ${StaffStyle['st-pill--flagged']}`} title="Appointments booked on a leave/blocked day or outside working hours">{r.conflicts} flagged</span>}
                  </td>
                </tr>
              ))}
              {!loading && visible.length === 0 && (
                <tr><td colSpan="7" className={StaffStyle['st-empty']}>
                  {search || conflictFilter ? "No schedules match. Clear the search or the filter." : "No active doctors yet. Add doctors on the Doctors page."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      {selectedId && (
        <ScheduleActionModal
          token={token}
          doctors={rows}
          initialId={selectedId}
          weekStart={weekStart}
          weekLabel={weekLabel(monday)}
          onClose={() => setSelectedId(null)}
          onDone={done}
        />
      )}
    </div>
  );
}

/* ---------- Pop-up ---------- */
function ScheduleActionModal({ token, doctors, initialId, weekStart, weekLabel: label, onClose, onDone }) {
  const [form, setForm] = useState({ doctorId: initialId, status: "Leave", day: "Monday", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await staffApi.setSchedule(token, {
        doctorId: Number(form.doctorId),
        weekStart,
        day: form.day,
        status: form.status,
        ...(form.notes.trim() && { notes: form.notes.trim() }),
      });
      onDone();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <ModalShell
      titleId="sched-title"
      title="Doctor availability"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={StaffStyle['st-btn']} onClick={onClose}>Cancel</button>
          <button type="button" className={`${StaffStyle['st-btn']} ${StaffStyle['st-btn--primary']}`} onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </>
      }
    >
      {error && <p className={StaffStyle['st-modal__error']} role="alert">{error}</p>}

      <p className={`${StaffStyle['st-muted']} ${StaffStyle['st-field--full']}`} style={{ margin: 0 }}>Week of {label}</p>

      <label className={StaffStyle['st-field']}>
        <span>Doctor</span>
        <select value={form.doctorId} onChange={set("doctorId")}>
          {doctors.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </label>

      <label className={StaffStyle['st-field']}>
        <span>Availability</span>
        <select value={form.status} onChange={set("status")}>
          {statuses.map((s) => <option key={s} value={s}>{s === "Active" ? "Available (normal hours)" : s}</option>)}
        </select>
      </label>

      <label className={`${StaffStyle['st-field']} ${StaffStyle['st-field--full']}`}>
        <span>Day</span>
        <select value={form.day} onChange={set("day")}>
          {DAYS.map((d) => <option key={d}>{d}</option>)}
          <option>Whole week</option>
        </select>
      </label>

      <label className={`${StaffStyle['st-field']} ${StaffStyle['st-field--full']}`}>
        <span>Notes</span>
        <textarea rows="3" maxLength={500} placeholder="Optional reason (no patient health details)…" value={form.notes} onChange={set("notes")} />
      </label>
    </ModalShell>
  );
}
