import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../constants/Roles";
import { PATIENTS_DATABASE } from "../constants/Patients";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Lock, LogOut, CheckCircle } from "lucide-react";
import "./PatientPage.css";

export const PatientPage = () => {
  const { user, logout, auditLogs, logBlockchainAccess } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("19850512-1234");
  const [selectedPatient, setSelectedPatient] = useState(
    PATIENTS_DATABASE["19850512-1234"],
  );

  useEffect(() => {
    if (!user) {
      navigate("/login");
    } else if (selectedPatient) {
      logBlockchainAccess(
        user,
        "READ",
        `Accessed patient health record: ${selectedPatient.name} (${selectedPatient.id})`,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  if (!user) return null;

  const handleSearch = (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    const found =
      PATIENTS_DATABASE[query] ||
      Object.values(PATIENTS_DATABASE).find((p) =>
        p.name.toLowerCase().includes(query.toLowerCase()),
      );

    if (found) {
      setSelectedPatient(found);
      logBlockchainAccess(
        user,
        "SEARCH",
        `Searched for patient: ${query} — Found: ${found.name} (${found.id})`,
      );
    } else {
      setSelectedPatient(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="patient-container">
      {/* Header */}
      <header className="patient-header">
        <div>
          <h1>🏥 GDPR Patient Record</h1>
          <span className="user-info">
            Logged in as: <strong>{user.username}</strong> ({user.role})
          </span>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          <LogOut size={16} style={{ marginRight: 6 }} /> Log Out
        </button>
      </header>

      <section className="search-section">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search by Patient ID or Name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-btn">
            🔍 Search
          </button>
        </form>
      </section>

      <main className="patient-main">
        {/* Dynamic Role Access */}
        <section className="content-section">
          {user.role === ROLES.UNAUTHORIZED ? (
            <div className="access-card denied">
              <AlertTriangle color="#dc2626" size={32} />
              <h3>Access Denied (403 Unauthorized)</h3>
              <p>
                You lack valid permissions to view this record. This attempt has
                been logged on the blockchain trail.
              </p>
            </div>
          ) : (
            <div>
              {/* Verification Badge */}
              <div className="verification-badge">
                <CheckCircle color="#16a34a" size={25} />
                <span>Verified Access (Immutable Audit Trail Active)</span>
              </div>

              <h2>Patient: Anna Andersson (19850512-1234)</h2>

              {/* Doctor View */}
              {user.role === ROLES.DOCTOR && (
                <div className="medical-card">
                  <span className="role-tag tag-doctor">
                    Full Physician View
                  </span>
                  <h3>Diagnosis & Treatment Plan</h3>
                  <p>
                    <strong>Diagnosis:</strong> Acute Appendicitis.
                  </p>
                  <p>
                    <strong>Prescribed Medication:</strong> Morphine 10mg,
                    Paracetamol 1g as needed.
                  </p>
                  <p>
                    <strong>Clinical Note:</strong> Surgery scheduled for 14:00.
                  </p>
                </div>
              )}

              {/* Nurse / Emergency View */}
              {user.role === ROLES.NURSE && (
                <div className="medical-card">
                  <span className="role-tag tag-nurse">
                    Emergency & Triage View
                  </span>
                  <h3>Emergency Data & Vitals</h3>
                  <p>
                    <strong>Blood Type:</strong> A Rh Positive
                  </p>
                  <p>
                    <strong>Allergies:</strong> Penicillin (Severe Reaction)
                  </p>
                  <p>
                    <strong>Vital Signs:</strong> BP 120/80, Pulse 78, SpO2 98%.
                  </p>
                </div>
              )}

              {/* Clinic View */}
              {user.role === ROLES.CLINIC && (
                <div className="medical-card">
                  <span className="role-tag tag-clinic">
                    Outpatient & Clinic View
                  </span>
                  <h3>History & Prescription Overview</h3>
                  <p>
                    <strong>Last Visit:</strong> 2026-08-10 — Annual Checkup.
                  </p>
                  <p>
                    <strong>Active Prescriptions:</strong> Levothyroxine 50mcg
                    daily.
                  </p>
                </div>
              )}

              {/* Patient View */}
              {user.role === ROLES.PATIENT && (
                <div className="medical-card">
                  <span className="role-tag tag-patient">
                    Personal Access View (GDPR Article 15)
                  </span>
                  <h3>My Health Summary & Audit Logs</h3>
                  <p>
                    Welcome Anna! Here you can review your medical summary and
                    verify which healthcare providers have accessed your record.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Blockchain Audit Log */}
        <section className="log-section">
          <div className="log-header">
            <Lock size={20} color="#2563fb" />
            <h3>Blockchain Audit Log (Live Trail)</h3>
          </div>
          <div className="log-list">
            {auditLogs.map((log) => (
              <div key={log.id} className="log-item">
                <div className="log-meta">
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span className="log-hash">{log.hash.substr(0, 10)}...</span>
                </div>
                <div className="log-body">
                  <strong>{log.user}</strong> ({log.role}):{" "}
                  <span className="log-action">{log.action}</span> —{" "}
                  {log.details}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};
