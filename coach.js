import { useState, useEffect } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'
import { R, B, K, W, GR, HABITS } from '../lib/constants'

const COACH_PASSWORD = process.env.NEXT_PUBLIC_COACH_PASSWORD || "akli2024"

function Ring({ pct, color, size = 48 }) {
  const r = (size - 6) / 2, c = 2 * Math.PI * r
  const p = Math.min(Math.max(pct || 0, 0), 1)
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#EBEBEB" strokeWidth={5}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${c*p} ${c}`} strokeLinecap="round"/>
    </svg>
  )
}

export default function CoachDashboard() {
  const [authed,    setAuthed]   = useState(false)
  const [password,  setPassword] = useState("")
  const [clients,   setClients]  = useState([])
  const [tracking,  setTracking] = useState({})
  const [loading,   setLoading]  = useState(false)
  const [newName,   setNewName]  = useState("")
  const [newSlug,   setNewSlug]  = useState("")
  const [newDate,   setNewDate]  = useState(new Date().toISOString().split("T")[0])
  const [creating,  setCreating] = useState(false)
  const [showForm,  setShowForm] = useState(false)
  const [copyMsg,   setCopyMsg]  = useState({})

  const login = () => {
    if (password === COACH_PASSWORD) setAuthed(true)
  }

  useEffect(() => {
    if (!authed) return
    const fetch = async () => {
      setLoading(true)
      const { data: cls } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
      setClients(cls || [])

      const { data: rows } = await supabase.from('tracking').select('client_slug, day_index, data')
      const map = {}
      if (rows) rows.forEach(r => {
        if (!map[r.client_slug]) map[r.client_slug] = {}
        map[r.client_slug][r.day_index] = r.data
      })
      setTracking(map)
      setLoading(false)
    }
    fetch()
  }, [authed])

  const createClient = async () => {
    if (!newName.trim() || !newSlug.trim()) return
    setCreating(true)
    const slug = newSlug.trim().toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"")
    const { error } = await supabase.from('clients').insert({ name: newName.trim(), slug, start_date: newDate })
    if (!error) {
      setClients(prev => [{ name: newName.trim(), slug, start_date: newDate, created_at: new Date().toISOString() }, ...prev])
      setNewName(""); setNewSlug(""); setShowForm(false)
    }
    setCreating(false)
  }

  const copyLink = (slug) => {
    const url = `${window.location.origin}/client/${slug}`
    navigator.clipboard.writeText(url)
    setCopyMsg(prev => ({...prev, [slug]: true}))
    setTimeout(() => setCopyMsg(prev => ({...prev, [slug]: false})), 2000)
  }

  const clientScore = (slug, startDate) => {
    const d = tracking[slug] || {}
    const today90 = Math.max(0, Math.min(Math.floor((new Date()-new Date(startDate))/(1000*60*60*24)),89))
    const filled = Object.keys(d).filter(i=>parseInt(i)<=today90&&d[i]).length
    return today90>=0 ? Math.round(filled/Math.max(today90+1,1)*100) : 0
  }

  const lastBilans = (slug) => {
    const d = tracking[slug] || {}
    return Object.entries(d)
      .filter(([,v]) => v?.bilan?.victoire || v?.bilan?.ressenti)
      .sort((a,b)=>parseInt(b[0])-parseInt(a[0]))
      .slice(0,1)
  }

  // ── Login ──
  if (!authed) return (
    <div style={{ minHeight:"100vh", background:K, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32, textAlign:"center" }}>
      <Head><title>Coach — AM Coach</title></Head>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
        <div style={{ width:4, height:26, background:R, borderRadius:2 }}/>
        <span style={{ color:W, fontWeight:900, fontSize:22, letterSpacing:3, textTransform:"uppercase" }}>AM Coach</span>
        <div style={{ width:4, height:26, background:B, borderRadius:2 }}/>
      </div>
      <div style={{ color:"#555", fontSize:13, marginBottom:40 }}>Tableau de bord coach</div>
      <div style={{ width:"100%", maxWidth:320 }}>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&login()}
          placeholder="Mot de passe coach"
          style={{ width:"100%", padding:"16px 18px", borderRadius:12, border:"2px solid #2A2A2A",
            background:"#1A1A1A", color:W, fontSize:16, outline:"none", boxSizing:"border-box",
            textAlign:"center", marginBottom:16 }}/>
        <button onClick={login} style={{ width:"100%", padding:"16px 0", borderRadius:12, border:"none",
          background:R, color:W, fontWeight:900, fontSize:16, cursor:"pointer" }}>Connexion →</button>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily:"'Inter','Helvetica Neue',sans-serif", background:GR, minHeight:"100vh", maxWidth:480, margin:"0 auto", paddingBottom:40 }}>
      <Head><title>Coach Dashboard — AM Coach</title></Head>

      {/* Header */}
      <div style={{ background:K, padding:"20px 18px 18px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
          <div style={{ width:3, height:18, background:R, borderRadius:2 }}/>
          <span style={{ color:W, fontWeight:900, fontSize:16, letterSpacing:2, textTransform:"uppercase" }}>Coach Dashboard</span>
          <div style={{ width:3, height:18, background:B, borderRadius:2 }}/>
        </div>
        <div style={{ color:"#666", fontSize:12, paddingLeft:11 }}>AM Coach Genève · TransfoPhysique</div>
      </div>

      <div style={{ padding:"16px 14px 0" }}>

        {/* Add client */}
        <button onClick={() => setShowForm(!showForm)} style={{
          width:"100%", padding:"16px 0", borderRadius:12, border:"none",
          background: showForm ? "#444" : R, color:W, fontWeight:900, fontSize:14,
          letterSpacing:1, cursor:"pointer", marginBottom:16, textTransform:"uppercase",
        }}>
          {showForm ? "▲ Annuler" : "+ Nouveau client"}
        </button>

        {showForm && (
          <div style={{ background:W, borderRadius:14, padding:"18px 16px", marginBottom:16, boxShadow:"0 1px 6px #0001" }}>
            <div style={{ fontWeight:900, fontSize:14, color:K, marginBottom:16 }}>Nouveau client</div>
            <div style={{ marginBottom:12 }}>
              <div style={{ fontWeight:800, fontSize:11, color:"#AAA", marginBottom:6 }}>PRÉNOM</div>
              <input value={newName} onChange={e=>{setNewName(e.target.value);setNewSlug(e.target.value.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,""))}}
                placeholder="ex: Sarah"
                style={{ width:"100%", padding:"12px 14px", borderRadius:10, border:"1.5px solid #E0E0E0",
                  fontSize:15, outline:"none", boxSizing:"border-box" }}/>
            </div>
            <div style={{ marginBottom:12 }}>
              <div style={{ fontWeight:800, fontSize:11, color:"#AAA", marginBottom:6 }}>SLUG (lien WhatsApp)</div>
              <input value={newSlug} onChange={e=>setNewSlug(e.target.value.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,""))}
                placeholder="ex: sarah"
                style={{ width:"100%", padding:"12px 14px", borderRadius:10, border:"1.5px solid #E0E0E0",
                  fontSize:15, outline:"none", boxSizing:"border-box" }}/>
              {newSlug && <div style={{ fontSize:11, color:"#AAA", marginTop:4 }}>→ /client/{newSlug}</div>}
            </div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontWeight:800, fontSize:11, color:"#AAA", marginBottom:6 }}>DATE DE DÉPART</div>
              <input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)}
                style={{ width:"100%", padding:"12px 14px", borderRadius:10, border:"1.5px solid #E0E0E0",
                  fontSize:15, outline:"none", boxSizing:"border-box" }}/>
            </div>
            <button onClick={createClient} disabled={creating||!newName.trim()||!newSlug.trim()} style={{
              width:"100%", padding:"14px 0", borderRadius:10, border:"none",
              background: newName.trim()&&newSlug.trim() ? R : "#EEE",
              color: newName.trim()&&newSlug.trim() ? W : "#AAA",
              fontWeight:900, fontSize:14, cursor:"pointer",
            }}>{creating ? "Création..." : "Créer le lien →"}</button>
          </div>
        )}

        {/* Client list */}
        {loading ? (
          <div style={{ textAlign:"center", color:"#AAA", padding:40 }}>Chargement...</div>
        ) : clients.length === 0 ? (
          <div style={{ textAlign:"center", color:"#AAA", padding:40 }}>Aucun client encore. Crée le premier !</div>
        ) : (
          clients.map(client => {
            const score = clientScore(client.slug, client.start_date)
            const today90 = Math.max(0, Math.min(Math.floor((new Date()-new Date(client.start_date))/(1000*60*60*24)),89))
            const bilans  = lastBilans(client.slug)
            const scoreColor = score>80?"#4CAF50":score>50?"#FF9800":R
            return (
              <div key={client.slug} style={{ background:W, borderRadius:16, padding:"18px 16px", marginBottom:12, boxShadow:"0 1px 6px #0001" }}>
                <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:14 }}>
                  <div style={{ position:"relative", width:56, height:56, flexShrink:0 }}>
                    <Ring pct={score/100} color={scoreColor} size={56}/>
                    <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <span style={{ fontWeight:900, fontSize:13, color:K }}>{score}%</span>
                    </div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:900, fontSize:18, color:K }}>{client.name}</div>
                    <div style={{ fontSize:12, color:"#AAA", marginTop:2 }}>Jour {Math.min(today90+1,90)} sur 90 · départ {new Date(client.start_date).toLocaleDateString("fr-FR")}</div>
                  </div>
                </div>

                {/* Last bilan */}
                {bilans.length>0 && bilans[0][1]?.bilan && (
                  <div style={{ background:"#F8F8F8", borderRadius:10, padding:"12px 14px", marginBottom:12 }}>
                    <div style={{ fontWeight:800, fontSize:11, color:"#AAA", marginBottom:6 }}>DERNIER BILAN</div>
                    {bilans[0][1].bilan.victoire && (
                      <div style={{ fontSize:13, color:K, marginBottom:4 }}>🏆 {bilans[0][1].bilan.victoire}</div>
                    )}
                    {bilans[0][1].bilan.blocage && (
                      <div style={{ fontSize:13, color:"#777" }}>🤛 {bilans[0][1].bilan.blocage}</div>
                    )}
                    {bilans[0][1].bilan.question && (
                      <div style={{ fontSize:13, color:R, marginTop:4, fontWeight:700 }}>❓ {bilans[0][1].bilan.question}</div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={()=>copyLink(client.slug)} style={{
                    flex:1, padding:"12px 0", borderRadius:10, border:"none",
                    background: copyMsg[client.slug] ? "#4CAF50" : K,
                    color:W, fontWeight:800, fontSize:13, cursor:"pointer",
                    transition:"background .2s",
                  }}>
                    {copyMsg[client.slug] ? "✓ Lien copié !" : "📋 Copier lien WhatsApp"}
                  </button>
                  <a href={`/client/${client.slug}`} target="_blank" rel="noreferrer" style={{
                    padding:"12px 14px", borderRadius:10,
                    background:"#F0F0F0", color:"#555",
                    fontWeight:800, fontSize:13, textDecoration:"none",
                    display:"flex", alignItems:"center",
                  }}>👁️</a>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
