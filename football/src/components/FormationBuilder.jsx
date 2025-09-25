import React, { useMemo, useRef, useState, useEffect } from "react";
import html2canvas from "html2canvas";
import "./FormationBuilder.css";

const DEFAULT_PLAYERS = [
  "Rowan","Evan","Bailey","Finley","Teddy","Sophie","Isaac",
  "Raiden","Josh","Griff","Rhys","Max","Archie"
];

const FORMATIONS = {
  "GK-3-2-1": [1, 3, 2, 1],
  "GK-2-3-1": [1, 2, 3, 1],
  "GK-3-3-1": [1, 3, 3, 1],
  "GK-2-2-2": [1, 2, 2, 2],
};

function fractionPositions(cols, isTiny) {
  const left = isTiny ? 15 : 12;
  const right = isTiny ? 85 : 88;
  if (cols === 1) return [50];
  const step = (right - left) / (cols - 1);
  return Array.from({ length: cols }, (_, i) => left + i * step);
}

function DraggableBadge({ name, onDelete, selected, onSelect, onPointerDragStart }) {
  return (
    <div className="badge">
      <div
        className={`badge-chip ${selected ? "is-selected" : ""}`}
        draggable
        onDragStart={(e) => e.dataTransfer.setData("text/plain", name)} 
        onPointerDown={(e) => onPointerDragStart(e, name)}               
        onClick={() => onSelect(name)}                                    
        role="button"
        aria-pressed={selected}
        title="Drag (desktop/touch) or tap to select"
      >
        {name}
      </div>
      <button
        className="btn btn-icon btn-danger"
        onClick={() => onDelete(name)}
        aria-label={`Remove ${name}`}
        title="Remove"
      >
        ×
      </button>
    </div>
  );
}

function PositionDot({ x, y, value, onDrop, onRemove, onTapAssign, idx }) {
  return (
    <div
      className="spot"
      style={{ left: `${x}%`, top: `${y}%` }}
      data-idx={idx}                            
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {                            
        const name = e.dataTransfer.getData("text/plain");
        if (name) onDrop(name);
      }}
      onClick={onTapAssign}
      role="button"
      aria-label={value ? `Position occupied by ${value}` : "Empty position"}
    >
      <div className={`spot-circle ${value ? "filled" : ""}`}>
        {value || "Drop / Tap"}
      </div>
      {value && (
        <button
          className="spot-remove"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          aria-label="Clear position"
          title="Clear"
        >
          ×
        </button>
      )}
    </div>
  );
}

