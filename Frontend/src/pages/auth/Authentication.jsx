import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { homeFor } from "../../auth/roles";

// Style
import AuthenticationStyle from "../../assets/styles/Authentication.module.css";

// Assets
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
  full: "MediSync AI",
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
  text: "Describe how you feel to Syncia, find the right hospital doctor, and arrange your visit—all in one secure conversation.",
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

// className is an extra (already-resolved) module class, e.g. AuthenticationStyle['btn-arrow']
function Logo({ name, className = "" }) {
  return (
    <img
      src={LOGOS[name]}
      alt=""
      className={`${AuthenticationStyle['logo-img']} ${className}`.trim()}
    />
  );
}

function PasswordField({ id, value, onChange, autoComplete }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={AuthenticationStyle['input-wrap']}>
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
        className={AuthenticationStyle['show-btn']}
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}

export default function Login() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const [view, setView] = useState("signin");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const content = VIEWS[view];

  // Already-signed-in users are redirected away from /login by ProtectedRoute

  const switchView = (next) => {
    setView(next);
    setPassword("");
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);
    try {
      let session;
      if (view === "signup") {
        if (password.length < 8) {
          setError("Password must be at least 8 characters.");
          return;
        }
        session = await signUp({
          firstname: firstName.trim(),
          lastname: lastName.trim(),
          email: email.trim(),
          password,
        });
      } else {
        session = await signIn(email.trim(), password);
      }
      // Send the user to the home for the role the backend gave them
      navigate(homeFor(session.role), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={AuthenticationStyle['login-page']}>
      <aside className={AuthenticationStyle['login-left']}>
        <div className={AuthenticationStyle['brand']}>
          <span className={AuthenticationStyle['brand-mark']}>
            <Logo name="brand" />
          </span>
          <span className={AuthenticationStyle['brand-name']}>
            {BRAND.name} <span className={AuthenticationStyle['brand-accent']}>{BRAND.accent}</span>
          </span>
        </div>

        <div className={AuthenticationStyle['hero']}>
          <span className={AuthenticationStyle['hero-badge']}>
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

        <ul className={AuthenticationStyle['features']}>
          {FEATURES.map((f) => (
            <li key={f.key}>
              <Logo name={f.key} />
              {f.label}
            </li>
          ))}
        </ul>

        <span className={AuthenticationStyle['ring']} aria-hidden="true" />
        <span className={AuthenticationStyle['ring']} aria-hidden="true" />
      </aside>

      <main className={AuthenticationStyle['login-right']}>
        <div className={AuthenticationStyle['form-card']} key={view}>
          <span className={AuthenticationStyle['eyebrow']}>{content.eyebrow}</span>
          <h2>{content.title}</h2>
          <p className={AuthenticationStyle['subtitle']}>{content.subtitle}</p>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className={AuthenticationStyle['form-error']} role="alert">
                {error}
              </div>
            )}

            {view === "signup" && (
              <>
                <div className={AuthenticationStyle['name-fields']}>
                  <div className={AuthenticationStyle['field']}>
                    <label htmlFor="firstName">First name</label>
                    <div className={AuthenticationStyle['input-wrap']}>
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
                  <div className={AuthenticationStyle['field']}>
                    <label htmlFor="lastName">Last name</label>
                    <div className={AuthenticationStyle['input-wrap']}>
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

                <div className={`${AuthenticationStyle['field']} ${AuthenticationStyle['gender-field']}`}>
                  <label htmlFor="gender">Gender</label>
                  <div className={AuthenticationStyle['input-wrap']}>
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

            <div className={AuthenticationStyle['field']}>
              <label htmlFor="email">Email address</label>
              <div className={AuthenticationStyle['input-wrap']}>
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

            <div className={AuthenticationStyle['field']}>
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
              <div className={AuthenticationStyle['forgot-row']}>
                <button
                  type="button"
                  className={`${AuthenticationStyle['link-btn']} ${AuthenticationStyle['small']}`}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button type="submit" className={AuthenticationStyle['primary-btn']} disabled={loading}>
              {loading ? "Please wait…" : content.submit}
              <Logo name="arrow" className={AuthenticationStyle['btn-arrow']} />
            </button>
          </form>

          {view === "signin" && (
            <p className={AuthenticationStyle['switch-text']}>
              New to {BRAND.full}?{" "}
              <button
                type="button"
                className={AuthenticationStyle['link-btn']}
                onClick={() => switchView("signup")}
              >
                Create an account
              </button>
            </p>
          )}

          {view === "signup" && (
            <p className={AuthenticationStyle['switch-text']}>
              Already registered?{" "}
              <button
                type="button"
                className={AuthenticationStyle['link-btn']}
                onClick={() => switchView("signin")}
              >
                Sign in
              </button>
            </p>
          )}

          {view === "signin" && (
            <button
              type="button"
              className={AuthenticationStyle['role-card']}
              onClick={() => switchView("staff")}
            >
              <Logo name="staff" className={AuthenticationStyle['role-icon']} />
              <span>Hospital staff access</span>
              <Logo name="arrow" className={AuthenticationStyle['role-arrow']} />
            </button>
          )}

          {view === "staff" && (
            <p className={AuthenticationStyle['switch-text']}>
              <button
                type="button"
                className={AuthenticationStyle['link-btn']}
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
