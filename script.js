// StayWars - script.js
// Features: Login, Unterkunft erstellen/bearbeiten, Bild-Upload (bis 4 Bilder), Bewertungen

window.addEventListener("DOMContentLoaded", () => {
  // Supabase initialisieren
  const supabase = window.supabase.createClient(
    "https://bzoavgxcbnwphooqqvdm.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6b2F2Z3hjYm53cGhvb3FxdmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1Njg2NTIsImV4cCI6MjA2MTE0NDY1Mn0.1u53rNL4AVmVsrehvwtVBOe-JzH5_YXTeOLlFTTWIDE"
  );

  const VALID_USERS = {
    "admin": "staywars",
    "tester": "nacht123"
  };

  // Login-Funktion
  window.login = function () {
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
  };

  // Formular absenden
  document.getElementById("accommodation-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = document.getElementById("accommodation-id").value;
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

    let response;
    if (id) {
      response = await supabase.from("accommodations").update(data).eq("id", id);
    } else {
      response = await supabase.from("accommodations").insert([data]);
    }

    if (response.error) {
      alert("Fehler beim Speichern!");
      console.error(response.error);
      return;
    }

    const newId = id || response.data[0].id;

    // Bild-Upload (maximal 4 Bilder)
    const files = document.getElementById("images").files;
    if (files.length > 0) {
      for (let i = 0; i < Math.min(files.length, 4); i++) {
        const file = files[i];
        const filePath = `${newId}/${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("accommodation-images")
          .upload(filePath, file);

        if (!uploadError) {
          const publicUrl = supabase.storage
            .from("accommodation-images")
            .getPublicUrl(filePath).data.publicUrl;

          await supabase.from("accommodation_images").insert({
            accommodation_id: newId,
            image_url: publicUrl
          });
        }
      }
    }

    alert("Unterkunft gespeichert!");
    document.getElementById("accommodation-form").reset();
    document.getElementById("accommodation-id").value = "";
    loadAccommodations();
  });

  // Unterkünfte laden
  async function loadAccommodations() {
    const { data, error } = await supabase.from("accommodations").select("*").order("created_at", { ascending: false });

    const container = document.getElementById("accommodations");
    container.innerHTML = "";

    for (let acc of data) {
      const imgRes = await supabase.from("accommodation_images").select("image_url").eq("accommodation_id", acc.id);
      const images = imgRes.data || [];
      const imageTags = images.map(img => `<img src="${img.image_url}" width="100" style="margin:5px; border-radius:8px;">`).join(" ");

      const div = document.createElement("div");
      div.innerHTML = `
        <h3>${acc.title}</h3>
        ${imageTags}<br>
        <p>${acc.description}</p>
        <p>Ort: ${acc.location} | Preis: €${acc.price}</p>
        <p>Zimmer: ${acc.rooms} | Bäder: ${acc.bathrooms}</p>
        <p><a href="${acc.link}" target="_blank">Zur Unterkunft</a></p>
        <p><strong>Vorteile:</strong> ${acc.pros}</p>
        <p><strong>Nachteile:</strong> ${acc.cons}</p>
        <button onclick="editAccommodation('${acc.id}')">Bearbeiten</button>
        <div class="rating">
          <label>Bewertung (1–10):</label>
          <input type="number" min="1" max="10" id="rate-${acc.id}">
          <button onclick="submitRating('${acc.id}')">Abschicken</button>
        </div>
      `;
      container.appendChild(div);
    }
  }

  // Unterkunft zum Bearbeiten laden
  window.editAccommodation = async function (id) {
    const { data } = await supabase.from("accommodations").select("*").eq("id", id).single();
    if (data) {
      document.getElementById("accommodation-id").value = data.id;
      document.getElementById("title").value = data.title;
      document.getElementById("description").value = data.description;
      document.getElementById("location").value = data.location;
      document.getElementById("price").value = data.price;
      document.getElementById("pros").value = data.pros;
      document.getElementById("cons").value = data.cons;
      document.getElementById("rooms").value = data.rooms;
      document.getElementById("bathrooms").value = data.bathrooms;
      document.getElementById("link").value = data.link;
      document.getElementById("form-section").scrollIntoView({ behavior: "smooth" });
    }
  };

  // Bewertung speichern
  window.submitRating = async function (accommodation_id) {
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
  };

  // Beim Start laden
  loadAccommodations();
});
