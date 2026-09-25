import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLES, ROLE_PASSWORDS } from "../constants/Roles";
import { ShieldCheck, UserCheck } from "lucide-react";
import "./LoginPage.css";

export const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState(ROLES.DOCTOR);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();

    const correctPassword = ROLE_PASSWORDS[selectedRole];
    if (password !== correctPassword) {
      setError(
        `Invalid password for ${selectedRole}. Please check the role access code.`,
      );
      return;
    }

    setError("");
    const finalUsername = username.trim() || `User_${selectedRole}`;
    login(finalUsername, selectedRole);
    navigate("/journal");
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
            <label className="input-label">Username / Name</label>
            <input
              type="text"
              placeholder="e.g. Dr. Eric Drake"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="text-input"
            />
          </div>

          <div className="input-group">
            <label className="input-label">Select Role (5 Access Levels)</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
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
            <label className="input-label">Role Passcode</label>
            <input
              type="password"
              placeholder="Enter role access code"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-input"
              required
            />
          </div>

          <button type="submit" className="login-btn">
            <UserCheck size={18} style={{ marginRight: 8 }} />
            Log In
          </button>
        </form>
      </div>
    </div>
  );
};
