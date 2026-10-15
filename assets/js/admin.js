/* Organiser dashboard: sign in with a Firebase e-mail/password account and
   watch the RSVPs arrive live. Who may read them is decided by
   firestore.rules (isAdmin), not by this page. */
import { firebaseConfig, RSVP_COLLECTION } from "../../firebase-config.js";

const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
const configured = !!(firebaseConfig && firebaseConfig.apiKey && !/^YOUR_/.test(firebaseConfig.apiKey));

const $ = (id) => document.getElementById(id);
const els = {
  loginView: $("loginView"), dashView: $("dashView"), who: $("who"), whoEmail: $("whoEmail"),
  loginForm: $("loginForm"), loginBtn: $("loginBtn"), loginError: $("loginError"),
  rows: $("rows"), empty: $("empty"), search: $("search"), dataError: $("dataError"),
  sResponses: $("sResponses"), sYes: $("sYes"), sGuests: $("sGuests"), sNo: $("sNo"),
};

let all = [];          // [{id, name, attendance, guests, message, createdAt: Date|null}]
let filter = "all";
let removeDoc = null;  // set once Firestore is up

/* The organisers log in with a plain username/password (admin / admin).
   Firebase Auth only knows e-mail accounts with passwords of 6+ characters,
   so both are mapped onto the account created in the console:
     admin / admin  ->  admin@guramigulo.app / admin#gg2026
   firestore.rules grants read access to that e-mail only. */
const LOGIN_DOMAIN = "guramigulo.app";
const PASSWORD_SUFFIX = "#gg2026";
const toEmail = (u) => (u.includes("@") ? u : `${u}@${LOGIN_DOMAIN}`).toLowerCase();
const toPassword = (p) => p + PASSWORD_SUFFIX;

/* ---------- rendering ---------- */

const fmt = new Intl.DateTimeFormat("ka-GE", {
  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tbilisi",
});

function td(cls, text) {
  const c = document.createElement("td");
  c.className = cls;
  if (text != null) c.textContent = text;
  return c;
}

function visible() {
  const q = els.search.value.trim().toLowerCase();
  return all.filter((r) =>
    (filter === "all" || r.attendance === filter) &&
    (!q || r.name.toLowerCase().includes(q) || (r.message || "").toLowerCase().includes(q)));
}

function render() {
  const yes = all.filter((r) => r.attendance === "yes");
  els.sResponses.textContent = all.length;
  els.sYes.textContent = yes.length;
  els.sGuests.textContent = yes.reduce((n, r) => n + (r.guests || 0), 0);
  els.sNo.textContent = all.length - yes.length;

  const list = visible();
  els.rows.replaceChildren(...list.map((r) => {
    const tr = document.createElement("tr");
    tr.append(td("name", r.name));

    const st = td("status");
    const pill = document.createElement("span");
    pill.className = "pill " + r.attendance;
    pill.textContent = r.attendance === "yes" ? "✓ მოდის" : "✕ ვერ მოდის";
    st.append(pill);
    tr.append(st);

    tr.append(td("num", r.attendance === "yes" ? String(r.guests) : "—"));
    tr.append(td("msg", r.message || ""));
    tr.append(td("when", r.createdAt ? fmt.format(r.createdAt) : "…"));

    const act = td("act");
    if (removeDoc) {
      const b = document.createElement("button");
      b.className = "del"; b.type = "button"; b.title = "წაშლა";
      b.setAttribute("aria-label", "წაშლა: " + r.name);
      b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 7h15M10 11v6M14 11v6M6 7l1 12.5h10L18 7M9.5 7V4.5h5V7"/></svg>';
      b.addEventListener("click", () => {
        if (!confirm(`წაიშალოს „${r.name}“-ის პასუხი?`)) return;
        removeDoc(r.id).catch((e) => showDataError(e));
      });
      act.append(b);
    }
    tr.append(act);
    return tr;
  }));
  els.empty.hidden = list.length > 0;
  els.empty.textContent = all.length ? "ფილტრს არაფერი შეესაბამება." : "ჯერ პასუხები არ არის.";
}

