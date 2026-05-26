import { useEffect, useState } from "react";

type Session = {
  session_id: string;
  display_name: string;
  role: string;
};

export default function ActiveSessionsBar({ sessionId }: { sessionId: string }) {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    const load = async () => {
      if (sessionId) await window.fusionpos.touchSession(sessionId);
      setSessions((await window.fusionpos.listActiveSessions()) as Session[]);
    };
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [sessionId]);

  if (sessions.length <= 1) return null;

  return (
    <div className="sessions-bar">
      <strong>{sessions.length} users active</strong>
      {sessions.map((s) => (
        <span key={s.session_id} className={`session-chip ${s.role}`}>
          {s.display_name}
          {s.session_id === sessionId ? " (you)" : ""}
        </span>
      ))}
    </div>
  );
}
