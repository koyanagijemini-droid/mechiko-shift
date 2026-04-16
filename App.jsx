import { useState, useMemo, useEffect, useRef } from "react";
import { db } from "./firebase";
import { ref, set, onValue } from "firebase/database";

const DEFAULT_DEFS = [
  { id:"early", label:"早番", start:"07:00", end:"15:00", dot:"#ff9f1c", bg:"#fff3d6", border:"#ffcc66", emoji:"🌅", deletable:false },
  { id:"day",   label:"日勤", start:"09:00", end:"18:00", dot:"#2ec4b6", bg:"#d6f8f5", border:"#7de8e0", emoji:"☀️",  deletable:false },
  { id:"late",  label:"遅番", start:"13:00", end:"22:00", dot:"#e040fb", bg:"#fce4ff", border:"#f0a0ff", emoji:"🌙", deletable:false },
  { id:"night", label:"夜勤", start:"22:00", end:"07:00", dot:"#5c6bc0", bg:"#e8eaff", border:"#a0a8f8", emoji:"⭐", deletable:false },
  { id:"off",   label:"休み", start:"",      end:"",      dot:"#90a4ae", bg:"#f0f4f8", border:"#cfd8dc", emoji:"💤", deletable:false },
];

const COLOR_PRESETS = [
  {dot:"#ff5252",bg:"#ffe8e8",border:"#ffb3b3"},
  {dot:"#ff9f1c",bg:"#fff3d6",border:"#ffcc66"},
  {dot:"#ffca28",bg:"#fff8e1",border:"#ffe082"},
  {dot:"#66bb6a",bg:"#e8f5e9",border:"#a5d6a7"},
  {dot:"#2ec4b6",bg:"#d6f8f5",border:"#7de8e0"},
  {dot:"#448aff",bg:"#e3f2fd",border:"#90caf9"},
  {dot:"#5c6bc0",bg:"#e8eaff",border:"#a0a8f8"},
  {dot:"#e040fb",bg:"#fce4ff",border:"#f0a0ff"},
  {dot:"#f06292",bg:"#fce4ec",border:"#f48fb1"},
  {dot:"#90a4ae",bg:"#f0f4f8",border:"#cfd8dc"},
];

const EMOJIS = ["🌅","☀️","🌙","⭐","💤","🌸","🎯","🔥","💪","🌈","🎪","🍀","⚡","🎵","🦋"];
const DAYS = ["日","月","火","水","木","金","土"];

function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function dayOfWeek(y, m, d) { return new Date(y, m, d).getDay(); }

const TODAY = new Date();
let uid = 0;
function genId() { uid++; return "def_" + uid + "_" + Date.now(); }

const WMO = {
  0:"☀️快晴", 1:"🌤️晴れ", 2:"⛅晴曇", 3:"☁️曇り",
  45:"🌫️霧", 51:"🌦️霧雨", 61:"🌧️小雨", 63:"🌧️雨", 65:"🌧️大雨",
  71:"🌨️小雪", 73:"❄️雪", 75:"❄️大雪",
  80:"🌦️にわか雨", 95:"⛈️雷雨",
};
function wmo(code) {
  var s = WMO[code] || "🌡️不明";
  return { icon: s.slice(0, 2), label: s.slice(2) };
}

const COMMUTES = [
  { key:"car",   label:"車",    emoji:"🚗", color:"#ff9f1c", bg:"#fff3d6", border:"#ffcc66", shadow:"#e8860a" },
  { key:"train", label:"電車",  emoji:"🚃", color:"#2ec4b6", bg:"#d6f8f5", border:"#7de8e0", shadow:"#1a9a8e" },
  { key:"bike",  label:"自転車",emoji:"🚲", color:"#e040fb", bg:"#fce4ff", border:"#f0a0ff", shadow:"#b000d0" },
];

function shiftTime(def) {
  if (def && def.start && def.end) { return def.start + "-" + def.end; }
  return "—";
}

