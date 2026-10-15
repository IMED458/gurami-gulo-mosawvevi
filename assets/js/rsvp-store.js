/* Guest side of the RSVP: one write per answer into Firestore.
   The SDK is only downloaded once the guest starts on the form (warm()),
   so the invitation itself stays light.

   Until firebase-config.js is filled in, answers are kept in this
   browser's localStorage so the page can be tried end to end locally. */
import { firebaseConfig, RSVP_COLLECTION } from "../../firebase-config.js";

const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
const configured = !!(firebaseConfig && firebaseConfig.apiKey && !/^YOUR_/.test(firebaseConfig.apiKey));

let ready = null;
function warm() {
  if (!configured) return Promise.resolve(null);
  if (!ready) {
    ready = Promise.all([
      import(SDK + "firebase-app.js"),
      import(SDK + "firebase-firestore.js"),
    ]).then(([app, fs]) => ({ fs, db: fs.getFirestore(app.initializeApp(firebaseConfig)) }))
      .catch((err) => { ready = null; throw err; });   // let the next attempt retry
  }
  return ready;
}

async function save(entry) {
  const doc = {
    name: String(entry.name).slice(0, 120),
    attendance: entry.attendance === "yes" ? "yes" : "no",
    guests: entry.attendance === "yes" ? Math.max(1, Math.min(20, Math.round(entry.guests))) : 0,
    message: String(entry.message || "").slice(0, 1000),
  };

  if (!configured) {
    console.warn("[rsvp] firebase-config.js is not filled in — answer kept in localStorage only.");
    const list = JSON.parse(localStorage.getItem("gg_rsvp_local") || "[]");
    list.push({ ...doc, createdAt: new Date().toISOString() });
    localStorage.setItem("gg_rsvp_local", JSON.stringify(list));
    return { local: true };
  }

  const { fs, db } = await warm();
  const ref = await fs.addDoc(fs.collection(db, RSVP_COLLECTION), {
    ...doc,
    createdAt: fs.serverTimestamp(),
  });
  return { id: ref.id };
}

window.rsvpStore = { configured, warm, save };
