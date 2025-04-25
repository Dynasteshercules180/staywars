// Supabase initialisieren (ersetze mit deinem eigenen Key!)
const supabase = supabase.createClient(
  "https://bzoavgxcbnwphooqqvdm.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6b2F2Z3hjYm53cGhvb3FxdmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1Njg2NTIsImV4cCI6MjA2MTE0NDY1Mn0.1u53rNL4AVmVsrehvwtVBOe-JzH5_YXTeOLlFTTWIDE"
);

// Dummy Login (nur zur Trennung der UI)
const VALID_USERS = {
  "admin": "staywars",
  "tester": "nacht123"
};

function login() {
  const user = document.getElementById("login-username").value;
  const pass = document.getElementById("login-password").value;
  const status = document.getElementById("login-status");

  if (VALID_USERS[user] && VALID_USERS[user] === pass) {
    document.getElementById("auth").style.display = "none";
    document.getElementById("form-section").style.display = "block";
    status.textContent = "";
  } else {
    status.textContent = "Falscher Login!";
  }
}

// Formular absenden
document.getElementById("accommodation-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    title: document.getElementById("title").value,
    description: document.getElementById("description").value,
    location: document.getElementById("location").value,
    price: parseFloat(document.getElementById("price").value),
    pros: document.getElementById("pros").value,
    cons: document.getElementById("cons").value,
    rooms: parseInt(document.getElementById("rooms").value),
    bathrooms: parseInt(document.getElementById("bathrooms").value),
    link: document.getElementById("link").value
  };

  const { error } = await supabase.from("accommodations").insert([data]);

  if (error) {
    alert("Fehler beim Speichern!");
    console.error(error);
  } else {
    alert("Unterkunft gespeichert!");
    loadAccommodations();
  }
});

// Unterkünfte anzeigen
async function loadAccommodations() {
  const { data, error } = await supabase.from("accommodations").select("*");

  const container = document.getElementById("accommodations");
  container.innerHTML = "";

  data.forEach(acc => {
    const div = document.createElement("div");
    div.innerHTML = `
      <h3>${acc.title}</h3>
      <p>${acc.description}</p>
      <p>Ort: ${acc.location} | Preis: €${acc.price}</p>
      <p>Zimmer: ${acc.rooms} | Bäder: ${acc.bathrooms}</p>
      <p><a href="${acc.link}" target="_blank">Zur Unterkunft</a></p>
      <p><strong>Vorteile:</strong> ${acc.pros}</p>
      <p><strong>Nachteile:</strong> ${acc.cons}</p>
      <div class="rating">
        <label>Bewertung (1–10):</label>
        <input type="number" min="1" max="10" id="rate-${acc.id}">
        <button onclick="submitRating('${acc.id}')">Abschicken</button>
      </div>
    `;
    container.appendChild(div);
  });
}

window.onload = loadAccommodations;

async function submitRating(accommodation_id) {
  const input = document.getElementById(`rate-${accommodation_id}`);
  const rating = parseInt(input.value);
  if (rating < 1 || rating > 10) return alert("Nur 1–10 erlaubt!");

  const { error } = await supabase.from("reviews").insert([{ accommodation_id, rating }]);
  if (error) {
    alert("Fehler bei Bewertung!");
    console.error(error);
  } else {
    alert("Danke für deine Bewertung!");
  }
}
