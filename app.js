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
</script>
