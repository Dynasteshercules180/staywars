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

  window.loadAccommodations = async function () {
    const sortOption = document.getElementById("sort-options")?.value || "created_at_desc";
    const container = document.getElementById("accommodations");
    container.innerHTML = "<p style='text-align:center;'>Wird geladen...</p>";

    let query = supabase.from("accommodations").select("*");

    if (sortOption === "price_asc") {
      query = query.order("price", { ascending: true });
    } else if (sortOption === "rooms_desc") {
      query = query.order("rooms", { ascending: false });
    } else if (sortOption === "bathrooms_desc") {
      query = query.order("bathrooms", { ascending: false });
    } else if (sortOption === "location_asc") {
      query = query.order("location", { ascending: true });
    } else if (sortOption === "created_at_desc") {
      query = query.order("created_at", { ascending: false });
    }

    let { data, error } = await query;
    if (error) {
      console.error("Fehler beim Laden der Unterkünfte:", error);
      return;
    }

    if (sortOption === "rating_desc") {
      const ratings = await Promise.all(data.map(async (acc) => {
        const { data: reviews } = await supabase.from("reviews").select("rating").eq("accommodation_id", acc.id);
        const avg = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) : 0;
        return { ...acc, avgRating: avg };
      }));
      data = ratings.sort((a, b) => b.avgRating - a.avgRating);
    }

    container.innerHTML = "";
    imagesByAccommodation = {};

    for (let acc of data) {
      const imgRes = await supabase.from("accommodation_images").select("image_url").eq("accommodation_id", acc.id);
      const images = imgRes.data || [];
      const imageTags = images.map((img, idx) => `<img src="${img.image_url}" width="100" style="margin:5px; border-radius:8px; cursor:pointer;" data-accid="${acc.id}" data-index="${idx}">`).join(" ");
      imagesByAccommodation[acc.id] = images.map(img => img.image_url);

      const reviewRes = await supabase.from("reviews").select("rating").eq("accommodation_id", acc.id);
      const reviews = reviewRes.data || [];
      const avgRating = reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : null;

      const div = document.createElement("div");
      div.classList.add("accommodation-card");

      div.innerHTML = `
        <div class="rating-badge">${avgRating ? `⭐ ${avgRating}` : "Noch keine Bewertung"}</div>
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

  // ⭐ Event-Delegation: Galerie öffnen
  document.addEventListener('click', function(e) {
    if (e.target.matches('#accommodations img')) {
      openGallery(e.target.dataset.accid, parseInt(e.target.dataset.index));
    }
  });

  // ⭐ Event-Delegation: Sternebewertung
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('star')) {
      const stars = Array.from(e.target.parentElement.querySelectorAll('.star'));
      stars.forEach(star => star.classList.remove('selected'));
      const clickedIndex = stars.indexOf(e.target);
      stars.forEach((star, idx) => {
        if (idx <= clickedIndex) star.classList.add('selected');
      });
      submitRating(e.target.parentElement.dataset.id, parseInt(e.target.dataset.value));
    }
  });

  function openGallery(accId, startIndex) {
    const images = imagesByAccommodation[accId];
    if (!images) return;

    let currentIndex = startIndex;

    const lightbox = document.createElement('div');
    lightbox.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;";
    
    const img = document.createElement('img');
    img.src = images[currentIndex];
    img.style = "max-width:90%;max-height:80%;border-radius:10px;box-shadow:0 0 20px white;margin-bottom:20px;";

    const controls = document.createElement('div');
    controls.style = "display:flex;gap:20px;";
    const prev = document.createElement('button');
    prev.textContent = "⟵";
    const next = document.createElement('button');
    next.textContent = "⟶";

    prev.onclick = (e) => {
      e.stopPropagation();
      currentIndex = (currentIndex - 1 + images.length) % images.length;
      img.src = images[currentIndex];
    };

    next.onclick = (e) => {
      e.stopPropagation();
      currentIndex = (currentIndex + 1) % images.length;
      img.src = images[currentIndex];
    };

    controls.appendChild(prev);
    controls.appendChild(next);
    lightbox.appendChild(img);
    lightbox.appendChild(controls);
    document.body.appendChild(lightbox);

    lightbox.onclick = () => lightbox.remove();
  }

  loadAccommodations();
});
