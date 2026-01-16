<script>
// ===== FIREBASE INITIALISIERUNG =====
const firebaseConfig = {
  apiKey: "DEIN_API_KEY",
  authDomain: "DEIN_PROJECT.firebaseapp.com",
  projectId: "DEIN_PROJECT_ID",
  storageBucket: "DEIN_PROJECT.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ===== PERSON HINZUFÜGEN =====
async function addPerson() {
  const firstName = document.getElementById('firstName').value;
  const lastName = document.getElementById('lastName').value;
  const birthDate = document.getElementById('birthDate').value;

  if(!firstName || !lastName || !birthDate) { alert('Bitte Pflichtfelder ausfüllen'); return; }

  try {
    const docRef = await db.collection('persons').add({
      firstName, lastName, birthDate, createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert('Person erfolgreich hinzugefügt. ID: ' + docRef.id);
  } catch(err) {
    console.error('Fehler beim Speichern:', err);
    alert('Fehler beim Speichern, prüfe Firebase Rules');
  }
}

// ===== MITARBEITER HINZUFÜGEN =====
async function addEmployee() {
  const username = document.getElementById('empUsername').value;
  const rank = document.getElementById('empRank').value;

  if(!username || !rank) { alert('Bitte Benutzername und Rang ausfüllen'); return; }

  try {
    const docRef = await db.collection('users').add({
      username, rank, createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert('Mitarbeiter erfolgreich hinzugefügt. ID: ' + docRef.id);

    // Automatische Personenakte für neuen Mitarbeiter
    const names = username.split('.');
    const firstName = names[0] || username;
    const lastName = names[1] || 'DOE';

    await db.collection('persons').add({
      firstName, lastName, autoCreated: true, createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert('Automatische Personenakte erstellt');

  } catch(err) {
    console.error('Fehler beim Hinzufügen des Mitarbeiters:', err);
    alert('Fehler beim Hinzufügen, prüfe Firebase Rules');
  }
}

// ===== Personenliste für Haftbefehle laden =====
async function loadPersons() {
  const personsSnapshot = await getDocs(collection(db, "persons"));
  const judgePersonSelect = document.getElementById('judgePerson');
  judgePersonSelect.innerHTML = "";
  personsSnapshot.forEach(docSnap => {
    const p = docSnap.data();
    const option = document.createElement('option');
    option.value = docSnap.id;
    option.textContent = `${p.firstName} ${p.lastName}`;
    judgePersonSelect.appendChild(option);
  });
}
loadPersons();

// ===== Ermittlungsfälle für Dropdown laden =====
async function loadCases() {
  const casesSnapshot = await getDocs(collection(db, "investigations"));
  const caseSelect = document.getElementById('caseId');
  caseSelect.innerHTML = "";
  casesSnapshot.forEach(docSnap => {
    const c = docSnap.data();
    const option = document.createElement('option');
    option.value = docSnap.id;
    option.textContent = `${docSnap.id} | ${c.title || "Keine Beschreibung"}`;
    caseSelect.appendChild(option);
  });
}
loadCases();

// ===== Haftbefehl ausstellen Button =====
document.getElementById('issueWarrantBtn').addEventListener('click', async () => {
  const personId = document.getElementById('judgePerson').value;
  const reason = document.getElementById('judgeReason').value;
  const judge = "Richter"; // optional: dynamisch aus Userinfo

  if (!personId || !reason) return alert("Bitte Person und Begründung auswählen!");

  try {
    await addDoc(collection(db, "warrants"), {
      personId,
      reason,
      issuedBy: judge,
      issuedAt: Timestamp.now(),
      status: "active"
    });
    writeAuditLog("warrant", personId, "create", judge);
    alert(`Haftbefehl für ${personId} ausgestellt!`);
  } catch(err) {
    console.error("Fehler Haftbefehl:", err);
  }
});
// ===== Ermittlungen sperren/freigeben Button =====
document.getElementById('toggleCaseBtn').addEventListener('click', async () => {
  const caseId = document.getElementById('caseId').value;
  const action = document.getElementById('caseAction').value;
  if (!caseId) return alert("Ermittlungs-ID fehlt!");

  const caseRef = doc(db, "investigations", caseId);
  try {
    await updateDoc(caseRef, { locked: action === 'lock' });
    writeAuditLog("investigation", caseId, action, "Richter");
    alert(`Ermittlung ${caseId} ${action === 'lock' ? "gesperrt" : "freigegeben"}!`);
  } catch(err) {
    console.error("Fehler beim Sperren/Freigeben:", err);
  }
});
// ===== Personen für Wanted laden =====
async function loadWantedPersons() {
  const snapshot = await getDocs(collection(db, "persons"));
  const wantedSelect = document.getElementById('wantedPerson');
  wantedSelect.innerHTML = "";
  snapshot.forEach(docSnap => {
    const p = docSnap.data();
    const option = document.createElement('option');
    option.value = docSnap.id;
    option.textContent = `${p.firstName} ${p.lastName}`;
    wantedSelect.appendChild(option);
  });
}
loadWantedPersons();

// ===== Fahrzeuge für Auto-Alerts laden =====
async function loadVehicles() {
  const snapshot = await getDocs(collection(db, "vehicles"));
  const vehicleSelect = document.getElementById('vehicleSelect');
  vehicleSelect.innerHTML = "";
  snapshot.forEach(docSnap => {
    const v = docSnap.data();
    const option = document.createElement('option');
    option.value = docSnap.id;
    option.textContent = `${v.brand} ${v.model} (${v.plate})`;
    vehicleSelect.appendChild(option);
  });
}
loadVehicles();

// ===== Wanted-Alert Button =====
document.getElementById('flagWantedBtn').addEventListener('click', async () => {
  const personId = document.getElementById('wantedPerson').value;
  const reason = document.getElementById('wantedReason').value;
  if (!personId || !reason) return alert("Bitte Person und Grund auswählen!");

  try {
    await addDoc(collection(db, "wanted"), {
      personId,
      reason,
      flaggedAt: Timestamp.now()
    });
    writeAuditLog("person", personId, "flagWanted", "SYSTEM");
    alert(`Fahndung für ${personId} ausgelöst!`);
  } catch(err) {
    console.error("Fehler Wanted:", err);
  }
});

// ===== Fahrzeug-Check Button =====
document.getElementById('checkPlateBtn').addEventListener('click', async () => {
  const vehicleId = document.getElementById('vehicleSelect').value;
  if (!vehicleId) return alert("Bitte Fahrzeug auswählen!");

  try {
    const docSnap = await getDocs(doc(db, "vehicles", vehicleId));
    if (docSnap.exists()) {
      const v = docSnap.data();
      document.getElementById('alertBox').textContent = `Fahrzeug: ${v.brand} ${v.model} (${v.plate})`;
    } else {
      document.getElementById('alertBox').textContent = "Fahrzeug nicht gefunden!";
    }
  } catch(err) {
    console.error("Fehler Fahrzeug prüfen:", err);
  }
});
</script>
