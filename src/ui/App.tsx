import React, { useState } from "react";

const API_URL = "http://localhost:3001";

export default function App() {
  const [boardId, setBoardId] = useState(1);
  const [activity, setActivity] = useState<any[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const [error, setError] = useState("");

  const fetchActivity = async () => {
    setError("");
    try {
      const res = await fetch(`${API_URL}/boards/${boardId}/activity`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (res.ok) setActivity(data.events);
      else setError(data.error || "Error");
    } catch (e) {
      setError("Network error");
    }
  };

  const fetchPreview = async () => {
    setError("");
    try {
      const res = await fetch(`${API_URL}/boards/${boardId}/activity/preview`);
      const data = await res.json();
      if (res.ok) setPreview(data.events);
      else setError(data.error || "Error");
    } catch (e) {
      setError("Network error");
    }
  };

  return (
    <div
      style={{ fontFamily: "sans-serif", maxWidth: 600, margin: "2rem auto" }}
    >
      <h1>Kanban Activity Feed UI</h1>
      <label>
        Board ID:
        <input
          type="number"
          value={boardId}
          onChange={(e) => setBoardId(Number(e.target.value))}
          style={{ marginLeft: 8, width: 60 }}
        />
      </label>
      <div style={{ margin: "1rem 0" }}>
        <button onClick={fetchActivity}>Ver actividad (requiere login)</button>
        <button onClick={fetchPreview} style={{ marginLeft: 8 }}>
          Ver preview (público)
        </button>
      </div>
      {error && <div style={{ color: "red" }}>{error}</div>}
      <h2>Actividad completa</h2>
      <ul>
        {activity.map((ev) => (
          <li key={ev.id}>
            <b>{ev.action}</b> — Card: {ev.cardId ?? "-"} — User: {ev.userId} —{" "}
            {new Date(ev.createdAt).toLocaleString()}
          </li>
        ))}
      </ul>
      <h2>Preview (últimos 10)</h2>
      <ul>
        {preview.map((ev) => (
          <li key={ev.id}>
            <b>{ev.action}</b> — Card: {ev.cardId ?? "-"} — User: {ev.userId} —{" "}
            {new Date(ev.createdAt).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}
