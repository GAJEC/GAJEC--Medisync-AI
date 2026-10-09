import { useMemo, useState } from "react";
import StaffStyle from "../../assets/styles/Staff.module.css";

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

// e.g. "Clinical review" -> ai-review-status ai-status-clinical-review
const reviewStatusClass = (s) =>
  `${StaffStyle["ai-review-status"]} ${StaffStyle["ai-status-" + s.toLowerCase().replace(/\s+/g, "-")] || ""}`;

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
    <main className={`${StaffStyle['st-page']} ${StaffStyle['ai-intake-page']}`}>
      <header className={StaffStyle['st-pagehead']}>
        <div>
          <p className={StaffStyle['st-eyebrow']}>HUMAN-IN-THE-LOOP</p>
          <h1 className={StaffStyle['st-title']}>AI Intake &amp; Matching</h1>
          <p className={StaffStyle['st-sub']}>
            Review preliminary routing suggestions before clinical assignment.
          </p>
        </div>

        <div className={StaffStyle['st-actions']}>
          <button
            type="button"
            className={StaffStyle['st-btn']}
            onClick={() => setShowFilters((current) => !current)}
          >
            ⚙ Filters
          </button>

          <button
            type="button"
            className={`${StaffStyle['st-btn']} ${StaffStyle['st-btn--primary']}`}
            onClick={() => {
              setShowQueue((current) => !current);
              setReviewFilter("All statuses");
            }}
          >
            + {showQueue ? "Show all records" : "Review queue"}
            {pendingCount > 0 && ` (${pendingCount})`}
          </button>
        </div>
      </header>

      {showFilters && (
        <section className={StaffStyle['ai-filter-panel']}>
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
            className={StaffStyle['st-btn']}
            onClick={resetFilters}
          >
            Clear filters
          </button>
        </section>
      )}

      {showQueue && (
        <div className={StaffStyle['ai-queue-notice']}>
          Showing pending intake records that require review.
        </div>
      )}

      <section className={StaffStyle['ai-intake-table-card']}>
        <div className={StaffStyle['ai-intake-toolbar']}>
          <div className={StaffStyle['ai-intake-search']}>
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Search intake..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search intake records"
            />
          </div>

          <span className={StaffStyle['ai-record-count']}>
            {filteredIntakes.length} record
            {filteredIntakes.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className={StaffStyle['st-tablewrap']}>
          <table className={`${StaffStyle['st-table']} ${StaffStyle['ai-intake-table']}`}>
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
              {filteredIntakes.map((intake) => (
                <tr key={intake.id}>
                  <td>
                    <strong>{intake.id}</strong>
                  </td>
                  <td>{intake.patient}</td>
                  <td>{intake.concern}</td>
                  <td>{intake.pain}</td>
                  <td>{intake.specialty}</td>
                  <td>{intake.doctor}</td>
                  <td>
                    <span className={reviewStatusClass(intake.reviewStatus)}>
                      {intake.reviewStatus}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={StaffStyle['ai-action-button']}
                      onClick={() => openAction(intake)}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}

              {filteredIntakes.length === 0 && (
                <tr>
                  <td colSpan="8" className={StaffStyle['ai-no-results']}>
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

      <aside className={StaffStyle['ai-safety-notice']}>
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
          className={StaffStyle['ai-modal-overlay']}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeAction();
          }}
        >
          <section
            className={StaffStyle['ai-action-modal']}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-action-title"
          >
            <header className={StaffStyle['ai-modal-header']}>
              <div>
                <p className={StaffStyle['st-eyebrow']}>HealthLocal AI</p>
                <h2 id="ai-action-title">
                  AI Intake &amp; Matching action
                </h2>
              </div>

              <button
                type="button"
                className={StaffStyle['ai-modal-close']}
                onClick={closeAction}
                aria-label="Close dialog"
              >
                ×
              </button>
            </header>

            <form onSubmit={saveChanges}>
              <div className={StaffStyle['ai-modal-body']}>
                <div className={StaffStyle['ai-authorized-notice']}>
                  <strong>✦ Authorized action</strong>
                  <p>
                    Changes are simulated and will be recorded in this
                    page's sample data while it remains open.
                  </p>
                </div>

                <div className={StaffStyle['ai-form-grid']}>
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

                <label className={StaffStyle['ai-notes-field']}>
                  Notes
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Add an optional audit note..."
                    rows={4}
                  />
                </label>

                {error && (
                  <p className={StaffStyle['ai-form-error']} role="alert">
                    {error}
                  </p>
                )}
              </div>

              <footer className={StaffStyle['ai-modal-footer']}>
                <button
                  type="button"
                  className={StaffStyle['st-btn']}
                  onClick={closeAction}
                >
                  Cancel
                </button>

                <button type="submit" className={`${StaffStyle['st-btn']} ${StaffStyle['st-btn--primary']}`}>
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
