import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import "./Login.css";
import { useAuth, homeFor } from "../../auth/AuthContext";

import heartIcon from "../../assets/images/medisync-logo.png";
import aiIcon from "../../assets/icons/ai.png";
import insuranceIcon from "../../assets/icons/insurance.png";
import hospitalIcon from "../../assets/icons/hospital.png";
import heartBeatIcon from "../../assets/icons/heart-beat.png";
import stetIcon from "../../assets/icons/stet.png";
import nextIcon from "../../assets/icons/next.png";

const BRAND = {
  name: "MediSync",
  accent: "AI",
};

const LOGOS = {
  brand: heartIcon,
  badge: aiIcon,
  privacy: insuranceIcon,
  hospital: hospitalIcon,
  reviewed: heartBeatIcon,
  staff: stetIcon,
  arrow: nextIcon,
};

const HERO = {
  badge: "AI-guided hospital care",
  title: ["Care starts with", "being heard."],
  text: "Describe how you feel, find the right hospital doctor, and arrange your visit—all in one secure conversation.",
};

const FEATURES = [
  { key: "privacy", label: "Privacy-first" },
  { key: "hospital", label: "Hospital-connected" },
  { key: "reviewed", label: "Human-reviewed" },
];

const VIEWS = {
  signin: {
    eyebrow: "Patient portal",
    title: "Welcome back",
    subtitle: "Sign in to continue to your workspace.",
    submit: "Sign in",
  },
  signup: {
    eyebrow: "Patient portal",
    title: "Create your account",
    subtitle: "Start your secure care journey.",
    submit: "Create account",
  },
  staff: {
    eyebrow: "Authorized personnel",
    title: "Hospital staff sign in",
    subtitle: "Sign in to continue to your workspace.",
    submit: "Sign in",
  },
};

// Demo staff identity used by the "Hospital staff access" shortcut
const DEMO_STAFF = { role: "staff", email: "staff@stgabriel.demo", name: "Ana Mendoza" };

function Logo({ name, className = "" }) {
  return <img src={LOGOS[name]} alt="" className={`logo-img ${className}`} />;
}

function PasswordField({ id, value, onChange, autoComplete }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="input-wrap">
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required
      />
      <button
        type="button"
        className="show-btn"
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}

export default function Login({ onLogin, onSignup }) {
  const { session, login } = useAuth();
  const navigate = useNavigate();

  const [view, setView] = useState("signin");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const content = VIEWS[view];

  // Already signed in -> go straight to the right home (staff -> /staff -> dashboard)
  if (session) return <Navigate to={homeFor(session.role)} replace />;

  const switchView = (next) => {
    setView(next);
    setPassword("");
  };

  // "Hospital staff access" button: sign in as staff and open the staff Dashboard
  const openStaffDashboard = () => {
    login(DEMO_STAFF);
    navigate("/staff/dashboard", { replace: true });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (view === "signup") {
      const normalizedFirstName = firstName.trim();
      const normalizedLastName = lastName.trim();
      onSignup?.({
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        fullName: `${normalizedFirstName} ${normalizedLastName}`.trim(),
        gender,
        email,
        password,
      });
      return;
    }

    const role = view === "staff" ? "staff" : "patient";
    if (onLogin) {
      onLogin({ role, email, password });
    } else {
      login({ role, email, name: email });
      navigate(role === "staff" ? "/staff/dashboard" : homeFor(role), { replace: true });
    }
  };

  return (
    <div className="login-page">
      <aside className="login-left">
        <div className="brand">
          <span className="brand-mark">
            <Logo name="brand" />
          </span>
          <span className="brand-name">
            {BRAND.name} <span className="brand-accent">{BRAND.accent}</span>
          </span>
        </div>

        <div className="hero">
          <span className="hero-badge">
            <Logo name="badge" />
            {HERO.badge}
          </span>
          <h1>
            {HERO.title[0]}
            <br />
            {HERO.title[1]}
          </h1>
          <p>{HERO.text}</p>
        </div>

        <ul className="features">
          {FEATURES.map((f) => (
            <li key={f.key}>
              <Logo name={f.key} />
              {f.label}
            </li>
          ))}
        </ul>

        <span className="ring ring-1" aria-hidden="true" />
        <span className="ring ring-2" aria-hidden="true" />
      </aside>

      <main className="login-right">
        <div className="form-card" key={view}>
          <span className="eyebrow">{content.eyebrow}</span>
          <h2>{content.title}</h2>
          <p className="subtitle">{content.subtitle}</p>

          <form onSubmit={handleSubmit}>
            {view === "signup" && (
              <>
                <div className="name-fields">
                  <div className="field">
                    <label htmlFor="firstName">First name</label>
                    <div className="input-wrap">
                      <input
                        id="firstName"
                        type="text"
                        placeholder="First name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        autoComplete="given-name"
                        required
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="lastName">Last name</label>
                    <div className="input-wrap">
                      <input
                        id="lastName"
                        type="text"
                        placeholder="Last name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        autoComplete="family-name"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="field gender-field">
                  <label htmlFor="gender">Gender</label>
                  <div className="input-wrap">
                    <select
                      id="gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      required
                    >
                      <option value="" disabled>Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="field">
              <label htmlFor="email">Email address</label>
              <div className="input-wrap">
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <PasswordField
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={
                  view === "signup" ? "new-password" : "current-password"
                }
              />
            </div>

            {view === "signin" && (
              <div className="forgot-row">
                <button type="button" className="link-btn small">
                  Forgot password?
                </button>
              </div>
            )}

            <button type="submit" className="primary-btn">
              {content.submit}
              <Logo name="arrow" className="btn-arrow" />
            </button>
          </form>

          {view === "signin" && (
            <p className="switch-text">
              New to {BRAND.name}?{" "}
              <button
                type="button"
                className="link-btn"
                onClick={() => switchView("signup")}
              >
                Create an account
              </button>
            </p>
          )}

          {view === "signup" && (
            <p className="switch-text">
              Already registered?{" "}
              <button
                type="button"
                className="link-btn"
                onClick={() => switchView("signin")}
              >
                Sign in
              </button>
            </p>
          )}

          {view === "signin" && (
            <button
              type="button"
              className="role-card"
              onClick={openStaffDashboard}
            >
              <Logo name="staff" className="role-icon" />
              <span>Hospital staff access</span>
              <Logo name="arrow" className="role-arrow" />
            </button>
          )}

          {view === "staff" && (
            <p className="switch-text">
              <button
                type="button"
                className="link-btn"
                onClick={() => switchView("signin")}
              >
                Return to patient sign in
              </button>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}