function showDataError(e) {
  console.error(e);
  els.dataError.textContent = e && e.code === "permission-denied"
    ? "ამ მომხმარებელს სიის ნახვის უფლება არ აქვს (იხ. firestore.rules → isAdmin)."
    : "მონაცემების წაკითხვა ვერ მოხერხდა: " + ((e && e.message) || e);
}

/* ---------- toolbar ---------- */

document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("on", x === t));
  filter = t.dataset.filter;
  render();
}));
els.search.addEventListener("input", render);

$("exportCsv").addEventListener("click", () => {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [["სახელი", "დასწრება", "სტუმარი", "შეტყობინება", "დრო"].map(esc).join(",")];
  for (const r of visible()) {
    lines.push([
      r.name, r.attendance === "yes" ? "მოდის" : "ვერ მოდის",
      r.attendance === "yes" ? r.guests : 0, r.message,
      r.createdAt ? fmt.format(r.createdAt) : "",
    ].map(esc).join(","));
  }
  // BOM so Excel opens the Georgian text as UTF-8.
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "guram-gulo-rsvp.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

/* ---------- data sources ---------- */

function showLocalOnly() {
  $("notConfigured").hidden = false;
  els.dashView.hidden = false;
  try {
    all = JSON.parse(localStorage.getItem("gg_rsvp_local") || "[]").map((r, i) => ({
      id: String(i), ...r, createdAt: r.createdAt ? new Date(r.createdAt) : null,
    })).reverse();
  } catch { all = []; }
  render();
}

async function startFirebase() {
  const [appMod, authMod, fs] = await Promise.all([
    import(SDK + "firebase-app.js"),
    import(SDK + "firebase-auth.js"),
    import(SDK + "firebase-firestore.js"),
  ]);
  const app = appMod.initializeApp(firebaseConfig);
  const auth = authMod.getAuth(app);
  const db = fs.getFirestore(app);
  let unsubscribe = null;

  removeDoc = (id) => fs.deleteDoc(fs.doc(db, RSVP_COLLECTION, id));

  els.loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    els.loginError.textContent = "";
    els.loginBtn.disabled = true;
    try {
      await authMod.signInWithEmailAndPassword(auth, toEmail($("username").value.trim()), toPassword($("password").value));
    } catch (err) {
      els.loginError.textContent =
        ["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found", "auth/invalid-email"].includes(err.code)
          ? "მომხმარებელი ან პაროლი არასწორია."
          : err.code === "auth/too-many-requests"
            ? "ძალიან ბევრი მცდელობა — სცადეთ ცოტა ხანში."
            : "შესვლა ვერ მოხერხდა: " + err.message;
    } finally {
      els.loginBtn.disabled = false;
    }
  });

  $("signOut").addEventListener("click", () => authMod.signOut(auth));

  authMod.onAuthStateChanged(auth, (user) => {
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    els.dataError.textContent = "";
    els.loginView.hidden = !!user;
    els.dashView.hidden = !user;
    els.who.hidden = !user;
    if (!user) { all = []; render(); return; }

    els.whoEmail.textContent = (user.email || "").split("@")[0];
    const q = fs.query(fs.collection(db, RSVP_COLLECTION), fs.orderBy("createdAt", "desc"));
    unsubscribe = fs.onSnapshot(q, (snap) => {
      all = snap.docs.map((d) => {
        const v = d.data({ serverTimestamps: "estimate" });
        return {
          id: d.id,
          name: v.name || "",
          attendance: v.attendance === "yes" ? "yes" : "no",
          guests: Number(v.guests) || 0,
          message: v.message || "",
          createdAt: v.createdAt && v.createdAt.toDate ? v.createdAt.toDate() : null,
        };
      });
      render();
    }, showDataError);
  });
}

if (configured) {
  startFirebase().catch((e) => {
    els.loginView.hidden = false;
    els.loginError.textContent = "Firebase ვერ ჩაიტვირთა — შეამოწმეთ ინტერნეტი.";
    console.error(e);
  });
} else {
  showLocalOnly();
}