// ════════════════════════════════════
export default function App() {
  var sv = useState("home");
  var view = sv[0]; var setView = sv[1];
  var ss = useState({});
  var shifts = ss[0]; var setShifts = ss[1];
  var st = useState(null);
  var toast = st[0]; var setToast = st[1];
  var sc = useState(null);
  var commute = sc[0]; var setCommute = sc[1];
  var sd = useState(DEFAULT_DEFS);
  var defs = sd[0]; var setDefs = sd[1];
  var sl = useState(true);
  var syncing = sl[0]; var setSyncing = sl[1];
  var initRef = useRef(false);

  // Firebase: 起動時にデータを読み込み、リアルタイム同期
  useEffect(function() {
    var unsub1 = onValue(ref(db, "mechiko_shifts"), function(snap) {
      if (snap.exists()) setShifts(snap.val());
      setSyncing(false);
    }, function() { setSyncing(false); });
    var unsub2 = onValue(ref(db, "mechiko_defs"), function(snap) {
      if (snap.exists()) setDefs(snap.val());
    });
    return function() { unsub1(); unsub2(); };
  }, []);

  // Firebase: shiftsが変わったら保存（初回読み込み後のみ）
  useEffect(function() {
    if (!initRef.current) { initRef.current = true; return; }
    set(ref(db, "mechiko_shifts"), shifts);
  }, [shifts]);

  useEffect(function() {
    set(ref(db, "mechiko_defs"), defs);
  }, [defs]);

  // 同期中スプラッシュ
  if (syncing) {
    return (
      <div style={{minHeight:"100vh",background:"#fffaf0",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"sans-serif",gap:16}}>
        <div style={{fontSize:72,animation:"floatY 1.5s ease-in-out infinite"}}>🌈</div>
        <div style={{fontSize:16,fontWeight:800,color:"#ff6fd8"}}>よみこみちゅう…</div>
        <style>{"@keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}"}</style>
      </div>
    );
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(function() { setToast(null); }, 2200);
  }
  function skey(y, m, d) { return y + "-" + m + "-" + d; }
  function getShift(y, m, d) { return shifts[skey(y, m, d)] || "off"; }
  function setShift(y, m, d, type) {
    setShifts(function(p) {
      var n = {}; for (var k in p) n[k] = p[k];
      n[skey(y, m, d)] = type; return n;
    });
  }
  function getDef(id) {
    for (var i = 0; i < defs.length; i++) { if (defs[i].id === id) return defs[i]; }
    return defs[defs.length - 1];
  }

  return (
    <div style={{minHeight:"100vh",background:"#fffaf0",fontFamily:"'Rounded Mplus 1c','Noto Sans JP','Hiragino Maru Gothic Pro',sans-serif",color:"#3a3a3a",position:"relative",overflow:"hidden"}}>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,backgroundImage:"radial-gradient(circle,#ffccee 1.5px,transparent 1.5px)",backgroundSize:"28px 28px",opacity:0.45}} />
      <div style={{position:"fixed",top:"-60px",right:"-60px",width:220,height:220,borderRadius:"50%",background:"rgba(255,200,100,0.18)",pointerEvents:"none",zIndex:0}} />
      <div style={{position:"fixed",bottom:"-40px",left:"-40px",width:180,height:180,borderRadius:"50%",background:"rgba(100,220,200,0.18)",pointerEvents:"none",zIndex:0}} />

      {toast && (
        <div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:"linear-gradient(135deg,#ff6fd8,#ff9f1c)",color:"#fff",padding:"12px 28px",borderRadius:40,fontWeight:900,fontSize:14,zIndex:9999,boxShadow:"0 6px 24px rgba(255,111,216,0.45)",whiteSpace:"nowrap"}}>
          {"✨ " + toast}
        </div>
      )}

      <div style={{position:"relative",zIndex:1}}>
        {view === "home"     && <HomeScreen     onRegister={function(){ setView("register"); }} onConfirm={function(){ setView("confirm"); }} onShare={function(){ setView("share"); }} commute={commute} setCommute={setCommute} />}
        {view === "register" && <RegisterScreen getShift={getShift} setShift={setShift} showToast={showToast} onBack={function(){ setView("home"); }} defs={defs} setDefs={setDefs} />}
        {view === "confirm"  && <ConfirmScreen  shifts={shifts} skey={skey} onBack={function(){ setView("home"); }} commute={commute} getDef={getDef} />}
        {view === "share"    && <ShareScreen    shifts={shifts} skey={skey} onBack={function(){ setView("home"); }} defs={defs} getDef={getDef} showToast={showToast} />}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rounded+Mplus+1c:wght@400;700;800&display=swap');
        *{box-sizing:border-box}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes floatY{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-10px) rotate(3deg)}}
        @keyframes popIn{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:scale(1)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .pbtn{transition:transform .15s!important;}
        .pbtn:hover{transform:translateY(-3px) scale(1.03)!important;}
        .pbtn:active{transform:translateY(1px) scale(.97)!important;}
        input[type=time],input[type=text]{font-family:inherit;}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-thumb{background:#f0a0d0;border-radius:10px}
      `}</style>
    </div>
  );
}

// ── Home ─────────────────────────────────────────────
function HomeScreen(props) {
  var onRegister = props.onRegister;
  var onConfirm  = props.onConfirm;
  var onShare    = props.onShare;
  var commute    = props.commute;
  var setCommute = props.setCommute;

  var hour = TODAY.getHours();
  var greeting = hour < 12 ? "おはよう！☀️" : hour < 18 ? "こんにちは！🌸" : "こんばんは！🌙";

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 24px"}}>
      <div style={{fontSize:80,marginBottom:8,animation:"floatY 2.5s ease-in-out infinite",filter:"drop-shadow(0 8px 16px rgba(255,160,50,0.35))"}}>🌈</div>
      <div style={{fontSize:22,marginBottom:16,letterSpacing:8}}>⭐🌟⭐</div>
      <div style={{fontSize:15,fontWeight:800,color:"#ff6fd8",marginBottom:10,background:"#fff",padding:"5px 18px",borderRadius:30,boxShadow:"0 3px 0 #f0a0d0"}}>{greeting}</div>
      <div style={{fontSize:34,fontWeight:800,marginBottom:4,textAlign:"center"}}>
        <span style={{color:"#ff6fd8"}}>め</span>
        <span style={{color:"#ff9f1c"}}>ち</span>
        <span style={{color:"#2ec4b6"}}>こ</span>
        <span style={{color:"#5c6bc0"}}>の</span>
        <span style={{color:"#ff6fd8"}}>シ</span>
        <span style={{color:"#ff9f1c"}}>フ</span>
        <span style={{color:"#2ec4b6"}}>ト</span>
      </div>
      <div style={{fontSize:12,color:"#b0b0b0",marginBottom:28,fontWeight:700,letterSpacing:2}}>📍 愛知県瀬戸市</div>

      <div style={{width:"100%",maxWidth:320,marginBottom:24,background:"#fff",borderRadius:24,padding:"14px 16px",border:"3px dashed #ffc0e0",boxShadow:"0 4px 0 #f5d0e8"}}>
        <div style={{fontSize:13,fontWeight:800,color:"#ff6fd8",marginBottom:10,textAlign:"center"}}>🚀 今日の出勤方法は？</div>
        <div style={{display:"flex",gap:8}}>
          {COMMUTES.map(function(opt) {
            var sel = commute === opt.key;
            return (
              <button key={opt.key} className="pbtn" onClick={function(){ setCommute(sel ? null : opt.key); }}
                style={{flex:1,padding:"9px 4px",borderRadius:14,cursor:"pointer",border:"3px solid " + (sel ? opt.color : opt.border),background:sel ? opt.color : opt.bg,color:sel ? "#fff" : opt.color,fontWeight:800,fontSize:11,fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                <span style={{fontSize:20}}>{opt.emoji}</span>
                <span>{opt.label}</span>
                {sel && <span style={{fontSize:8,background:"rgba(255,255,255,0.3)",borderRadius:10,padding:"1px 5px"}}>✓ 選択中</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:14,width:"100%",maxWidth:300}}>
        <button className="pbtn" onClick={onRegister} style={{padding:"18px 0",borderRadius:999,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#ff6fd8,#ff9f1c)",color:"#fff",fontWeight:800,fontSize:17,fontFamily:"inherit",boxShadow:"0 6px 0 #d04faa",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
          <span style={{fontSize:22}}>📝</span> シフト登録
        </button>
        <button className="pbtn" onClick={onConfirm} style={{padding:"18px 0",borderRadius:999,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#2ec4b6,#5c6bc0)",color:"#fff",fontWeight:800,fontSize:17,fontFamily:"inherit",boxShadow:"0 6px 0 #1a9a8e",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
          <span style={{fontSize:22}}>📋</span> 今日のめちこ
        </button>
        <button className="pbtn" onClick={onShare} style={{padding:"18px 0",borderRadius:999,border:"3px solid #ffc0e0",cursor:"pointer",background:"#fff",color:"#ff6fd8",fontWeight:800,fontSize:17,fontFamily:"inherit",boxShadow:"0 6px 0 #f5d0e8",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
          <span style={{fontSize:22}}>💌</span> パートナーに送る
        </button>
      </div>

      <div style={{marginTop:24,background:"#fff",border:"3px dashed #ffc0e0",borderRadius:16,padding:"8px 20px",fontSize:13,fontWeight:800,color:"#ff6fd8"}}>
        {TODAY.getFullYear()}年{TODAY.getMonth()+1}月{TODAY.getDate()}日（{DAYS[TODAY.getDay()]}）
      </div>
    </div>
  );
}

// ── Register Screen ───────────────────────────────────
function RegisterScreen(props) {
  var getShift = props.getShift; var setShift = props.setShift;
  var showToast = props.showToast; var onBack = props.onBack;
  var defs = props.defs; var setDefs = props.setDefs;
  var ta = useState("calendar");
  var tab = ta[0]; var setTab = ta[1];

  return (
    <div style={{maxWidth:500,margin:"0 auto",paddingBottom:48}}>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"16px 20px",background:"linear-gradient(135deg,#ff6fd8,#ff9f1c)",boxShadow:"0 4px 0 #d04faa",position:"sticky",top:0,zIndex:50}}>
        <button onClick={onBack} style={{background:"rgba(255,255,255,0.3)",border:"none",color:"#fff",width:38,height:38,borderRadius:"50%",cursor:"pointer",fontSize:20,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
        <div style={{fontSize:20,fontWeight:800,color:"#fff"}}>📝 シフト登録</div>
      </div>
      <div style={{display:"flex",margin:"16px 18px 0",background:"#fff",borderRadius:20,padding:4,border:"2px solid #ffd6f0",boxShadow:"0 3px 0 #f5c0e0"}}>
        {[["calendar","📅 カレンダー"],["settings","⚙️ 勤務体系"]].map(function(item) {
          var key = item[0]; var label = item[1];
          return (
            <button key={key} onClick={function(){ setTab(key); }}
              style={{flex:1,padding:"10px 0",borderRadius:16,border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:800,fontSize:13,background:tab===key?"linear-gradient(135deg,#ff6fd8,#ff9f1c)":"transparent",color:tab===key?"#fff":"#aaa",boxShadow:tab===key?"0 3px 0 #d04faa":"none"}}>
              {label}
            </button>
          );
        })}
      </div>
      {tab === "calendar" && <CalendarTab getShift={getShift} setShift={setShift} showToast={showToast} defs={defs} />}
      {tab === "settings" && <SettingsTab defs={defs} setDefs={setDefs} showToast={showToast} />}
    </div>
  );
}

// ── Calendar Tab ─────────────────────────────────────
function CalendarTab(props) {
  var getShift = props.getShift; var setShift = props.setShift;
  var showToast = props.showToast; var defs = props.defs;
  var yy = useState(TODAY.getFullYear()); var year = yy[0]; var setYear = yy[1];
  var mm = useState(TODAY.getMonth());    var month = mm[0]; var setMonth = mm[1];
  var ee = useState(null); var editDay = ee[0]; var setEditDay = ee[1];
  var days = daysInMonth(year, month);
  var firstDow = dayOfWeek(year, month, 1);

  function isToday(d) { return TODAY.getFullYear()===year && TODAY.getMonth()===month && TODAY.getDate()===d; }
  function prev() { if (month===0){setYear(function(y){return y-1;}); setMonth(11);} else setMonth(function(m){return m-1;}); }
  function next() { if (month===11){setYear(function(y){return y+1;}); setMonth(0);} else setMonth(function(m){return m+1;}); }
  function getDef(id) { for(var i=0;i<defs.length;i++){if(defs[i].id===id)return defs[i];} return defs[defs.length-1]; }

  var counts = {};
  for (var i = 0; i < defs.length; i++) counts[defs[i].id] = 0;
  for (var d = 1; d <= days; d++) { var s = getShift(year, month, d); if (counts[s] !== undefined) counts[s]++; }
  var workDays = days - (counts["off"] || 0);

  var cells = [];
  for (var e = 0; e < firstDow; e++) cells.push(null);
  for (var dd = 1; dd <= days; dd++) cells.push(dd);

  return (
    <div style={{padding:"16px 18px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#fff",borderRadius:20,padding:"12px 16px",marginBottom:14,boxShadow:"0 4px 0 #f0d0f8",border:"2px solid #f9d0f0"}}>
        <button onClick={prev} className="pbtn" style={{background:"linear-gradient(135deg,#e040fb,#9c27b0)",color:"#fff",border:"none",width:36,height:36,borderRadius:"50%",cursor:"pointer",fontSize:18,fontWeight:900,boxShadow:"0 3px 0 #7b1fa2",display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
        <div style={{fontWeight:800,fontSize:20,color:"#9c27b0"}}>{year}年 {month+1}月 🗓️</div>
        <button onClick={next} className="pbtn" style={{background:"linear-gradient(135deg,#e040fb,#9c27b0)",color:"#fff",border:"none",width:36,height:36,borderRadius:"50%",cursor:"pointer",fontSize:18,fontWeight:900,boxShadow:"0 3px 0 #7b1fa2",display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        <Chip emoji="💼" label="出勤" value={workDays} unit="日" bg="#d6f8f5" bc="#7de8e0" tc="#2ec4b6" />
        <Chip emoji="💤" label="休み" value={counts["off"]||0} unit="日" bg="#f0f4f8" bc="#cfd8dc" tc="#90a4ae" />
      </div>

      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap",background:"#fff",borderRadius:16,padding:"10px 12px",border:"2px solid #fce4ff"}}>
        {defs.map(function(def) {
          return (
            <div key={def.id} style={{display:"flex",alignItems:"center",gap:4,background:def.bg,padding:"4px 10px",borderRadius:30,border:"2px solid "+def.border,fontSize:11,fontWeight:800}}>
              <span>{def.emoji}</span><span style={{color:def.dot}}>{def.label}</span>
            </div>
          );
        })}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:4}}>
        {DAYS.map(function(w, i) {
          return <div key={w} style={{textAlign:"center",fontSize:12,fontWeight:800,padding:"4px 0",color:i===0?"#ff5252":i===6?"#448aff":"#888"}}>{w}</div>;
        })}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
        {cells.map(function(d, i) {
          if (d === null) return <div key={"e"+i} />;
          var sid = getShift(year, month, d);
          var def = getDef(sid);
          var dow = dayOfWeek(year, month, d);
          var sel = editDay === d;
          return (
            <div key={d} style={{position:"relative"}}>
              <button onClick={function(){ setEditDay(sel ? null : d); }}
                style={{width:"100%",aspectRatio:"1",borderRadius:14,border:"2.5px solid "+(sel?"#ff6fd8":def.border),cursor:"pointer",background:sel?"linear-gradient(135deg,#ff6fd8,#ff9f1c)":def.bg,fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1,outline:"none",boxShadow:isToday(d)?"0 0 0 3px #ff9f1c,0 4px 0 #ddd":sel?"0 4px 0 #d04faa":"0 3px 0 #e0e0e0"}}>
                <span style={{fontSize:13,fontWeight:800,lineHeight:1,color:sel?"#fff":dow===0?"#ff5252":dow===6?"#448aff":def.dot}}>{d}</span>
                <span style={{fontSize:11,lineHeight:1}}>{def.emoji}</span>
              </button>
              {sel && (
                <div style={{position:"absolute",top:"calc(100% + 6px)",left:"50%",transform:"translateX(-50%)",background:"#fff",borderRadius:20,padding:10,zIndex:200,boxShadow:"0 8px 32px rgba(255,111,216,0.3)",border:"3px solid #ffd6f0",minWidth:155,animation:"popIn .2s ease"}}>
                  {defs.map(function(df) {
                    return (
                      <button key={df.id} onClick={function(){ setShift(year,month,d,df.id); setEditDay(null); showToast((month+1)+"/"+d+" → "+df.emoji+" "+df.label); }}
                        style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"7px 10px",background:sid===df.id?df.bg:"transparent",border:"2px solid "+(sid===df.id?df.border:"transparent"),borderRadius:12,cursor:"pointer",fontFamily:"inherit",marginBottom:3}}>
                        <span style={{fontSize:16}}>{df.emoji}</span>
                        <span style={{color:df.dot,fontWeight:800,fontSize:12}}>{df.label}</span>
                        <span style={{color:"#bbb",fontSize:9,marginLeft:"auto"}}>{shiftTime(df)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────
function SettingsTab(props) {
  var defs = props.defs; var setDefs = props.setDefs; var showToast = props.showToast;
  var ei = useState(null); var editId = ei[0]; var setEditId = ei[1];
  var ef = useState(null); var editForm = ef[0]; var setEditForm = ef[1];
  var sa = useState(false); var showAdd = sa[0]; var setShowAdd = sa[1];
  var dc = useState(null); var delConfirm = dc[0]; var setDelConfirm = dc[1];
  var blank = { label:"", start:"09:00", end:"18:00", emoji:"🌸", dot:COLOR_PRESETS[0].dot, bg:COLOR_PRESETS[0].bg, border:COLOR_PRESETS[0].border };
  var af = useState(blank); var addForm = af[0]; var setAddForm = af[1];

  function openEdit(def) { setEditId(def.id); setEditForm({label:def.label,start:def.start,end:def.end,emoji:def.emoji,dot:def.dot,bg:def.bg,border:def.border}); }
  function saveEdit() {
    if (!editForm.label.trim()) { showToast("名前を入力してね！"); return; }
    setDefs(function(p){ return p.map(function(d){ return d.id===editId ? Object.assign({},d,editForm) : d; }); });
    setEditId(null); setEditForm(null); showToast("✏️ 更新したよ！");
  }
  function addNew() {
    if (!addForm.label.trim()) { showToast("名前を入力してね！"); return; }
    var nd = { id:genId(), label:addForm.label, start:addForm.start, end:addForm.end, emoji:addForm.emoji, dot:addForm.dot, bg:addForm.bg, border:addForm.border, deletable:true };
    setDefs(function(p){ var cp = p.slice(); cp.splice(cp.length-1, 0, nd); return cp; });
    setAddForm(blank); setShowAdd(false); showToast("🎉 追加したよ！");
  }
  function deleteDef(id) {
    setDefs(function(p){ return p.filter(function(d){ return d.id!==id; }); });
    setDelConfirm(null); showToast("🗑️ 削除したよ！");
  }

  return (
    <div style={{padding:"16px 18px"}}>
      <div style={{fontSize:13,color:"#aaa",fontWeight:700,marginBottom:14,textAlign:"center"}}>勤務体系を自由にカスタマイズできるよ✨</div>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
        {defs.map(function(def) {
          if (editId === def.id && editForm) {
            return (
              <div key={def.id} style={{background:"#fff",borderRadius:20,padding:"16px",border:"3px solid "+def.border,boxShadow:"0 4px 0 "+def.border}}>
                <div style={{fontSize:12,fontWeight:800,color:def.dot,marginBottom:12}}>✏️ 編集中：{def.label}</div>
                <ShiftForm form={editForm} setForm={setEditForm} />
                <div style={{display:"flex",gap:8,marginTop:12}}>
                  <button onClick={saveEdit} className="pbtn" style={{flex:1,padding:"10px 0",borderRadius:30,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#ff6fd8,#ff9f1c)",color:"#fff",fontWeight:800,fontSize:13,fontFamily:"inherit",boxShadow:"0 4px 0 #d04faa"}}>💾 保存</button>
                  <button onClick={function(){ setEditId(null); setEditForm(null); }} style={{flex:1,padding:"10px 0",borderRadius:30,border:"2px solid #eee",cursor:"pointer",background:"#f8f8f8",color:"#aaa",fontWeight:800,fontSize:13,fontFamily:"inherit"}}>キャンセル</button>
                </div>
              </div>
            );
          }
          return (
            <div key={def.id} style={{display:"flex",alignItems:"center",gap:10,background:"#fff",borderRadius:16,padding:"12px 14px",border:"2.5px solid "+def.border,boxShadow:"0 3px 0 "+def.border}}>
              <div style={{fontSize:28}}>{def.emoji}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:14,color:def.dot}}>{def.label}</div>
                <div style={{fontSize:11,color:"#bbb",fontWeight:700}}>{shiftTime(def)}</div>
              </div>
              <button onClick={function(){ openEdit(def); }} className="pbtn" style={{width:34,height:34,borderRadius:"50%",border:"2px solid #ffe082",background:"#fff8e1",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 3px 0 #ffe082"}}>✏️</button>
              {def.deletable && (
                delConfirm === def.id ? (
                  <div style={{display:"flex",gap:4}}>
                    <button onClick={function(){ deleteDef(def.id); }} style={{padding:"4px 10px",borderRadius:20,border:"none",background:"#ff5252",color:"#fff",fontWeight:800,fontSize:11,cursor:"pointer"}}>削除</button>
                    <button onClick={function(){ setDelConfirm(null); }} style={{padding:"4px 10px",borderRadius:20,border:"2px solid #eee",background:"#f8f8f8",color:"#aaa",fontWeight:800,fontSize:11,cursor:"pointer"}}>戻る</button>
                  </div>
                ) : (
                  <button onClick={function(){ setDelConfirm(def.id); }} className="pbtn" style={{width:34,height:34,borderRadius:"50%",border:"2px solid #ffb3b3",background:"#ffe8e8",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 3px 0 #ffb3b3"}}>🗑️</button>
                )
              )}
            </div>
          );
        })}
      </div>

      {showAdd ? (
        <div style={{background:"#fff",borderRadius:20,padding:"16px",border:"3px dashed #ffc0e0",boxShadow:"0 4px 0 #f5d0e8"}}>
          <div style={{fontSize:13,fontWeight:800,color:"#ff6fd8",marginBottom:12}}>🆕 新しい勤務体系を追加</div>
          <ShiftForm form={addForm} setForm={setAddForm} />
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <button onClick={addNew} className="pbtn" style={{flex:1,padding:"10px 0",borderRadius:30,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#ff6fd8,#ff9f1c)",color:"#fff",fontWeight:800,fontSize:13,fontFamily:"inherit",boxShadow:"0 4px 0 #d04faa"}}>🎉 追加する</button>
            <button onClick={function(){ setShowAdd(false); setAddForm(blank); }} style={{flex:1,padding:"10px 0",borderRadius:30,border:"2px solid #eee",cursor:"pointer",background:"#f8f8f8",color:"#aaa",fontWeight:800,fontSize:13,fontFamily:"inherit"}}>キャンセル</button>
          </div>
        </div>
      ) : (
        <button onClick={function(){ setShowAdd(true); }} className="pbtn" style={{width:"100%",padding:"16px 0",borderRadius:999,border:"3px dashed #ffc0e0",cursor:"pointer",background:"#fff",color:"#ff6fd8",fontWeight:800,fontSize:15,fontFamily:"inherit",boxShadow:"0 4px 0 #f5d0e8",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <span style={{fontSize:22}}>➕</span> 新しい勤務体系を追加
        </button>
      )}
      <div style={{marginTop:16,fontSize:11,color:"#ccc",textAlign:"center",fontWeight:700}}>※ デフォルトの勤務体系は削除できません</div>
    </div>
  );
}

function ShiftForm(props) {
  var form = props.form; var setForm = props.setForm;
  function upd(key, val) { setForm(function(p){ var n=Object.assign({},p); n[key]=val; return n; }); }
  function setColor(c) { setForm(function(p){ return Object.assign({},p,c); }); }
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div>
        <div style={{fontSize:11,fontWeight:800,color:"#aaa",marginBottom:4}}>📛 名前</div>
        <input value={form.label} onChange={function(e){ upd("label",e.target.value); }} placeholder="例：早番" style={{width:"100%",padding:"9px 14px",borderRadius:12,border:"2px solid #f0d0f8",fontSize:14,fontWeight:800,outline:"none",background:"#fdf8ff"}} />
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <div style={{flex:1}}>
          <div style={{fontSize:11,fontWeight:800,color:"#aaa",marginBottom:4}}>🕐 開始</div>
          <input type="time" value={form.start} onChange={function(e){ upd("start",e.target.value); }} style={{width:"100%",padding:"9px 14px",borderRadius:12,border:"2px solid #f0d0f8",fontSize:14,fontWeight:800,outline:"none",background:"#fdf8ff"}} />
        </div>
        <div style={{fontSize:18,marginTop:16,color:"#ddd",fontWeight:800}}>〜</div>
        <div style={{flex:1}}>
          <div style={{fontSize:11,fontWeight:800,color:"#aaa",marginBottom:4}}>🕐 終了</div>
          <input type="time" value={form.end} onChange={function(e){ upd("end",e.target.value); }} style={{width:"100%",padding:"9px 14px",borderRadius:12,border:"2px solid #f0d0f8",fontSize:14,fontWeight:800,outline:"none",background:"#fdf8ff"}} />
        </div>
      </div>
      <div>
        <div style={{fontSize:11,fontWeight:800,color:"#aaa",marginBottom:6}}>🎨 絵文字</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {EMOJIS.map(function(em) {
            return <button key={em} onClick={function(){ upd("emoji",em); }} style={{width:36,height:36,borderRadius:10,border:"2px solid "+(form.emoji===em?"#ff6fd8":"#eee"),background:form.emoji===em?"#fff0fa":"#fafafa",cursor:"pointer",fontSize:18}}>{em}</button>;
          })}
        </div>
      </div>
      <div>
        <div style={{fontSize:11,fontWeight:800,color:"#aaa",marginBottom:6}}>🎀 カラー</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {COLOR_PRESETS.map(function(c, i) {
            return <button key={i} onClick={function(){ setColor(c); }} style={{width:32,height:32,borderRadius:"50%",background:c.dot,border:"3px solid "+(form.dot===c.dot?"#333":"transparent"),cursor:"pointer",boxShadow:"0 2px 4px rgba(0,0,0,0.15)"}} />;
          })}
        </div>
      </div>
      <div style={{background:"#fafafa",borderRadius:12,padding:"10px 14px",border:"2px solid #f0f0f0",display:"flex",alignItems:"center",gap:10}}>
        <div style={{fontSize:11,fontWeight:800,color:"#bbb"}}>プレビュー</div>
        <div style={{display:"inline-flex",alignItems:"center",gap:6,background:form.bg||"#f0f4f8",borderRadius:30,padding:"5px 14px",border:"2px solid "+(form.border||"#cfd8dc")}}>
          <span style={{fontSize:18}}>{form.emoji}</span>
          <span style={{fontSize:13,fontWeight:800,color:form.dot||"#90a4ae"}}>{form.label||"名前未入力"}</span>
        </div>
        <div style={{fontSize:11,color:"#ccc",marginLeft:"auto"}}>{form.start}〜{form.end}</div>
      </div>
    </div>
  );
}

// ── Confirm Screen ────────────────────────────────────
function ConfirmScreen(props) {
  var shifts = props.shifts; var skey = props.skey;
  var onBack = props.onBack; var commute = props.commute; var getDef = props.getDef;

  var ww = useState(null); var weather = ww[0]; var setWeather = ww[1];
  var ll = useState(true); var loading = ll[0]; var setLoading = ll[1];

  var next7 = useMemo(function() {
    var arr = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date(TODAY); d.setDate(TODAY.getDate() + i);
      arr.push({ date:d, day:d.getDate(), month:d.getMonth(), year:d.getFullYear() });
    }
    return arr;
  }, []);

  useEffect(function() {
    fetch("https://api.open-meteo.com/v1/forecast?latitude=35.2236&longitude=137.0843&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Asia%2FTokyo&forecast_days=7")
      .then(function(r){ return r.json(); })
      .then(function(data){ setWeather(data.daily); setLoading(false); })
      .catch(function(){ setLoading(false); });
  }, []);

  function makeW(idx) {
    if (!weather) return null;
    var w = wmo(weather.weathercode[idx]);
    return { icon:w.icon, label:w.label, max:Math.round(weather.temperature_2m_max[idx]), min:Math.round(weather.temperature_2m_min[idx]), rain:Math.round(weather.precipitation_sum[idx]*10)/10 };
  }

  var td = next7[0];
  var tdDef = getDef(shifts[skey(td.year,td.month,td.day)] || "off");
  var tdDow = td.date.getDay();
  var tdW   = makeW(0);
  var rest  = next7.slice(1);
  var co    = null;
  for (var i = 0; i < COMMUTES.length; i++) { if (COMMUTES[i].key === commute) { co = COMMUTES[i]; break; } }

  return (
    <div style={{maxWidth:500,margin:"0 auto",paddingBottom:48}}>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"16px 20px",background:"linear-gradient(135deg,#2ec4b6,#5c6bc0)",boxShadow:"0 4px 0 #1a9a8e",position:"sticky",top:0,zIndex:50}}>
        <button onClick={onBack} style={{background:"rgba(255,255,255,0.3)",border:"none",color:"#fff",width:38,height:38,borderRadius:"50%",cursor:"pointer",fontSize:20,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
        <div style={{fontSize:20,fontWeight:800,color:"#fff"}}>📋 シフト確認</div>
      </div>
      <div style={{padding:"20px 18px",display:"flex",flexDirection:"column",gap:24}}>

        <section>
          <Badge text="今日のめちこ" emoji="🌟" bg="linear-gradient(135deg,#ff6fd8,#ff9f1c)" shadow="#d04faa" />
          <div style={{background:"#fff",borderRadius:24,overflow:"hidden",border:"3px solid #ffd6f0",boxShadow:"0 8px 0 #f5b8e0"}}>
            <div style={{background:"linear-gradient(135deg,#fff0fa,#fff8f0)",padding:"22px 24px 18px",borderBottom:"3px dashed #ffd6f0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{display:"inline-block",background:tdDow===0?"#ffe0e0":tdDow===6?"#e0e8ff":"#f0e0ff",color:tdDow===0?"#ff5252":tdDow===6?"#448aff":"#9c27b0",borderRadius:30,padding:"3px 12px",fontSize:12,fontWeight:800,marginBottom:8,border:"2px solid "+(tdDow===0?"#ffc0c0":tdDow===6?"#b0c8ff":"#e0b0ff")}}>{DAYS[tdDow]}曜日</div>
                <div style={{fontSize:48,fontWeight:800,lineHeight:1,color:"#ff6fd8"}}>{td.month+1}<span style={{fontSize:24}}>月</span>{td.day}<span style={{fontSize:24}}>日</span></div>
              </div>
              {loading ? <div style={{fontSize:40,display:"inline-block",animation:"spin 1.5s linear infinite"}}>⏳</div>
                : tdW ? <div style={{textAlign:"center"}}><div style={{fontSize:52,lineHeight:1}}>{tdW.icon}</div><div style={{fontSize:12,color:"#aaa",fontWeight:700,marginTop:4}}>{tdW.label}</div></div>
                : null}
            </div>
            <div style={{padding:"18px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:14}}>
              <div>
                <div style={{fontSize:11,color:"#bbb",fontWeight:700,marginBottom:8}}>今日のシフト ✨</div>
                <div style={{display:"inline-flex",alignItems:"center",gap:10,background:tdDef.bg,borderRadius:20,padding:"10px 20px",border:"3px solid "+tdDef.border,boxShadow:"0 4px 0 "+tdDef.border}}>
                  <span style={{fontSize:24}}>{tdDef.emoji}</span>
                  <span style={{fontSize:22,fontWeight:800,color:tdDef.dot}}>{tdDef.label}</span>
                </div>
                <div style={{fontSize:12,color:"#aaa",fontWeight:700,marginTop:8}}>{shiftTime(tdDef)}</div>
              </div>
              {co ? (
                <div style={{display:"inline-flex",alignItems:"center",gap:10,background:co.bg,borderRadius:20,padding:"10px 20px",border:"3px solid "+co.border,boxShadow:"0 4px 0 "+co.border}}>
                  <span style={{fontSize:24}}>{co.emoji}</span>
                  <div><div style={{fontSize:10,color:"#bbb",fontWeight:700,marginBottom:2}}>今日の出勤方法</div><div style={{fontSize:18,fontWeight:800,color:co.color}}>{co.label}</div></div>
                </div>
              ) : (
                <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"#f8f8f8",borderRadius:20,padding:"10px 16px",border:"3px dashed #e0e0e0"}}>
                  <span style={{fontSize:20}}>🚀</span><div style={{fontSize:12,color:"#ccc",fontWeight:700}}>出勤方法<br />未選択</div>
                </div>
              )}
              {tdW && (
                <div style={{background:"#f8faff",borderRadius:18,padding:"12px 16px",border:"3px solid #dde8ff",boxShadow:"0 4px 0 #c8d8ff",display:"flex",gap:14}}>
                  <div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#aaa",fontWeight:700,marginBottom:4}}>🌡 最高</div><div style={{fontSize:26,fontWeight:800,color:"#ff5252"}}>{tdW.max}°</div></div>
                  <div style={{width:2,background:"#eee",borderRadius:4}} />
                  <div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#aaa",fontWeight:700,marginBottom:4}}>❄️ 最低</div><div style={{fontSize:26,fontWeight:800,color:"#448aff"}}>{tdW.min}°</div></div>
                  {tdW.rain > 0 && (
                    <><div style={{width:2,background:"#eee",borderRadius:4}} /><div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#aaa",fontWeight:700,marginBottom:4}}>💧 雨</div><div style={{fontSize:20,fontWeight:800,color:"#2ec4b6"}}>{tdW.rain}<span style={{fontSize:11}}>mm</span></div></div></>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <section>
          <Badge text="今週のめちこ" emoji="📅" bg="linear-gradient(135deg,#5c6bc0,#2ec4b6)" shadow="#1a5276" />
          <div style={{background:"#fff",borderRadius:20,overflow:"hidden",border:"3px solid #dde8ff",boxShadow:"0 6px 0 #c8d8ff"}}>
            {rest.map(function(item, idx) {
              var def = getDef(shifts[skey(item.year,item.month,item.day)] || "off");
              var dow = item.date.getDay();
              var w   = makeW(idx + 1);
              return (
                <div key={idx} style={{display:"flex",alignItems:"center",borderBottom:idx<rest.length-1?"2px dashed #f0e8ff":"none",background:idx%2===0?"#fafcff":"#fff"}}>
                  <div style={{width:62,padding:"14px 0",textAlign:"center",flexShrink:0,borderRight:"2px dashed #f0e8ff"}}>
                    <div style={{fontSize:11,fontWeight:800,marginBottom:2,color:dow===0?"#ff5252":dow===6?"#448aff":"#9c27b0"}}>{DAYS[dow]}</div>
                    <div style={{fontSize:20,fontWeight:800,lineHeight:1,color:dow===0?"#ff5252":dow===6?"#448aff":"#3a3a3a"}}>{item.day}</div>
                    <div style={{fontSize:9,color:"#ccc",fontWeight:700,marginTop:2}}>{item.month+1}/{item.day}</div>
                  </div>
                  <div style={{width:100,padding:"10px 12px",flexShrink:0,borderRight:"2px dashed #f0e8ff"}}>
                    <div style={{display:"inline-flex",alignItems:"center",gap:5,background:def.bg,borderRadius:30,padding:"4px 10px",border:"2px solid "+def.border}}>
                      <span style={{fontSize:13}}>{def.emoji}</span>
                      <span style={{fontSize:11,fontWeight:800,color:def.dot}}>{def.label}</span>
                    </div>
                    <div style={{fontSize:9,color:"#bbb",fontWeight:700,marginTop:4}}>{shiftTime(def)}</div>
                  </div>
                  <div style={{flex:1,padding:"10px 14px"}}>
                    {loading && <span style={{fontSize:18,display:"inline-block",animation:"spin 1.5s linear infinite"}}>⏳</span>}
                    {!loading && w && (
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:22}}>{w.icon}</span>
                        <div>
                          <div style={{fontSize:10,color:"#bbb",fontWeight:700,marginBottom:2}}>{w.label}</div>
                          <div style={{display:"flex",alignItems:"baseline",gap:5}}>
                            <span style={{fontSize:14,fontWeight:800,color:"#ff5252"}}>{w.max}°</span>
                            <span style={{fontSize:12,fontWeight:700,color:"#448aff"}}>{w.min}°</span>
                            {w.rain > 0 && <span style={{fontSize:10,color:"#2ec4b6",fontWeight:700}}>💧{w.rain}mm</span>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <div style={{textAlign:"center",fontSize:10,color:"#ccc",fontWeight:700}}>🌐 天気データ: Open-Meteo / 瀬戸市</div>
      </div>
    </div>
  );
}

// ── Share Screen ──────────────────────────────────────
function ShareScreen(props) {
  var shifts = props.shifts; var skey = props.skey;
  var onBack = props.onBack; var defs = props.defs;
  var getDef = props.getDef; var showToast = props.showToast;

  var yy = useState(TODAY.getFullYear()); var year = yy[0]; var setYear = yy[1];
  var mm = useState(TODAY.getMonth());    var month = mm[0]; var setMonth = mm[1];
  var days = daysInMonth(year, month);
  var firstDow = dayOfWeek(year, month, 1);

  function prev() { if(month===0){setYear(function(y){return y-1;});setMonth(11);}else setMonth(function(m){return m-1;}); }
  function next() { if(month===11){setYear(function(y){return y+1;});setMonth(0);}else setMonth(function(m){return m+1;}); }

  var counts = {};
  for (var i = 0; i < defs.length; i++) counts[defs[i].id] = 0;
  for (var d2 = 1; d2 <= days; d2++) { var sid = shifts[skey(year,month,d2)]||"off"; if(counts[sid]!==undefined)counts[sid]++; }
  var workDays = days - (counts["off"] || 0);

  var cells = [];
  for (var e2 = 0; e2 < firstDow; e2++) cells.push(null);
  for (var d3 = 1; d3 <= days; d3++) cells.push(d3);

  function copyText() {
    var text = year+"年"+(month+1)+"月 めちこのシフト\n";
    text += "出勤 "+workDays+"日 / 休み "+(counts["off"]||0)+"日\n\n";
    for (var d4 = 1; d4 <= days; d4++) {
      var dow = dayOfWeek(year, month, d4);
      var def = getDef(shifts[skey(year,month,d4)]||"off");
      if (def.id !== "off") text += (month+1)+"/"+d4+"（"+DAYS[dow]+"）"+def.emoji+" "+def.label+" "+shiftTime(def)+"\n";
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function(){ showToast("📋 コピーしたよ！"); }).catch(function(){ showToast("コピーできませんでした"); });
    }
  }

  return (
    <div style={{maxWidth:500,margin:"0 auto",paddingBottom:48}}>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"16px 20px",background:"linear-gradient(135deg,#ff6fd8,#f06292)",boxShadow:"0 4px 0 #c2185b",position:"sticky",top:0,zIndex:50}}>
        <button onClick={onBack} style={{background:"rgba(255,255,255,0.3)",border:"none",color:"#fff",width:38,height:38,borderRadius:"50%",cursor:"pointer",fontSize:20,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
        <div style={{fontSize:20,fontWeight:800,color:"#fff"}}>💌 パートナーに送る</div>
      </div>
      <div style={{padding:"16px 18px"}}>
        <div style={{background:"#fff",borderRadius:20,padding:"14px 18px",marginBottom:16,border:"3px dashed #ffc0e0",boxShadow:"0 4px 0 #f5d0e8",fontSize:13,color:"#888",fontWeight:700,lineHeight:1.7}}>
          💡 下のカレンダーをスクリーンショットしてLINEで送ってね📱<br />またはテキストコピーでメッセージとして送ることもできるよ✨
        </div>

        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <button onClick={prev} className="pbtn" style={{background:"linear-gradient(135deg,#ff6fd8,#f06292)",color:"#fff",border:"none",width:38,height:38,borderRadius:"50%",cursor:"pointer",fontSize:18,fontWeight:900,boxShadow:"0 3px 0 #c2185b",display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
          <div style={{fontWeight:800,fontSize:20,color:"#ff6fd8"}}>{year}年 {month+1}月</div>
          <button onClick={next} className="pbtn" style={{background:"linear-gradient(135deg,#ff6fd8,#f06292)",color:"#fff",border:"none",width:38,height:38,borderRadius:"50%",cursor:"pointer",fontSize:18,fontWeight:900,boxShadow:"0 3px 0 #c2185b",display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
        </div>

        <div style={{background:"#fff",borderRadius:24,overflow:"hidden",border:"3px solid #ffd6f0",boxShadow:"0 8px 0 #f5b8e0",marginBottom:16}}>
          <div style={{background:"linear-gradient(135deg,#ff6fd8,#ff9f1c)",padding:"16px 20px",textAlign:"center"}}>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.8)",fontWeight:700,letterSpacing:2,marginBottom:4}}>SHIFT CALENDAR</div>
            <div style={{fontSize:20,fontWeight:800,color:"#fff"}}>{year}年 {month+1}月 めちこのシフト 🌈</div>
            <div style={{marginTop:8,display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
              <span style={{background:"rgba(255,255,255,0.25)",borderRadius:20,padding:"3px 12px",fontSize:12,fontWeight:800,color:"#fff"}}>💼 出勤 {workDays}日</span>
              <span style={{background:"rgba(255,255,255,0.25)",borderRadius:20,padding:"3px 12px",fontSize:12,fontWeight:800,color:"#fff"}}>💤 休み {counts["off"]||0}日</span>
            </div>
          </div>
          <div style={{padding:"10px 14px",borderBottom:"2px dashed #ffd6f0",display:"flex",gap:6,flexWrap:"wrap",background:"#fff9fd"}}>
            {defs.map(function(def) {
              return (
                <div key={def.id} style={{display:"flex",alignItems:"center",gap:3,background:def.bg,padding:"3px 8px",borderRadius:20,border:"1.5px solid "+def.border,fontSize:10,fontWeight:800}}>
                  <span style={{fontSize:11}}>{def.emoji}</span><span style={{color:def.dot}}>{def.label}</span>
                </div>
              );
            })}
          </div>
          <div style={{padding:"12px 10px"}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:3}}>
              {DAYS.map(function(w, i) {
                return <div key={w} style={{textAlign:"center",fontSize:11,fontWeight:800,padding:"3px 0",color:i===0?"#ff5252":i===6?"#448aff":"#999"}}>{w}</div>;
              })}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
              {cells.map(function(d, i) {
                if (d === null) return <div key={"e"+i} />;
                var sid2 = shifts[skey(year,month,d)]||"off";
                var def2 = getDef(sid2);
                var dow2 = dayOfWeek(year,month,d);
                var isTd = TODAY.getFullYear()===year&&TODAY.getMonth()===month&&TODAY.getDate()===d;
                return (
                  <div key={d} style={{borderRadius:10,background:def2.bg,border:"2px solid "+(isTd?"#ff9f1c":def2.border),padding:"5px 2px",textAlign:"center",boxShadow:isTd?"0 0 0 2px #ff9f1c":"0 2px 0 #e8e8e8",minHeight:52,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1}}>
                    <div style={{fontSize:12,fontWeight:800,color:dow2===0?"#ff5252":dow2===6?"#448aff":def2.dot,lineHeight:1}}>{d}</div>
                    <div style={{fontSize:13,lineHeight:1}}>{def2.emoji}</div>
                    <div style={{fontSize:7,fontWeight:800,color:def2.dot,lineHeight:1}}>{def2.id==="off"?"休":def2.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{padding:"10px 16px",borderTop:"2px dashed #ffd6f0",background:"#fff9fd",textAlign:"center",fontSize:10,color:"#ccc",fontWeight:700}}>
            めちこのシフト ✨ 愛知県瀬戸市
          </div>
        </div>

        <button onClick={copyText} className="pbtn" style={{width:"100%",padding:"16px 0",borderRadius:999,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#ff6fd8,#ff9f1c)",color:"#fff",fontWeight:800,fontSize:15,fontFamily:"inherit",boxShadow:"0 5px 0 #d04faa",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <span style={{fontSize:20}}>📋</span> テキストコピー
        </button>
        <div style={{marginTop:10,fontSize:11,color:"#ccc",textAlign:"center",fontWeight:700}}>📸 カレンダーをスクリーンショットしてLINEで送ってね</div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────
function Badge(props) {
  return (
    <div style={{display:"inline-flex",alignItems:"center",gap:8,background:props.bg,color:"#fff",borderRadius:999,padding:"7px 18px",marginBottom:12,fontWeight:800,fontSize:14,letterSpacing:1,boxShadow:"0 4px 0 "+props.shadow}}>
      <span style={{fontSize:18}}>{props.emoji}</span>{props.text}
    </div>
  );
}

function Chip(props) {
  return (
    <div style={{background:props.bg,border:"2.5px solid "+props.bc,borderRadius:30,padding:"5px 12px",display:"flex",alignItems:"center",gap:5,boxShadow:"0 3px 0 "+props.bc}}>
      <span style={{fontSize:14}}>{props.emoji}</span>
      <span style={{fontSize:10,color:props.tc,fontWeight:700}}>{props.label}</span>
      <span style={{fontSize:17,fontWeight:800,color:props.tc}}>{props.value}</span>
      <span style={{fontSize:10,color:props.tc,fontWeight:700}}>{props.unit}</span>
    </div>
  );
}
