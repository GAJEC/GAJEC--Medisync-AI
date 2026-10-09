import { useMemo, useState } from "react";
import "../../assets/styles/Staff.css";
=======
>>>>>>> e3bbfeb67c065bb1c352f8afcc950969f241ae4a

const INITIAL_INTAKES = [
  {
    id: "AI-250624-109",
    patient: "P-20481",
    concern: "Recurring headache",
    pain: "4/10",
    specialty: "Internal Medicine",
    doctor: "Dr. Maria Santos",
    reviewStatus: "Pending",
    status: "Active",
    notes: "",
  },
  {
    id: "AI-250624-108",
    patient: "P-20479",
    concern: "Persistent cough",
    pain: "2/10",
    specialty: "Family Medicine",
    doctor: "Dr. Daniel Reyes",
    reviewStatus: "Reviewed",
    status: "Active",
    notes: "",
  },
  {
    id: "AI-250624-104",
    patient: "P-20461",
    concern: "Severe chest pain",
    pain: "9/10",
    specialty: "Emergency",
    doctor: "Escalated",
    reviewStatus: "Clinical review",
    status: "Escalated",
    notes: "",
  },
];

const REVIEW_STATUSES = [
  "Pending",
  "Reviewed",
  "Clinical review",
];

const ACTION_STATUSES = [
  "Active",
  "Reviewed",
  "Escalated",
  "Closed",
];

