import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../../lib/supabase'
import { R, B, K, W, GR, HABITS, DAY_SHORT, DAY_FULL, MENTAL_LABELS, MENTAL_COLORS, ENERGIE_LABELS, ENERGIE_COLORS } from '../../lib/constants'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// ── Ring SVG ─────────────────────────────────────────────
function Ring({ pct, color, size = 64 }) {
  const r = (size - 8) / 2, c = 2 * Math.PI * r
  const p = Math.min(Math.max(pct || 0, 0), 1)
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#EBEBEB" strokeWidth={6}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${c*p} ${c}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray .35s" }}/>
    </svg>
  )
}

// ── Scale 1-10 ────────────────────────────────────────────
function ScaleRow({ label, emoji, value, onChange }) {
  const cols = ["#4CAF50","#4CAF50","#8BC34A","#CDDC39","#FFC107","#FFC107","#FF9800","#FF5722",R,"#B71C1C"]
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: .8, color: K, marginBottom: 9 }}>{emoji} {label}</div>
      <div style={{ display: "flex", gap: 4 }}>
        {[1,2,3,4,5,6,7,8,9,10].map(n => (
          <button key={n} onClick={() => onChange(value === n ? null : n)} style={{
            flex: 1, aspectRatio: "1", borderRadius: 7, border: "none",
            background: value === n ? cols[n-1] : "#EFEFEF",
            color: value === n ? W : "#999",
            fontWeight: 900, fontSize: 12, cursor: "pointer",
            transform: value === n ? "scale(1.1)" : "scale(1)",
            transition: "all .12s",
          }}>{n}</button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 9, color: "#CCC" }}>← Facile</span>
        <span style={{ fontSize: 9, color: "#CCC" }}>Difficile →</span>
      </div>
    </div>
  )
}

function TextBox({ label, value, onChange, placeholder, rows = 2 }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <div style={{ fontWeight: 800, fontSize: 11, color: K, marginBottom: 6, textTransform: "uppercase" }}>{label}</div>}
      <textarea value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} rows={rows}
        style={{ width: "100%", padding: "12px 13px", borderRadius: 10, border: "1.5px solid #E0E0E0",
          fontSize: 14, fontFamily: "inherit", resize: "vertical", outline: "none",
          background: W, color: K, boxSizing: "border-box", lineHeight: 1.5 }}/>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// DAY VIEW
