// StayWars - script.js
// Features: Login, Unterkunft erstellen/bearbeiten, Bild-Upload, Sternebewertung, Erfolgsmeldung

window.addEventListener("DOMContentLoaded", () => {
  const supabase = window.supabase.createClient(
    "https://bzoavgxcbnwphooqqvdm.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6b2F2Z3hjYm53cGhvb3FxdmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1Njg2NTIsImV4cCI6MjA2MTE0NDY1Mn0.1u53rNL4AVmVsrehvwtVBOe-JzH5_YXTeOLlFTTWIDE"
  );

  const VALID_USERS = {
    "admin": "staywars",
    "tester": "nacht123"
  };

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

    let newId = id;
    let response;

    if (id) {
      response = await supabase.from("accommodations").update(data).eq("id", id);
    } else {
      response = await supabase.from("accommodations").insert([data]).select();
      if (response.error || !response.data || response.data.length === 0) {
        alert("Fehler beim Speichern!");
        console.error(response.error || "Keine Daten zurückgegeben.");
        return;
      }
      newId = response.data[0].id;
    }

    const files = document.getElementById("images").files;
    if (files.length > 0) {
      for (let i = 0; i < Math.min(files.length, 4); i++) {
        const file = files[i];
        if (!file || !file.name || file.size === 0) continue;

        const filePath = `${newId}/${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("accommodation-images")
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error("Upload-Fehler:", uploadError);
          continue;
        }

        const publicUrl = supabase.storage
          .from("accommodation-images")
          .getPublicUrl(filePath).data.publicUrl;

        await supabase.from("accommodation_images").insert({
          accommodation_id: newId,
          image_url: publicUrl
        });
      }
    }

    showSuccessMessage("Unterkunft erfolgreich gespeichert!");

    document.getElementById("accommodation-form").reset();
    document.getElementById("accommodation-id").value = "";
    loadAccommodations();
  });

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
        <div class="rating" data-id="${acc.id}">
          ${[1,2,3,4,5].map(n => `<span data-value="${n}" class="star">★</span>`).join('')}
        </div>
      `;
      container.appendChild(div);
    }
  }

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

window.submitRating = async function (accommodation_id, rating) {
  if (rating < 1 || rating > 5) return alert("Nur 1–5 Sterne erlaubt!");

  const username = prompt("Bitte gib deinen Namen ein:");

  if (!username || username.trim() === "") {
    alert("Name ist erforderlich, um zu bewerten.");
    return;
  }

  const { error } = await supabase.from("reviews").insert([{
    accommodation_id,
    rating,
    username: username.trim()
  }]);

  if (error) {
    alert("Fehler bei Bewertung!");
    console.error(error);
  } else {
    alert("Danke für deine Bewertung!");
  }
};


  function showSuccessMessage(message) {
    const msg = document.createElement("div");
    msg.textContent = message;
    msg.style.background = "#d4edda";
    msg.style.color = "#155724";
    msg.style.padding = "10px";
    msg.style.margin = "10px 0";
    msg.style.borderRadius = "6px";
    msg.style.textAlign = "center";

    const formSection = document.getElementById("form-section");
    formSection.insertBefore(msg, formSection.firstChild);

    setTimeout(() => {
      msg.remove();
    }, 3000);
  }

  // ✨ Neues Event-Handling für Sterne Hover und Klick
  document.addEventListener('mouseover', function(e) {
    if (e.target.classList.contains('star')) {
      const stars = Array.from(e.target.parentElement.querySelectorAll('.star'));
      const hoverIndex = stars.indexOf(e.target);
      stars.forEach((star, idx) => {
        star.style.color = idx <= hoverIndex ? 'gold' : 'gray';
      });
    }
  });

  document.addEventListener('mouseout', function(e) {
    if (e.target.classList.contains('star')) {
      const stars = Array.from(e.target.parentElement.querySelectorAll('.star'));
      stars.forEach(star => star.style.color = 'gray');
    }
  });

  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('star')) {
      const accommodationId = e.target.parentElement.dataset.id;
      const rating = e.target.dataset.value;
      submitRating(accommodationId, rating);
    }
  });

  loadAccommodations();
});