export default function FormationBuilder() {
  const [players, setPlayers] = useState(DEFAULT_PLAYERS);
  const [formationKey, setFormationKey] = useState("GK-3-2-1");
  const rows = FORMATIONS[formationKey];

  const totalSpots = useMemo(() => rows.reduce((a, b) => a + b, 0), [rows]);
  const [positions, setPositions] = useState(Array(totalSpots).fill(""));

  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [newName, setNewName] = useState("");

  const pitchRef = useRef(null);
  const bench = players.filter((p) => !positions.includes(p));


  const [spotSize, setSpotSize] = useState(64);
  useEffect(() => {
    function updateSize() {
      const el = pitchRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const minSize = 40, maxSize = 72;
      const size = Math.max(minSize, Math.min(maxSize, Math.floor(rect.height / (rows.length * 2.6))));
      setSpotSize(size);
      document.documentElement.style.setProperty("--spot-size", `${size}px`);
      document.documentElement.style.setProperty("--spot-font", `${Math.max(10, Math.round(size / 5))}px`);
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [rows]);

  const isTiny = typeof window !== "undefined" && window.matchMedia("(max-width: 360px)").matches;

  const rowsY = useMemo(() => {
    const top = 12, bottom = 88, n = rows.length;
    if (n === 1) return [50];
    const step = (bottom - top) / (n - 1);
    return Array.from({ length: n }, (_, i) => bottom - i * step);
  }, [rows, spotSize]);

  const spots = useMemo(() => {
    const arr = [];
    let idx = 0;
    rows.forEach((cols, rowIdx) => {
      const xs = fractionPositions(cols, isTiny);
      xs.forEach((x) => arr.push({ x, y: rowsY[rowIdx], idx: idx++ }));
    });
    return arr;
  }, [rows, rowsY, isTiny]);

  function setSpot(idx, name) {
    setPositions((prev) => {
      const next = [...prev];
      const exists = next.findIndex((v) => v === name);
      if (exists !== -1) next[exists] = "";
      next[idx] = name;
      return next;
    });
    setSelectedPlayer("");
  }

  function removeSpot(idx) {
    setPositions((prev) => {
      const next = [...prev];
      next[idx] = "";
      return next;
    });
  }

  function clearPitch() {
    setPositions(Array(totalSpots).fill(""));
    setSelectedPlayer("");
  }

  function addPlayer(name) {
    const v = name.trim();
    if (!v || players.includes(v)) return;
    setPlayers([...players, v]);
  }

  function deletePlayer(name) {
    setPlayers(players.filter((p) => p !== name));
    setPositions(positions.map((v) => (v === name ? "" : v)));
    if (selectedPlayer === name) setSelectedPlayer("");
  }

  async function downloadPNG() {
    if (!pitchRef.current) return;
    const canvas = await html2canvas(pitchRef.current, { backgroundColor: null, scale: 2 });
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `formation_${formationKey}.png`;
    a.click();
  }

  const [drag, setDrag] = useState(null);

  function onPointerDragStart(e, name) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    setDrag({ name, x: e.clientX, y: e.clientY });

    const move = (ev) => setDrag((d) => (d ? { ...d, x: ev.clientX, y: ev.clientY } : d));
    const up = (ev) => {
      const spotsEls = Array.from(document.querySelectorAll(".spot"));
      const hit = spotsEls.find((el) => {
        const r = el.getBoundingClientRect();
        return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
      });
      if (hit) {
        const idxStr = hit.getAttribute("data-idx");
        if (idxStr != null) setSpot(parseInt(idxStr, 10), name);
      }
      setDrag(null);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    window.addEventListener("pointercancel", up, { passive: true });
  }

  return (
    <div className="wrap">
      <h2 className="title">Llanbradach U10s Formation Builder</h2>

      <div className="toolbar">
        <div className="btn-group scroll-x">
          {Object.keys(FORMATIONS).map((key) => (
            <button
              key={key}
              className={`btn ${key === formationKey ? "btn-primary" : ""}`}
              onClick={() => {
                setFormationKey(key);
                const total = FORMATIONS[key].reduce((a, b) => a + b, 0);
                setPositions(Array(total).fill(""));
                setSelectedPlayer("");
              }}
            >
              {key}
            </button>
          ))}
        </div>

        <div className="btn-group">
          <button className="btn" onClick={clearPitch}>Reset</button>
          <button className="btn btn-secondary" onClick={downloadPNG}>Download PNG</button>
        </div>
      </div>

      <div className="pitch-container" ref={pitchRef}>
        <div className="pitch">
          <div className="halfway" />
          <div className="center-circle" />
          <div className="penalty penalty-bottom" />
          <div className="six six-bottom" />
          <div className="pen-spot pen-spot-bottom" />
          <div className="penalty penalty-top" />
          <div className="six six-top" />
          <div className="pen-spot pen-spot-top" />

          {spots.map((s) => (
            <PositionDot
              key={s.idx}
              idx={s.idx}
              x={s.x}
              y={s.y}
              value={positions[s.idx]}
              onDrop={(name) => setSpot(s.idx, name)}
              onRemove={() => removeSpot(s.idx)}
              onTapAssign={() => selectedPlayer && setSpot(s.idx, selectedPlayer)}
            />
          ))}
        </div>

        {drag && (
          <div
            className="drag-ghost"
            style={{ left: drag.x, top: drag.y, width: `calc(var(--spot-size) * 0.9)`, height: `calc(var(--spot-size) * 0.9)` }}
          >
            {drag.name}
          </div>
        )}
      </div>

      <h3 className="subtitle">Bench</h3>
      <div className="bench scroll-x">
        {bench.map((p) => (
          <DraggableBadge
            key={p}
            name={p}
            onDelete={deletePlayer}
            onSelect={setSelectedPlayer}
            selected={selectedPlayer === p}
            onPointerDragStart={onPointerDragStart}
          />
        ))}
      </div>

      <form
        className="add-form"
        onSubmit={(e) => { e.preventDefault(); addPlayer(newName); setNewName(""); }}
      >
        <input
          className="input"
          placeholder="Add player name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button className="btn btn-primary" type="submit">Add</button>
      </form>
    </div>
  );
}