export default function AIIntake() {
  const [intakes, setIntakes] = useState(INITIAL_INTAKES);
  const [search, setSearch] = useState("");
  const [reviewFilter, setReviewFilter] = useState("All statuses");
  const [showFilters, setShowFilters] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [selectedIntake, setSelectedIntake] = useState(null);
  const [actionStatus, setActionStatus] = useState("Active");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const pendingCount = intakes.filter(
    (intake) => intake.reviewStatus === "Pending"
  ).length;
=======
const statusClass = (s) => `${StaffStyle["st-pill"]} ${StaffStyle["st-pill--" + s.toLowerCase().replace(/\s+/g, "-")]}`;
>>>>>>> e3bbfeb67c065bb1c352f8afcc950969f241ae4a

  const filteredIntakes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return intakes.filter((intake) => {
      const matchesSearch = [
        intake.id,
        intake.patient,
        intake.concern,
        intake.specialty,
        intake.doctor,
      ].some((value) => value.toLowerCase().includes(query));

      const matchesStatus =
        reviewFilter === "All statuses" ||
        intake.reviewStatus === reviewFilter;

      const matchesQueue =
        !showQueue || intake.reviewStatus === "Pending";

      return matchesSearch && matchesStatus && matchesQueue;
    });
  }, [intakes, search, reviewFilter, showQueue]);

  function openAction(intake) {
    setSelectedIntake({ ...intake });
    setActionStatus(intake.status || "Active");
    setNotes(intake.notes || "");
    setError("");
  }

  function closeAction() {
    setSelectedIntake(null);
    setError("");
  }

  function saveChanges(event) {
    event.preventDefault();

    if (!selectedIntake) return;

    setIntakes((current) =>
      current.map((intake) => {
        if (intake.id !== selectedIntake.id) return intake;

        let nextReviewStatus = intake.reviewStatus;

        if (actionStatus === "Reviewed") {
          nextReviewStatus = "Reviewed";
        } else if (actionStatus === "Escalated") {
          nextReviewStatus = "Clinical review";
        } else if (actionStatus === "Closed") {
          nextReviewStatus = "Reviewed";
        }

        return {
          ...intake,
          status: actionStatus,
          reviewStatus: nextReviewStatus,
          notes: notes.trim(),
        };
      })
    );

    closeAction();
  }

  function resetFilters() {
    setSearch("");
    setReviewFilter("All statuses");
    setShowQueue(false);
  }

  return (
    <main className="st-page ai-intake-page">
      <header className="st-pagehead">
        <div>
          <p className="st-eyebrow">HUMAN-IN-THE-LOOP</p>
          <h1 className="st-title">AI Intake &amp; Matching</h1>
          <p className="st-sub">
            Review preliminary routing suggestions before clinical assignment.
          </p>
        </div>

        <div className="st-actions">
          <button
            type="button"
            className="st-btn"
            onClick={() => setShowFilters((current) => !current)}
          >
            ⚙ Filters
          </button>

          <button
            type="button"
            className="st-btn st-btn--primary"
            onClick={() => {
              setShowQueue((current) => !current);
              setReviewFilter("All statuses");
            }}
          >
            + {showQueue ? "Show all records" : "Review queue"}
            {pendingCount > 0 && ` (${pendingCount})`}
=======
    <div className={StaffStyle['st-page']}>
      {/* ---------- Title ---------- */}
      <div className={StaffStyle['st-pagehead']}>
        <div>
          <p className={StaffStyle['st-eyebrow']}>Tuesday, June 24, 2025</p>
          <h1 className={StaffStyle['st-title']}>Hospital Operations Dashboard</h1>
          <p className={StaffStyle['st-sub']}>A live prototype view of today's appointment activity.</p>
        </div>
        <div className={StaffStyle['st-actions']}>
          <button type="button" className={StaffStyle['st-btn']}>
            <img src={scheduleIcon} alt="" className={StaffStyle['st-btn__ico']} /> Jun 24, 2025
          </button>
          <button type="button" className={`${StaffStyle['st-btn']} ${StaffStyle['st-btn--primary']}`} onClick={goToAppointments}>
            Review requests <img src={nextIcon} alt="" className={`${StaffStyle['st-btn__ico']} ${StaffStyle['st-btn__ico--white']}`} />
>>>>>>> e3bbfeb67c065bb1c352f8afcc950969f241ae4a
          </button>
        </div>
      </header>

      {showFilters && (
        <section className="ai-filter-panel">
          <label>
            Review status
            <select
              value={reviewFilter}
              onChange={(event) => setReviewFilter(event.target.value)}
            >
              <option>All statuses</option>
              {REVIEW_STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="st-btn"
            onClick={resetFilters}
          >
            Clear filters
          </button>
        </section>
      )}

      {showQueue && (
        <div className="ai-queue-notice">
          Showing pending intake records that require review.
        </div>
      )}

      <section className="ai-intake-table-card">
        <div className="ai-intake-toolbar">
          <div className="ai-intake-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Search intake..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search intake records"
            />
          </div>

          <span className="ai-record-count">
            {filteredIntakes.length} record
            {filteredIntakes.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="st-tablewrap">
          <table className="st-table ai-intake-table">
          <button type="button" className={StaffStyle['st-link']} onClick={goToAppointments}>
            View all <img src={nextIcon} alt="" className={StaffStyle['st-btn__ico']} />
          </button>
        </header>
        <div className={StaffStyle['st-tablewrap']}>
          <table className={StaffStyle['st-table']}>
<<<<<<< HEAD
>>>>>>> e3bbfeb67c065bb1c352f8afcc950969f241ae4a
=======
>>>>>>> e3bbfeb67c065bb1c352f8afcc950969f241ae4a
            <thead>
              <tr>
                <th>Intake ID</th>
                <th>Patient</th>
                <th>Reported concern</th>
                <th>Pain</th>
                <th>Suggested specialty</th>
                <th>Doctor</th>
                <th>Review status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
=======
>>>>>>> e3bbfeb67c065bb1c352f8afcc950969f241ae4a
                </tr>
              ))}

              {filteredIntakes.length === 0 && (
                <tr>
                  <td colSpan="8" className="ai-no-results">
                    No matching intake records found.
                    <button type="button" onClick={resetFilters}>
                      Clear filters
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="ai-safety-notice">
        <span aria-hidden="true">⛨</span>
        <div>
          <strong>AI suggestions are preliminary.</strong>
          <p>
            They explain hospital-configured specialty and availability
            criteria; they do not provide a diagnosis. Urgent cases follow
            the hospital escalation process.
          </p>
        </div>
      </aside>

      {selectedIntake && (
        <div
          className="ai-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeAction();
          }}
        >
          <section
            className="ai-action-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-action-title"
          >
            <header className="ai-modal-header">
              <div>
                <p className="st-eyebrow">HealthLocal AI</p>
                <h2 id="ai-action-title">
                  AI Intake &amp; Matching action
                </h2>
              </div>

              <button
                type="button"
                className="ai-modal-close"
                onClick={closeAction}
                aria-label="Close dialog"
              >
                ×
              </button>
            </header>

            <form onSubmit={saveChanges}>
              <div className="ai-modal-body">
                <div className="ai-authorized-notice">
                  <strong>✦ Authorized action</strong>
                  <p>
                    Changes are simulated and will be recorded in this
                    page's sample data while it remains open.
                  </p>
                </div>

                <div className="ai-form-grid">
                  <label>
                    Selection
                    <input
                      value={selectedIntake.id}
                      readOnly
                    />
                  </label>

                  <label>
                    Status
                    <select
                      value={actionStatus}
                      onChange={(event) =>
                        setActionStatus(event.target.value)
                      }
                    >
                      {ACTION_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="ai-notes-field">
                  Notes
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Add an optional audit note..."
                    rows={4}
                  />
                </label>

                {error && (
                  <p className="ai-form-error" role="alert">
                    {error}
                  </p>
                )}
              </div>

              <footer className="ai-modal-footer">
                <button
                  type="button"
                  className="st-btn"
                  onClick={closeAction}
                >
                  Cancel
                </button>

                <button type="submit" className="st-btn st-btn--primary">
                  Save changes
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}