// ════════════════════════════════════════════════════════
function DayView({ dayIdx, clientSlug, clientName, startDate, allData, onSave, onBack }) {
  const existing   = allData[dayIdx] || {}
  const [habits,   setHabits]   = useState(existing.habits || {})
  const [poids,    setPoids]    = useState(existing.poids || "")
  const [mental,   setMental]   = useState(existing.mental ?? null)
  const [energie,  setEnergie]  = useState(existing.energie ?? null)
  const [sommeilH, setSommeilH] = useState(existing.sommeilH || "")
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [showBilan,setShowBilan]= useState(false)

  const bilan0 = existing.bilan || {}
  const [sportDiff,    setSportDiff]    = useState(bilan0.sportDiff || null)
  const [nutritionDiff,setNutritionDiff]= useState(bilan0.nutritionDiff || null)
  const [sommeilDiff,  setSommeilDiff]  = useState(bilan0.sommeilDiff || null)
  const [stress,       setStress]       = useState(bilan0.stress || null)
  const [victoire,     setVictoire]     = useState(bilan0.victoire || "")
  const [blocage,      setBlocage]      = useState(bilan0.blocage || "")
  const [ressenti,     setRessenti]     = useState(bilan0.ressenti || "")
  const [question,     setQuestion]     = useState(bilan0.question || "")

  const isSunday  = (dayIdx + 1) % 7 === 0
  const weekNum   = Math.floor(dayIdx / 7) + 1
  const dayOfWeek = dayIdx % 7
  const habitsDone = HABITS.filter(h => habits[h.id]).length

  // compute today90
  const today90 = (() => {
    if (!startDate) return 0
    const diff = Math.floor((new Date() - new Date(startDate)) / (1000*60*60*24))
    return Math.max(0, Math.min(diff, 89))
  })()

  const persist = useCallback(async (h, p, m, e, sh, b) => {
    const dayData = { habits: h, poids: p, mental: m, energie: e, sommeilH: sh, bilan: b }
    onSave(dayIdx, dayData)
    setSaving(true)
    try {
      await supabase.from('tracking').upsert({
        client_slug: clientSlug,
        day_index: dayIdx,
        data: dayData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'client_slug,day_index' })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch(err) { console.error(err) }
    setSaving(false)
  }, [clientSlug, dayIdx, onSave])

  const toggle = (id) => {
    const next = { ...habits, [id]: !habits[id] }
    setHabits(next)
    persist(next, poids, mental, energie, sommeilH, existing.bilan || null)
  }
  const hp  = (v) => { setPoids(v);   persist(habits, v, mental, energie, sommeilH, existing.bilan || null) }
  const hm  = (v) => { const n = mental===v?null:v;  setMental(n);  persist(habits, poids, n, energie, sommeilH, existing.bilan || null) }
  const he  = (v) => { const n = energie===v?null:v; setEnergie(n); persist(habits, poids, mental, n, sommeilH, existing.bilan || null) }
  const hsh = (v) => { setSommeilH(v); persist(habits, poids, mental, energie, v, existing.bilan || null) }

  const saveBilan = () => {
    const b = { sportDiff, nutritionDiff, sommeilDiff, stress, victoire, blocage, ressenti, question }
    persist(habits, poids, mental, energie, sommeilH, b)
    setShowBilan(false)
  }

  return (
    <div style={{ minHeight: "100vh", background: GR, paddingBottom: 60 }}>
      <Head><title>Jour {dayIdx+1} — {clientName}</title></Head>

      {/* Header */}
      <div style={{ background: K, padding: "16px 18px 14px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: "#888", fontSize: 22, cursor: "pointer", padding: 0, lineHeight: 1 }}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ color: W, fontWeight: 900, fontSize: 15 }}>Jour {dayIdx+1} · {DAY_FULL[dayOfWeek]}</div>
            <div style={{ color: "#666", fontSize: 12 }}>Semaine {weekNum} · {clientName}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {saving && <span style={{ fontSize: 11, color: "#888" }}>⏳</span>}
            {saved  && <span style={{ fontSize: 11, color: "#4CAF50" }}>✓ Sauvegardé</span>}
            <div style={{ position: "relative", width: 48, height: 48 }}>
              <Ring pct={habitsDone/HABITS.length} color={habitsDone===HABITS.length?"#4CAF50":R} size={48}/>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: W, fontWeight: 900, fontSize: 11 }}>{habitsDone}/{HABITS.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 14px 0" }}>
        {dayIdx > today90 && (
          <div style={{ background: "#EEF4FF", border: "2px solid #C5D8F0", borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>📅</span>
            <span style={{ fontSize: 13, color: "#5580AA", fontWeight: 700 }}>Jour futur — tu peux anticiper</span>
          </div>
        )}

        {/* POIDS */}
        <div style={{ background: W, borderRadius: 14, padding: "14px 16px", marginBottom: 10, boxShadow: "0 1px 4px #0001", display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 24 }}>⚖️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 11, color: "#AAA", letterSpacing: 1, marginBottom: 6 }}>POIDS (KG)</div>
            <input type="number" value={poids} onChange={e => hp(e.target.value)}
              placeholder="ex: 78.5" step="0.1"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #E8E8E8",
                fontSize: 18, fontWeight: 900, outline: "none", background: W, color: K, boxSizing: "border-box" }}/>
          </div>
        </div>

        {/* SOMMEIL HEURES */}
        <div style={{ background: W, borderRadius: 14, padding: "14px 16px", marginBottom: 10, boxShadow: "0 1px 4px #0001", display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 24 }}>⏱️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 11, color: "#AAA", letterSpacing: 1, marginBottom: 6 }}>HEURES DE SOMMEIL</div>
            <input type="number" value={sommeilH} onChange={e => hsh(e.target.value)}
              placeholder="ex: 7.5" step="0.5" min="0" max="24"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #E8E8E8",
                fontSize: 18, fontWeight: 900, outline: "none", background: W, color: K, boxSizing: "border-box" }}/>
          </div>
        </div>

        {/* MENTAL */}
        <div style={{ background: W, borderRadius: 14, padding: "14px 16px", marginBottom: 10, boxShadow: "0 1px 4px #0001" }}>
          <div style={{ fontWeight: 800, fontSize: 11, color: "#AAA", letterSpacing: 1, marginBottom: 10 }}>🧠 RESSENTI MENTAL</div>
          <div style={{ display: "flex", gap: 6 }}>
            {MENTAL_LABELS.map((l, i) => (
              <button key={i} onClick={() => hm(i)} style={{
                flex: 1, padding: "11px 0", borderRadius: 10, border: "none",
                background: mental === i ? MENTAL_COLORS[i] : "#F0F0F0",
                color: mental === i ? W : "#888",
                fontWeight: 800, fontSize: 11, cursor: "pointer", transition: "all .12s",
              }}>{l}</button>
            ))}
          </div>
        </div>

        {/* ÉNERGIE */}
        <div style={{ background: W, borderRadius: 14, padding: "14px 16px", marginBottom: 10, boxShadow: "0 1px 4px #0001" }}>
          <div style={{ fontWeight: 800, fontSize: 11, color: "#AAA", letterSpacing: 1, marginBottom: 10 }}>⚡ ÉNERGIE PHYSIQUE</div>
          <div style={{ display: "flex", gap: 6 }}>
            {ENERGIE_LABELS.map((l, i) => (
              <button key={i} onClick={() => he(i)} style={{
                flex: 1, padding: "11px 0", borderRadius: 10, border: "none",
                background: energie === i ? ENERGIE_COLORS[i] : "#F0F0F0",
                color: energie === i ? W : "#888",
                fontWeight: 800, fontSize: 11, cursor: "pointer", transition: "all .12s",
              }}>{l}</button>
            ))}
          </div>
        </div>

        {/* HABITUDES */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 11, color: "#AAA", letterSpacing: 1, marginBottom: 10 }}>HABITUDES DU JOUR</div>
          {HABITS.map(h => {
            const checked = !!habits[h.id]
            return (
              <div key={h.id} onClick={() => toggle(h.id)} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "17px 18px",
                background: checked ? h.color : W,
                borderRadius: 14,
                border: `2px solid ${checked ? h.color : "#E8E8E8"}`,
                cursor: "pointer", marginBottom: 9,
                transition: "all .15s",
                boxShadow: checked ? `0 3px 12px ${h.color}33` : "0 1px 4px #0001",
                userSelect: "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                  <span style={{ fontSize: 26 }}>{h.icon}</span>
                  <span style={{ fontWeight: 800, fontSize: 15, color: checked ? W : K }}>{h.label}</span>
                </div>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  border: `2.5px solid ${checked ? "rgba(255,255,255,.5)" : "#DDD"}`,
                  background: checked ? "rgba(255,255,255,.2)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {checked && <span style={{ color: W, fontSize: 15, fontWeight: 900 }}>✓</span>}
                </div>
              </div>
            )
          })}
        </div>

        {/* BILAN DIMANCHE */}
        {isSunday && (
          <>
            <button onClick={() => setShowBilan(!showBilan)} style={{
              width: "100%", marginTop: 8, padding: "18px 0", borderRadius: 14,
              border: "none", background: showBilan ? "#444" : R, color: W, fontWeight: 900, fontSize: 15,
              letterSpacing: 1.5, cursor: "pointer", textTransform: "uppercase",
              boxShadow: `0 4px 18px ${R}44`,
            }}>
              {showBilan ? "▲ Fermer" : existing.bilan ? "✏️ Modifier mon bilan" : "📋 Bilan de semaine →"}
            </button>

            {showBilan && (
              <div style={{ marginTop: 16 }}>
                <div style={{ background: W, borderRadius: 16, padding: "18px 16px", marginBottom: 14, boxShadow: "0 1px 6px #0001" }}>
                  <div style={{ fontWeight: 900, fontSize: 14, color: K, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 3, height: 18, background: R, borderRadius: 2 }}/>
                    Difficulté ressentie — Semaine {weekNum}
                  </div>
                  <ScaleRow label="SPORT"     emoji="🏋️" value={sportDiff}     onChange={setSportDiff}/>
                  <ScaleRow label="NUTRITION" emoji="🥗"  value={nutritionDiff} onChange={setNutritionDiff}/>
                  <ScaleRow label="SOMMEIL"   emoji="😴"  value={sommeilDiff}   onChange={setSommeilDiff}/>
                  <ScaleRow label="STRESS"    emoji="🧠"  value={stress}        onChange={setStress}/>
                </div>
                <div style={{ background: W, borderRadius: 16, padding: "18px 16px", marginBottom: 14, boxShadow: "0 1px 6px #0001" }}>
                  <div style={{ fontWeight: 900, fontSize: 14, color: K, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 3, height: 18, background: B, borderRadius: 2 }}/>
                    Ressenti de la semaine
                  </div>
                  <TextBox label="🏆 Victoire"              value={victoire}  onChange={setVictoire}  placeholder="Ta plus grande réussite..." rows={2}/>
                  <TextBox label="🤛 Ce qui a été difficile" value={blocage}   onChange={setBlocage}   placeholder="Le plus gros challenge..."  rows={2}/>
                  <TextBox label="💬 Ressenti général"       value={ressenti}  onChange={setRessenti}  placeholder="Corps, tête, énergie..."    rows={3}/>
                  <TextBox label="❓ Question pour Akli"     value={question}  onChange={setQuestion}  placeholder="Ce que tu veux me dire..."  rows={2}/>
                </div>
                <button onClick={saveBilan} style={{
                  width: "100%", padding: "18px 0", borderRadius: 12, border: "none",
                  background: R, color: W, fontWeight: 900, fontSize: 15,
                  letterSpacing: 1.5, cursor: "pointer", textTransform: "uppercase",
                  boxShadow: `0 4px 16px ${R}44`,
                }}>Enregistrer ✓</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// CALENDAR VIEW
// ════════════════════════════════════════════════════════
function CalendarView({ clientName, allData, today90, onSelectDay }) {
  const [openMonth, setOpenMonth] = useState(Math.floor(Math.min(today90, 89) / 28))

  const dotColor = (idx) => {
    if (idx > today90) return "#EEF4FF"
    const d = allData[idx]
    if (!d || !d.habits) return "#FFCDD2"
    const done = HABITS.filter(h => d.habits[h.id]).length
    if (done === 0) return "#FFCDD2"
    if (done < HABITS.length * .5) return "#FFD0B0"
    if (done < HABITS.length) return "#C8E6C9"
    return "#4CAF50"
  }

  const filled = Object.keys(allData).filter(i => parseInt(i) <= today90 && allData[i]).length
  const globalPct = Math.round((filled / Math.max(today90 + 1, 1)) * 100)

  return (
    <div style={{ paddingBottom: 20 }}>
      <div style={{ background: K, padding: "20px 18px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <div style={{ width: 3, height: 18, background: R, borderRadius: 2 }}/>
          <span style={{ color: W, fontWeight: 900, fontSize: 16, letterSpacing: 2, textTransform: "uppercase" }}>AM Coach</span>
          <div style={{ width: 3, height: 18, background: B, borderRadius: 2 }}/>
        </div>
        <div style={{ color: "#888", fontSize: 13, paddingLeft: 11, fontWeight: 700 }}>{clientName} · 90 jours</div>
      </div>

      <div style={{ padding: "16px 14px 0" }}>
        <div style={{ background: W, borderRadius: 16, padding: "16px 18px", marginBottom: 18,
          display: "flex", alignItems: "center", gap: 16, boxShadow: "0 1px 6px #0001" }}>
          <div style={{ position: "relative", width: 64, height: 64 }}>
            <Ring pct={globalPct/100} color={globalPct>80?"#4CAF50":globalPct>50?"#FF9800":R} size={64}/>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontWeight: 900, fontSize: 15, color: K }}>{globalPct}%</span>
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 17, color: K }}>Progression</div>
            <div style={{ fontSize: 12, color: "#999", marginTop: 3 }}>Jour {Math.min(today90+1, 90)} sur 90</div>
            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[["#4CAF50","Complet"],["#FFD0B0","Partiel"],["#FFCDD2","Manqué"],["#EEF4FF","À venir"]].map(([c,l]) => (
                <span key={l} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#AAA" }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: c, display: "inline-block" }}/>{l}
                </span>
              ))}
            </div>
          </div>
        </div>

        {[0,1,2].map(mi => {
          const pastDays  = Array.from({length:28},(_,i)=>mi*28+i).filter(i=>i<90&&i<=today90)
          const filledD   = pastDays.filter(i=>allData[i])
          const mPct      = pastDays.length>0?Math.round(filledD.length/pastDays.length*100):0
          const isOpen    = openMonth === mi
          const isCurrent = mi === Math.floor(Math.min(today90,89)/28)
          const weeks     = []
          for (let w=0;w<4;w++) weeks.push([0,1,2,3,4,5,6].map(d=>{const idx=mi*28+w*7+d;return idx<90?idx:null}))

          return (
            <div key={mi} style={{ marginBottom: 10 }}>
              <button onClick={() => setOpenMonth(isOpen ? -1 : mi)} style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 16px", borderRadius: 12, border: "none",
                background: isOpen ? K : W, cursor: "pointer", marginBottom: 4,
                boxShadow: "0 1px 4px #0001",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 3, height: 16, background: isOpen ? R : "#DDD", borderRadius: 2 }}/>
                  <span style={{ fontWeight: 900, fontSize: 15, color: isOpen ? W : K }}>Mois {mi+1}</span>
                  {isCurrent && <span style={{ fontSize: 10, background: R, color: W, padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>EN COURS</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 60, height: 6, background: "#EEE", borderRadius: 3 }}>
                    <div style={{ height: 6, borderRadius: 3, background: mPct>80?"#4CAF50":mPct>50?"#FF9800":R, width: `${mPct}%` }}/>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: isOpen ? "#888" : "#BBB" }}>{mPct}%</span>
                </div>
              </button>

              {isOpen && (
                <div style={{ background: W, borderRadius: 12, padding: "14px 12px", boxShadow: "0 1px 4px #0001" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 8 }}>
                    {DAY_SHORT.map((d,i) => <div key={i} style={{ textAlign: "center", fontSize: 9, fontWeight: 700, color: "#CCC" }}>{d}</div>)}
                  </div>
                  {weeks.map((week,wi) => (
                    <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 4 }}>
                      {week.map((idx,di) => {
                        if (idx===null) return <div key={di}/>
                        const isToday = idx===today90
                        const future  = idx>today90
                        const hasBilan= !!allData[idx]?.bilan
                        return (
                          <button key={di} onClick={() => onSelectDay(idx)} style={{
                            aspectRatio: "1", borderRadius: 8,
                            border: isToday ? `2.5px solid ${R}` : "2px solid transparent",
                            background: dotColor(idx),
                            cursor: "pointer",
                            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                            position: "relative", padding: 0,
                          }}>
                            <span style={{ fontSize: 11, fontWeight: isToday?900:700, color: future?"#A0B8D8":K, lineHeight: 1 }}>{idx+1}</span>
                            {hasBilan && <span style={{ fontSize: 6, position: "absolute", bottom: 1, right: 2 }}>📋</span>}
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// STATS VIEW
// ════════════════════════════════════════════════════════
function StatsView({ clientName, allData }) {
  const [filter, setFilter] = useState("all")

  const days90 = Array.from({length:90}, (_,i) => {
    const d = allData[i] || {}
    const habits = d.habits || {}
    const done = HABITS.filter(h=>habits[h.id]).length
    const hasData = Object.keys(d).length>0
    const mentalScore  = d.mental  != null ? (4-d.mental)*25  : null
    const energieScore = d.energie != null ? d.energie*25     : null
    return {
      day: i+1, label: `J${i+1}`,
      score:      hasData ? Math.round(done/HABITS.length*100) : null,
      poids:      d.poids   ? parseFloat(d.poids)   : null,
      mental:     mentalScore,
      energie:    energieScore,
      sommeilH:   d.sommeilH ? parseFloat(d.sommeilH) : null,
      sport:      hasData ? (habits.sport?100:0)       : null,
      nutrition:  hasData ? (habits.nutrition?100:0)   : null,
      sommeil:    hasData ? (habits.sommeil?100:0)     : null,
      hydratation:hasData ? (habits.hydratation?100:0) : null,
      complements:hasData ? (habits.complements?100:0) : null,
    }
  })

  const lastFilled = days90.findLastIndex(d => d.score !== null)
  const filtered = filter==="week"  ? days90.slice(Math.max(0,lastFilled-6))
                 : filter==="month" ? days90.slice(Math.max(0,lastFilled-27))
                 : days90

  const avg = (key) => {
    const vals = days90.map(d=>d[key]).filter(v=>v!=null)
    return vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length*10)/10 : null
  }

  const poidsVals = days90.map(d=>d.poids).filter(v=>v)
  const diffPoids = poidsVals.length>=2 ? Math.round((poidsVals[poidsVals.length-1]-poidsVals[0])*10)/10 : null

  function ChartBlock({ title, color, dataKey, unit="%", domain=[0,100] }) {
    const hasAny = filtered.some(d => d[dataKey]!=null)
    return (
      <div style={{ background: W, borderRadius: 16, padding: "16px 14px", marginBottom: 14, boxShadow: "0 1px 6px #0001" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: color, flexShrink: 0 }}/>
          <span style={{ fontWeight: 900, fontSize: 14, color: K, flex: 1 }}>{title}</span>
          {avg(dataKey)!=null && <span style={{ fontSize: 11, color: "#AAA" }}>moy. {avg(dataKey)}{unit}</span>}
        </div>
        {!hasAny ? (
          <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", color: "#CCC", fontSize: 13 }}>Aucune donnée encore</div>
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={filtered} margin={{ top:4, right:8, left:-24, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0"/>
              <XAxis dataKey="label" tick={{fontSize:9,fill:"#BBB"}} interval={Math.max(0,Math.floor(filtered.length/6)-1)} tickLine={false}/>
              <YAxis domain={domain} tick={{fontSize:9,fill:"#BBB"}} tickLine={false} axisLine={false}/>
              <Tooltip
                contentStyle={{ background:K, border:"none", borderRadius:8, color:W, fontSize:12, padding:"8px 12px" }}
                labelStyle={{ color:"#888", fontSize:11 }}
                formatter={(v) => v!=null ? [`${v}${unit}`, title] : ["—", title]}
              />
              <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5}
                dot={(props) => { const {cx,cy,value}=props; if(value==null) return null; return <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={3} fill={color} strokeWidth={0}/> }}
                connectNulls={false}
                activeDot={{ r:5, fill:color, strokeWidth:2, stroke:W }}/>
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 20 }}>
      <div style={{ background: K, padding: "20px 18px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <div style={{ width: 3, height: 18, background: R, borderRadius: 2 }}/>
          <span style={{ color: W, fontWeight: 900, fontSize: 16, letterSpacing: 2, textTransform: "uppercase" }}>Stats</span>
          <div style={{ width: 3, height: 18, background: B, borderRadius: 2 }}/>
        </div>
        <div style={{ color: "#888", fontSize: 13, paddingLeft: 11, fontWeight: 700 }}>{clientName} · Courbes 90 jours</div>
      </div>

      <div style={{ padding: "16px 14px 0" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
          {[["all","90 jours"],["month","30 jours"],["week","7 jours"]].map(([id,label]) => (
            <button key={id} onClick={() => setFilter(id)} style={{
              flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
              background: filter===id ? K : "#EBEBEB",
              color: filter===id ? W : "#888",
              fontWeight: 800, fontSize: 12, cursor: "pointer",
            }}>{label}</button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {[["Score moyen",avg("score"),R,"%"],["Mental",avg("mental"),B,"%"]].map(([l,v,c,u]) => (
            <div key={l} style={{ flex:1, background:W, borderRadius:14, padding:"14px 16px", textAlign:"center", boxShadow:"0 1px 4px #0001" }}>
              <div style={{ fontSize:22, fontWeight:900, color:c }}>{v!=null?`${v}${u}`:"—"}</div>
              <div style={{ fontSize:11, color:"#AAA", marginTop:3, fontWeight:700 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {[["Énergie",avg("energie"),"#FF9800","%"],["Sommeil moy.",avg("sommeilH"),"#0097A7","h"]].map(([l,v,c,u]) => (
            <div key={l} style={{ flex:1, background:W, borderRadius:14, padding:"14px 16px", textAlign:"center", boxShadow:"0 1px 4px #0001" }}>
              <div style={{ fontSize:22, fontWeight:900, color:c }}>{v!=null?`${v}${u}`:"—"}</div>
              <div style={{ fontSize:11, color:"#AAA", marginTop:3, fontWeight:700 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          <div style={{ flex:1, background:W, borderRadius:14, padding:"14px 16px", textAlign:"center", boxShadow:"0 1px 4px #0001" }}>
            <div style={{ fontSize:22, fontWeight:900, color:K }}>{poidsVals[poidsVals.length-1]||"—"}<span style={{fontSize:14}}> kg</span></div>
            <div style={{ fontSize:11, color:"#AAA", marginTop:3, fontWeight:700 }}>Poids actuel</div>
          </div>
          <div style={{ flex:1, background:W, borderRadius:14, padding:"14px 16px", textAlign:"center", boxShadow:"0 1px 4px #0001" }}>
            <div style={{ fontSize:22, fontWeight:900, color:diffPoids==null?"#CCC":diffPoids<=0?"#4CAF50":R }}>
              {diffPoids!=null?(diffPoids>0?`+${diffPoids}`:diffPoids):"—"}<span style={{fontSize:14}}> kg</span>
            </div>
            <div style={{ fontSize:11, color:"#AAA", marginTop:3, fontWeight:700 }}>Évolution</div>
          </div>
        </div>

        <ChartBlock title="Score global" color={R} dataKey="score"/>
        <ChartBlock title="Ressenti mental" color={B} dataKey="mental"/>
        <ChartBlock title="Énergie physique" color="#FF9800" dataKey="energie"/>
        <ChartBlock title="Heures de sommeil" color="#0097A7" dataKey="sommeilH" unit="h" domain={[0,12]}/>
        <ChartBlock title="Poids (kg)" color="#555" dataKey="poids" unit=" kg" domain={["auto","auto"]}/>
        <ChartBlock title="Sport" color={R} dataKey="sport"/>
        <ChartBlock title="Nutrition" color="#2E7D32" dataKey="nutrition"/>
        <ChartBlock title="Hydratation" color="#0097A7" dataKey="hydratation"/>
        <ChartBlock title="Compléments" color="#7B1FA2" dataKey="complements"/>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// MAIN PAGE — /client/[slug]
// ════════════════════════════════════════════════════════
export default function ClientPage() {
  const router    = useRouter()
  const { slug }  = router.query

  const [loading,     setLoading]     = useState(true)
  const [clientName,  setClientName]  = useState("")
  const [startDate,   setStartDate]   = useState("")
  const [allData,     setAllData]     = useState({})
  const [view,        setView]        = useState("calendar")
  const [selDay,      setSelDay]      = useState(null)
  const [notFound,    setNotFound]    = useState(false)

  const today90 = (() => {
    if (!startDate) return 0
    const diff = Math.floor((new Date() - new Date(startDate)) / (1000*60*60*24))
    return Math.max(0, Math.min(diff, 89))
  })()

  useEffect(() => {
    if (!slug) return
    const fetchData = async () => {
      setLoading(true)
      // Fetch client info
      const { data: client, error: clientErr } = await supabase
        .from('clients')
        .select('*')
        .eq('slug', slug)
        .single()

      if (clientErr || !client) { setNotFound(true); setLoading(false); return }

      setClientName(client.name)
      setStartDate(client.start_date)

      // Fetch all tracking rows
      const { data: rows } = await supabase
        .from('tracking')
        .select('day_index, data')
        .eq('client_slug', slug)

      const mapped = {}
      if (rows) rows.forEach(r => { mapped[r.day_index] = r.data })
      setAllData(mapped)
      setLoading(false)
    }
    fetchData()
  }, [slug])

  const handleSave = useCallback((idx, dayData) => {
    setAllData(prev => ({ ...prev, [idx]: dayData }))
  }, [])

  if (loading) return (
    <div style={{ minHeight:"100vh", background:K, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ color:"#555", fontSize:14 }}>Chargement...</div>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight:"100vh", background:K, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32, textAlign:"center" }}>
      <div style={{ color:W, fontWeight:900, fontSize:20, marginBottom:12 }}>Client introuvable</div>
      <div style={{ color:"#555", fontSize:14 }}>Ce lien n'est pas valide.</div>
    </div>
  )

  if (selDay !== null) return (
    <DayView dayIdx={selDay} clientSlug={slug} clientName={clientName}
      startDate={startDate} allData={allData}
      onSave={handleSave} onBack={() => setSelDay(null)}/>
  )

  return (
    <div style={{ fontFamily:"'Inter','Helvetica Neue',sans-serif", background:GR, minHeight:"100vh", maxWidth:430, margin:"0 auto", paddingBottom:80 }}>
      <Head><title>{clientName} — AM Coach TransfoPhysique</title></Head>

      {view==="calendar"
        ? <CalendarView clientName={clientName} allData={allData} today90={today90} onSelectDay={setSelDay}/>
        : <StatsView    clientName={clientName} allData={allData}/>
      }

      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, background:W, borderTop:"1.5px solid #EEE", display:"flex", padding:"10px 0 18px", zIndex:200 }}>
        {[["calendar","📅","Agenda"],["stats","📈","Stats"]].map(([id,ico,label]) => (
          <button key={id} onClick={() => setView(id)} style={{ flex:1, border:"none", background:"transparent", display:"flex", flexDirection:"column", alignItems:"center", gap:3, cursor:"pointer" }}>
            <span style={{ fontSize:24 }}>{ico}</span>
            <span style={{ fontSize:10, fontWeight:view===id?900:600, color:view===id?R:"#BBB" }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
