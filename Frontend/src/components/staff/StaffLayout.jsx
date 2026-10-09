import { NavLink, Outlet, useNavigate } from "react-router-dom";
import StaffLayoutStyle from "../../assets/styles/StaffLayout.module.css";
import { useAuth } from "../../auth/AuthContext";

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
  const { logout } = useAuth();
  const navigate = useNavigate();

  // The route renders <StaffLayout /> with no props, so logout is handled here.
  const handleLogout = () => {
    logout();
    onLogout?.();
    navigate("/login", { replace: true });
  };

  return (
    <div className={StaffLayoutStyle['sx-shell']}>
      {/* ================= SIDEBAR ================= */}
      <aside className={StaffLayoutStyle['sx-sidebar']}>
        <div className={StaffLayoutStyle['sx-brand']}>
          <span className={StaffLayoutStyle['sx-brand__logo']}>
            <img src={heartIcon} alt="" className={StaffLayoutStyle['sx-ico']} />
          </span>
          <span className={StaffLayoutStyle['sx-brand__name']}>HealthLocal <em>AI</em></span>
        </div>

        <button className={StaffLayoutStyle['sx-workspace']} type="button">
          <span className={StaffLayoutStyle['sx-workspace__icon']}>
            <img src={hospitalIcon} alt="" className={StaffLayoutStyle['sx-ico']} />
          </span>
          <span className={StaffLayoutStyle['sx-workspace__text']}>
            <small>Hospital workspace</small>
            <strong>{workspace}</strong>
          </span>
          <img src={nextIcon} alt="" className={`${StaffLayoutStyle['sx-ico']} ${StaffLayoutStyle['sx-ico--sm']} ${StaffLayoutStyle['sx-ico--down']}`} />
        </button>

        <nav className={StaffLayoutStyle['sx-nav']} aria-label="Staff navigation">
          {sections.map((s) => (
            <div key={s.label}>
              <p className={StaffLayoutStyle['sx-nav__label']}>{s.label}</p>
              {s.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  className={({ isActive }) => StaffLayoutStyle['sx-nav__item'] + (isActive ? ` ${StaffLayoutStyle['is-active']}` : "")}
                >
                  <img src={it.icon} alt="" className={StaffLayoutStyle['sx-ico']} />
                  <span>{it.text}</span>
                  {it.badge ? <b className={StaffLayoutStyle['sx-nav__badge']}>{it.badge}</b> : null}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className={StaffLayoutStyle['sx-user']}>
          <span className={StaffLayoutStyle['sx-avatar']}>{currentUser.initials}</span>
          <span className={StaffLayoutStyle['sx-user__text']}>
            <strong>{currentUser.name}</strong>
            <small>{currentUser.role}</small>
          </span>
          <button type="button" className={StaffLayoutStyle['sx-user__logout']} onClick={handleLogout} aria-label="Log out">
            <img src={logoutIcon} alt="" className={StaffLayoutStyle['sx-ico']} />
          </button>
        </div>
      </aside>

      {/* ================= HEADER + SCROLLING PAGE ================= */}
      <div className={StaffLayoutStyle['sx-main']}>
        <header className={StaffLayoutStyle['sx-header']}>
          <label className={StaffLayoutStyle['sx-search']}>
            <img src={searchIcon} alt="" className={`${StaffLayoutStyle['sx-ico']} ${StaffLayoutStyle['sx-ico--sm']} ${StaffLayoutStyle['sx-ico--dark']}`} />
            <input type="search" placeholder="Search patients, appointments, doctors…" />
            <kbd>⌘ K</kbd>
          </label>

          <div className={StaffLayoutStyle['sx-header__right']}>
            <span className={StaffLayoutStyle['sx-chip']}>Sample data</span>

            <button type="button" className={StaffLayoutStyle['sx-iconbtn']} onClick={onToggleTheme} aria-label="Toggle dark mode">
              <img src={moonIcon} alt="" className={`${StaffLayoutStyle['sx-ico']} ${StaffLayoutStyle['sx-ico--dark']}`} />
            </button>

            <button type="button" className={StaffLayoutStyle['sx-iconbtn']} aria-label="Notifications">
              <img src={bellIcon} alt="" className={`${StaffLayoutStyle['sx-ico']} ${StaffLayoutStyle['sx-ico--dark']}`} />
              {hasNotifications && <i className={StaffLayoutStyle['sx-dot']} />}
            </button>

            <div className={StaffLayoutStyle['sx-header__user']}>
              <span className={`${StaffLayoutStyle['sx-avatar']} ${StaffLayoutStyle['sx-avatar--light']}`}>{currentUser.initials}</span>
              <span className={StaffLayoutStyle['sx-user__text']}>
                <strong>{currentUser.name}</strong>
                <small>Administrator</small>
              </span>
            </div>
          </div>
        </header>

        <main className={StaffLayoutStyle['sx-content']}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}