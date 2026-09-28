import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLES, DEMO_EMAILS } from "../constants/Roles";
import { ShieldCheck, UserCheck } from "lucide-react";
import "./LoginPage.css";

export const LoginPage = () => {
  const [email, setEmail] = useState(DEMO_EMAILS[ROLES.DOCTOR]);
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState(ROLES.DOCTOR);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setEmail(DEMO_EMAILS[role]);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(email.trim(), password);
      navigate("/journal");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <ShieldCheck size={48} color="#4e7ad9ff" />
          <h2>GDPR Health Portal</h2>
          <p>Secure login with blockchain audit logging</p>
        </div>

        <div style={{ color: "red", marginBottom: 10 }}>{error}</div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <label className="input-label">Email</label>
            <input
              type="email"
              placeholder="e.g. doctor@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-input"
              autoComplete="username"
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Demo Account (5 Access Levels)</label>
            <select
              value={selectedRole}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="select-input"
            >
              <option value={ROLES.DOCTOR}> Doctor (Full Access)</option>
              <option value={ROLES.NURSE}>
                {" "}
                Nurse / Paramedic (Emergency Access)
              </option>
              <option value={ROLES.CLINIC}>
                {" "}
                Medical Clinic (Restricted Access)
              </option>
              <option value={ROLES.PATIENT}>
                {" "}
                Patient (Personal Records & Logs)
              </option>
              <option value={ROLES.UNAUTHORIZED}>
                {" "}
                Unauthorized (No Access)
              </option>
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              type="password"
              placeholder="Demo password: password123"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-input"
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className="login-btn" disabled={submitting}>
            <UserCheck size={18} style={{ marginRight: 8 }} />
            {submitting ? "Signing in…" : "Log In"}
          </button>
        </form>
      </div>
    </div>
  );
};
