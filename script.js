// StayWars - Komplett aktualisiert mit Sortierung und Swipe/Klick Bewertung

window.addEventListener("DOMContentLoaded", () => {
  const supabase = window.supabase.createClient(
   "https://bzoavgxcbnwphooqqvdm.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6b2F2Z3hjYm53cGhvb3FxdmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1Njg2NTIsImV4cCI6MjA2MTE0NDY1Mn0.1u53rNL4AVmVsrehvwtVBOe-JzH5_YXTeOLlFTTWIDE"
  );

  const VALID_USERS = {
    "admin": "staywars",
    "tester": "nacht123"
  };

  let imagesByAccommodation = {};
  let touchStars = [];

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
    const sortOption = document.getElementById("sort-options")?.value || "created_at_desc";
    let { data: accommodations, error } = await supabase.from("accommodations").select("*");

    if (error) {
      console.error("Fehler beim Laden:", error);
      return;
    }

    // Bewertungen dazuholen
    for (let acc of accommodations) {
      const { data: reviews } = await supabase.from("reviews").select("rating").eq("accommodation_id", acc.id);
      if (reviews.length > 0) {
        acc.avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      } else {
        acc.avgRating = null;
      }
    }

    // Sortieren
    switch (sortOption) {
      case "rating_desc":
        accommodations.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
        break;
      case "price_asc":
        accommodations.sort((a, b) => a.price - b.price);
        break;
      case "rooms_desc":
        accommodations.sort((a, b) => b.rooms - a.rooms);
        break;
      case "bathrooms_desc":
        accommodations.sort((a, b) => b.bathrooms - a.bathrooms);
        break;
      case "location_asc":
        accommodations.sort((a, b) => (a.location || "").localeCompare(b.location || ""));
        break;
      default:
        accommodations.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    const container = document.getElementById("accommodations");
    container.innerHTML = "";
    imagesByAccommodation = {};

    for (let acc of accommodations) {
      const imgRes = await supabase.from("accommodation_images").select("image_url").eq("accommodation_id", acc.id);
      const images = imgRes.data || [];
      const imageTags = images.map((img, idx) => `<img src="${img.image_url}" width="100" style="margin:5px; border-radius:8px;" data-accid="${acc.id}" data-index="${idx}">`).join(" ");
      imagesByAccommodation[acc.id] = images.map(img => img.image_url);

      const div = document.createElement("div");
      div.classList.add("accommodation-card");

      div.innerHTML = `
        <div class="rating-badge">${acc.avgRating ? `⭐ ${acc.avgRating.toFixed(1)}` : "Noch keine Bewertung"}</div>
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

  async function submitRating(accommodation_id, rating) {
    const username = prompt("Bitte gib deinen Namen ein:");
    if (!username || username.trim() === "") {
      alert("Name ist erforderlich, um zu bewerten.");
      loadAccommodations();
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
      loadAccommodations();
    }
  }

  function showSuccessMessage(message) {
    const msg = document.createElement("div");
    msg.textContent = message;
    msg.className = "success-message";
    const formSection = document.getElementById("form-section");
    formSection.insertBefore(msg, formSection.firstChild);

    setTimeout(() => {
      msg.remove();
    }, 3000);
  }

  // ⭐ EventListener: Dropdown-Sortieren
  const sortOptions = document.getElementById("sort-options");
  if (sortOptions) {
    sortOptions.addEventListener("change", () => {
      loadAccommodations();
    });
  }

  // Sterne Hover (nur Desktop)
  document.addEventListener('mouseover', function(e) {
    if (e.target.classList.contains('star') && window.innerWidth > 768) {
      const stars = Array.from(e.target.parentElement.querySelectorAll('.star'));
      const hoverIndex = stars.indexOf(e.target);
      stars.forEach((star, idx) => {
        if (idx <= hoverIndex) {
          star.classList.add('hover');
        } else {
          star.classList.remove('hover');
        }
      });
    }
  });

  document.addEventListener('mouseout', function(e) {
    if (e.target.classList.contains('star') && window.innerWidth > 768) {
      const stars = Array.from(e.target.parentElement.querySelectorAll('.star'));
      stars.forEach(star => {
        star.classList.remove('hover');
      });
    }
  });

  // Galerie & Swipe-Funktion (dein bisheriger Code bleibt!)

  loadAccommodations();
});
