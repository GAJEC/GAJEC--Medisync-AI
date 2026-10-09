import { NavLink, Outlet } from "react-router-dom";
import "./StaffLayout.css";

import heartIcon from "../../assets/icons/heart.png";
import hospitalIcon from "../../assets/icons/hospital.png";
import heartBeatIcon from "../../assets/icons/heart-beat.png";
import scheduleIcon from "../../assets/icons/schedule.png";
import aiIcon from "../../assets/icons/ai.png";
import stetIcon from "../../assets/icons/stet.png";
import historyIcon from "../../assets/icons/history.png";
import patientsIcon from "../../assets/icons/patients.png";
import barChartIcon from "../../assets/icons/bar-chart.png";
import profileIcon from "../../assets/icons/profile.png";
import logoutIcon from "../../assets/icons/logout.png";
import nextIcon from "../../assets/icons/next.png";
import searchIcon from "../../assets/icons/search.png";
import moonIcon from "../../assets/icons/moon.png";
import bellIcon from "../../assets/icons/notification.png";

// One nav item = one page file. Change paths to match your routes.
const sections = [
  {
    label: "Overview",
    items: [
      { to: "/staff/dashboard", text: "Dashboard", icon: heartBeatIcon },
      { to: "/staff/appointments", text: "Appointments", icon: scheduleIcon },
      { to: "/staff/ai-intake", text: "AI Intake & Matching", icon: aiIcon, badge: 8 },
    ],
  },
  {
    label: "People & Resources",
    items: [
      { to: "/staff/doctors", text: "Doctors", icon: stetIcon },
      { to: "/staff/scheduling", text: "Scheduling", icon: historyIcon },
      { to: "/staff/patients", text: "Patients", icon: patientsIcon },
      { to: "/staff/departments", text: "Departments", icon: hospitalIcon },
    ],
  },
  {
    label: "Administration",
    items: [
      { to: "/staff/reports", text: "Reports", icon: barChartIcon },
      { to: "/staff/permissions", text: "Staff & Permissions", icon: profileIcon },
    ],
  },
];

const currentUser = { name: "Ana Mendoza", role: "Hospital Administrator", initials: "AM" };
const workspace = "St. Gabriel Medical";

export default function StaffLayout({ onLogout, onToggleTheme, hasNotifications = true }) {
  return (
    <div className="sx-shell">
      {/* ================= SIDEBAR ================= */}
      <aside className="sx-sidebar">
        <div className="sx-brand">
          <span className="sx-brand__logo">
            <img src={heartIcon} alt="" className="sx-ico" />
          </span>
          <span className="sx-brand__name">HealthLocal <em>AI</em></span>
        </div>

        <button className="sx-workspace" type="button">
          <span className="sx-workspace__icon">
            <img src={hospitalIcon} alt="" className="sx-ico" />
          </span>
          <span className="sx-workspace__text">
            <small>Hospital workspace</small>
            <strong>{workspace}</strong>
          </span>
          <img src={nextIcon} alt="" className="sx-ico sx-ico--sm sx-ico--down" />
        </button>

        <nav className="sx-nav" aria-label="Staff navigation">
          {sections.map((s) => (
            <div className="sx-nav__group" key={s.label}>
              <p className="sx-nav__label">{s.label}</p>
              {s.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  className={({ isActive }) => "sx-nav__item" + (isActive ? " is-active" : "")}
                >
                  <img src={it.icon} alt="" className="sx-ico" />
                  <span>{it.text}</span>
                  {it.badge ? <b className="sx-nav__badge">{it.badge}</b> : null}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sx-user">
          <span className="sx-avatar">{currentUser.initials}</span>
          <span className="sx-user__text">
            <strong>{currentUser.name}</strong>
            <small>{currentUser.role}</small>
          </span>
          <button type="button" className="sx-user__logout" onClick={onLogout} aria-label="Log out">
            <img src={logoutIcon} alt="" className="sx-ico" />
          </button>
        </div>
      </aside>

      {/* ================= HEADER + SCROLLING PAGE ================= */}
      <div className="sx-main">
        <header className="sx-header">
          <label className="sx-search">
            <img src={searchIcon} alt="" className="sx-ico sx-ico--sm sx-ico--dark" />
            <input type="search" placeholder="Search patients, appointments, doctors…" />
            <kbd>⌘ K</kbd>
          </label>

          <div className="sx-header__right">
            <span className="sx-chip">Sample data</span>

            <button type="button" className="sx-iconbtn" onClick={onToggleTheme} aria-label="Toggle dark mode">
              <img src={moonIcon} alt="" className="sx-ico sx-ico--dark" />
            </button>

            <button type="button" className="sx-iconbtn" aria-label="Notifications">
              <img src={bellIcon} alt="" className="sx-ico sx-ico--dark" />
              {hasNotifications && <i className="sx-dot" />}
            </button>

            <div className="sx-header__user">
              <span className="sx-avatar sx-avatar--light">{currentUser.initials}</span>
              <span className="sx-user__text">
                <strong>{currentUser.name}</strong>
                <small>Administrator</small>
              </span>
            </div>
          </div>
        </header>

        <main className="sx-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}