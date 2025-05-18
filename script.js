// StayWars Script

window.addEventListener("DOMContentLoaded", () => {
  const supabase = window.supabase.createClient(
    "https://bzoavgxcbnwphooqqvdm.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6b2F2Z3hjYm53cGhvb3FxdmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1Njg2NTIsImV4cCI6MjA2MTE0NDY1Mn0.1u53rNL4AVmVsrehvwtVBOe-JzH5_YXTeOLlFTTWIDE"
  );

  const VALID_USERS = { "admin": "staywars", "tester": "nacht123" };

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
        const { error: uploadError } = await supabase.storage.from("accommodation-images").upload(filePath, file);
        if (uploadError) {
          console.error("Upload-Fehler:", uploadError);
          continue;
        }
        const publicUrl = supabase.storage.from("accommodation-images").getPublicUrl(filePath).data.publicUrl;
        await supabase.from("accommodation_images").insert({ accommodation_id: newId, image_url: publicUrl });
      }
    }

    alert("Unterkunft erfolgreich gespeichert!");
    document.getElementById("accommodation-form").reset();
    document.getElementById("accommodation-id").value = "";
    loadAccommodations();
  });

  window.loadAccommodations = async function () {
    const sortOption = document.getElementById("sort-options")?.value || "created_at_desc";
    const locationFilter = document.getElementById("filter-location")?.value.trim().toLowerCase();

    let { data, error } = await supabase.from("accommodations").select("*");
    if (error) {
      console.error("Fehler beim Laden:", error);
      return;
    }

    if (locationFilter) {
      data = data.filter(acc => acc.location && acc.location.toLowerCase().includes(locationFilter));
    }

    if (sortOption === "price_asc") {
      data.sort((a, b) => a.price - b.price);
    } else if (sortOption === "rooms_desc") {
      data.sort((a, b) => b.rooms - a.rooms);
    } else if (sortOption === "bathrooms_desc") {
      data.sort((a, b) => b.bathrooms - a.bathrooms);
    } else if (sortOption === "location_asc") {
      data.sort((a, b) => a.location.localeCompare(b.location));
    } else if (sortOption === "created_at_desc") {
      data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    const container = document.getElementById("accommodations");
    container.innerHTML = "";

    for (let acc of data) {
      const { data: images } = await supabase.from("accommodation_images").select("image_url").eq("accommodation_id", acc.id);
      const imageTags = (images || []).map(img => `<img src="${img.image_url}" style="width:100px;margin:5px;border-radius:8px;">`).join(" ");

      const div = document.createElement("div");
      div.classList.add("accommodation-card");
      div.innerHTML = `
        <h3>${acc.title}</h3>
        ${imageTags}<br>
        <p>${acc.description}</p>
        <p>Ort: ${acc.location} | Preis: €${acc.price}</p>
        <p>Zimmer: ${acc.rooms} | Bäder: ${acc.bathrooms}</p>
        <p><a href="${acc.link}" target="_blank">Zur Unterkunft</a></p>
        <p><strong>Vorteile:</strong> ${acc.pros}</p>
        <p><strong>Nachteile:</strong> ${acc.cons}</p>
      `;
      container.appendChild(div);
    }
  };

  loadAccommodations();
});
