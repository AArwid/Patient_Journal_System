import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { ROLES, STAFF_ROLES, ROLE_LABELS } from "../constants/Roles";
import { api } from "../api/client";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Lock, LogOut, CheckCircle } from "lucide-react";
import "./PatientPage.css";

const VISIBILITY_LABELS = {
  private: "Private — author only",
  staff: "Staff only",
  all: "Staff + patient",
};

export const PatientPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isStaff = Boolean(user) && STAFF_ROLES.includes(user.role);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchMessage, setSearchMessage] = useState("");

  // A patient is routed to their own record using the id from the server
  // session - never from anything typed into the page.
  const [selectedPatientId, setSelectedPatientId] = useState(
    user?.role === ROLES.PATIENT ? (user.patientId ?? null) : null,
  );

  const [patient, setPatient] = useState(null);
  const [notes, setNotes] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [logsMessage, setLogsMessage] = useState("");
  const [onlyOtherActors, setOnlyOtherActors] = useState(false);
  const [accessError, setAccessError] = useState(null);

  const [noteContent, setNoteContent] = useState("");
  const [noteVisibility, setNoteVisibility] = useState("staff");
  const [noteError, setNoteError] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const loadedPatientIdRef = useRef(null);

  const loadLogs = useCallback(async (patientId) => {
    try {
      const { logs } = await api.getAccessLogs(patientId);
      setAuditLogs([...logs].reverse());
      setLogsMessage(logs.length ? "" : "No access events recorded yet.");
    } catch (err) {
      setAuditLogs([]);
      setLogsMessage(err.message);
    }
  }, []);

  // When the record is refused, the patient trail is off limits too, so fall
  // back to the caller's own events - which is where the denial was recorded.
  const loadOwnEvents = useCallback(async () => {
    try {
      const { logs } = await api.getMyAuditEvents();
      setAuditLogs([...logs].reverse());
      setLogsMessage(logs.length ? "" : "No access events recorded yet.");
    } catch (err) {
      setAuditLogs([]);
      setLogsMessage(err.message);
    }
  }, []);

  const loadRecord = useCallback(
    async (patientId) => {
      try {
        const { patient: record } = await api.getPatient(patientId);
        const { notes: visibleNotes } = await api.getNotes(patientId);
        setAccessError(null);
        setPatient(record);
        setNotes(visibleNotes);
        await loadLogs(patientId);
      } catch (err) {
        setPatient(null);
        setNotes([]);
        setAccessError(err);
        await loadOwnEvents();
      }
    },
    [loadLogs, loadOwnEvents],
  );

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (selectedPatientId == null) return;
    if (loadedPatientIdRef.current === selectedPatientId) return;

    loadedPatientIdRef.current = selectedPatientId;
    loadRecord(selectedPatientId);
  }, [user, navigate, selectedPatientId, loadRecord]);

  if (!user) return null;

  const loading =
    selectedPatientId != null && patient === null && accessError === null;

  const visibleLogs =
    onlyOtherActors && !accessError
      ? auditLogs.filter((block) => block.event.actorId !== user.id)
      : auditLogs;

  const handleSearch = async (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setSearchMessage("");

    try {
      const { patients } = await api.searchPatients(query);
      setSearchResults(patients);
      if (!patients.length) setSearchMessage(`No patients matched "${query}".`);
    } catch (err) {
      // Roles without search rights get the same refusal whatever they type,
      // and the server has already recorded the attempt.
      setSearchResults([]);
      if (err.status === 401 || err.status === 403) {
        setPatient(null);
        setNotes([]);
        setAccessError(err);
        await loadOwnEvents();
      } else {
        setSearchMessage(err.message);
      }
    }
  };

  const handleCreateNote = async (e) => {
    e.preventDefault();
    if (!noteContent.trim()) {
      setNoteError("Note content is required.");
      return;
    }

    setNoteError("");
    setSavingNote(true);
    try {
      await api.createNote(
        selectedPatientId,
        noteContent.trim(),
        noteVisibility,
      );
      setNoteContent("");
      const { notes: visibleNotes } = await api.getNotes(selectedPatientId);
      setNotes(visibleNotes);
      await loadLogs(selectedPatientId);
    } catch (err) {
      setNoteError(err.message);
    } finally {
      setSavingNote(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const renderRecord = () => {
    if (loading) return <p>Loading record…</p>;

    if (accessError) {
      return (
        <div className="access-card denied">
          <AlertTriangle color="#dc2626" size={32} />
          <h3>Access Denied ({accessError.status || 403})</h3>
          <p>{accessError.message}</p>
          <p>This attempt has been logged on the blockchain audit trail.</p>
        </div>
      );
    }

    if (!patient) {
      return (
        <p>
          Search for a patient by name or personal number to open their journal.
        </p>
      );
    }

    return (
      <div>
        {/* Verification Badge */}
        <div className="verification-badge">
          <CheckCircle color="#16a34a" size={25} />
          <span>Verified Access (Immutable Audit Trail Active)</span>
        </div>

        <h2>
          Patient: {patient.full_name} ({patient.personal_number})
        </h2>

        {notes.length === 0 ? (
          <div className="medical-card">
            <h3>No notes visible to you</h3>
            <p>
              This record has no journal notes your role is allowed to read.
            </p>
          </div>
        ) : (
          notes.map((note) => (
            <div className="medical-card" key={note.id}>
              <span className={`role-tag tag-${note.author_role}`}>
                {ROLE_LABELS[note.author_role] || note.author_role} ·{" "}
                {VISIBILITY_LABELS[note.visibility]}
              </span>
              <p>{note.content}</p>
              <p className="log-meta">
                {note.author_name} —{" "}
                {new Date(`${note.created_at}Z`).toLocaleString()}
              </p>
            </div>
          ))
        )}

        {isStaff && (
          <form onSubmit={handleCreateNote} className="medical-card">
            <h3>Add Journal Note</h3>
            {noteError && <p style={{ color: "#dc2626" }}>{noteError}</p>}
            <textarea
              className="search-input"
              style={{ width: "100%", padding: 12 }}
              rows={3}
              placeholder="Clinical note…"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
            />
            <div className="search-form" style={{ marginTop: 12 }}>
              <select
                className="select-input"
                value={noteVisibility}
                onChange={(e) => setNoteVisibility(e.target.value)}
              >
                <option value="private">{VISIBILITY_LABELS.private}</option>
                <option value="staff">{VISIBILITY_LABELS.staff}</option>
                <option value="all">{VISIBILITY_LABELS.all}</option>
              </select>
              <button
                type="submit"
                className="search-btn"
                disabled={savingNote}
              >
                {savingNote ? "Saving…" : "Save Note"}
              </button>
            </div>
          </form>
        )}
      </div>
    );
  };

  return (
    <div className="patient-container">
      {/* Header */}
      <header className="patient-header">
        <div>
          <h1>🏥 GDPR Patient Record</h1>
          <span className="user-info">
            Logged in as: <strong>{user.name}</strong> (
            {ROLE_LABELS[user.role] || user.role})
          </span>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          <LogOut size={16} style={{ marginRight: 6 }} /> Log Out
        </button>
      </header>

      {/* Patients skip search entirely - they only ever see their own record. */}
      {user.role !== ROLES.PATIENT && (
        <section className="search-section">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Search by Patient Name or Personal Number"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-btn">
              🔍 Search
            </button>
          </form>

          {searchMessage && (
            <p style={{ color: "#dc2626", marginTop: 8 }}>{searchMessage}</p>
          )}

          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((result) => (
                <button
                  type="button"
                  key={result.id}
                  className={
                    result.id === selectedPatientId
                      ? "search-result active"
                      : "search-result"
                  }
                  onClick={() => setSelectedPatientId(result.id)}
                >
                  <strong>{result.full_name}</strong>
                  <span>{result.date_of_birth || `#${result.id}`}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <main className="patient-main">
        {/* Record content, gated server-side by role */}
        <section className="content-section">{renderRecord()}</section>

        {/* Blockchain Audit Log */}
        <section className="log-section">
          <div className="log-header">
            <Lock size={20} color="#2563fb" />
            <h3>
              {accessError
                ? "My Access Attempts (On Chain)"
                : "Blockchain Audit Log (Live Trail)"}
            </h3>
          </div>

          {!accessError && auditLogs.length > 0 && (
            <div className="log-filter">
              <label>
                <input
                  type="checkbox"
                  checked={onlyOtherActors}
                  onChange={(e) => setOnlyOtherActors(e.target.checked)}
                />
                Hide my own activity
              </label>
              <span>
                {visibleLogs.length} of {auditLogs.length} events
              </span>
            </div>
          )}

          {visibleLogs.length === 0 ? (
            <p>
              {auditLogs.length > 0
                ? "Nobody else has accessed this record yet."
                : logsMessage || "Open a record to see its access trail."}
            </p>
          ) : (
            <div className="log-list">
              {visibleLogs.map((block) => (
                <div
                  key={block.hash}
                  className={`log-item log-${block.event.outcome}`}
                >
                  <div className="log-meta">
                    <span>
                      {new Date(block.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="log-hash">
                      {block.hash.slice(0, 10)}...
                    </span>
                  </div>
                  <div className="log-body">
                    <strong>
                      {ROLE_LABELS[block.event.actorRole] ||
                        block.event.actorRole}
                    </strong>{" "}
                    (#{block.event.actorId}):{" "}
                    <span className="log-action">{block.event.type}</span> —{" "}
                    {block.event.outcome}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
