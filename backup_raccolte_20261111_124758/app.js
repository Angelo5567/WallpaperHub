"use strict";

const $ = id => document.getElementById(id);

const KEYS = {
  favorites: "wallpaperhub-favorites-final",
  collections: "wallpaperhub-collections-final"
};

const CATEGORIES = ["Natura","Auto","Tecnologia","Spazio","Minimal","Città"];

let wallpapers = [];
let favorites = new Set();
let collections = {};
let currentView = "all";
let currentCategory = "Tutti";
let currentPreview = null;
let page = 1;
const PAGE_SIZE = 60;
let db = null;

function readJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.error("Lettura archivio:", error);
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("Salvataggio archivio:", error);
    toast("Il browser non riesce a salvare i dati. Controlla lo spazio disponibile.");
    return false;
  }
}

function loadFavorites() {
  const keys = [
    "wallpaperhub-favorites",
    "wallpaperhub-favorites-v3",
    "wallpaperhub-favorites-v4",
    KEYS.favorites
  ];

  const recovered = new Set();

  for (const key of keys) {
    const values = readJSON(key, []);
    if (Array.isArray(values)) {
      values.forEach(id => {
        if (typeof id === "string") recovered.add(id);
      });
    }
  }

  favorites = recovered;
  saveFavorites();
}

function saveFavorites() {
  return saveJSON(KEYS.favorites, [...favorites]);
}

function toast(message) {
  const element = $("toast");
  if (!element) {
    alert(message);
    return;
  }

  element.textContent = message;
  element.classList.add("show");

  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    element.classList.remove("show");
  }, 2600);
}

function buildLibrary() {
  wallpapers = Array.from({ length: 500 }, (_, index) => {
    const orientation = ["portrait", "landscape", "square"][index % 3];

    return {
      id: `wall-${index + 1}`,
      title: `Fotografia ${String(index + 1).padStart(3, "0")}`,
      category: "Fotografia casuale",
      seed: `wallpaperhub-${index + 1}`,
      source: "online",
      orientation
    };
  });
}

function getImageDimensions(w) {
  if (w.orientation === "landscape") return [1600, 1000];
  if (w.orientation === "square") return [1200, 1200];
  return [1200, 1600];
}

function imageUrl(seed, width = 1200, height = 1600) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${width}/${height}`;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB non disponibile"));
      return;
    }

    const request = indexedDB.open("WallpaperHubDB", 1);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains("uploads")) {
        database.createObjectStore("uploads", { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dbRequest(mode, operation, value) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Archivio non pronto"));
      return;
    }

    const transaction = db.transaction("uploads", mode);
    const store = transaction.objectStore("uploads");
    const request = value === undefined
      ? store[operation]()
      : store[operation](value);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadUploads() {
  try {
    const records = await dbRequest("readonly", "getAll");

    records.forEach(record => {
      wallpapers.push({
        id: record.id,
        title: record.title,
        category: "I miei sfondi",
        source: "upload",
        blob: record.blob,
        orientation: "all"
      });
    });
  } catch (error) {
    console.error("Caricamenti personali:", error);
  }
}

function getVisibleWallpapers() {
  const query = ($("searchInput")?.value || "").trim().toLowerCase();
  const collection = $("collectionSelect")?.value || "all";
  const orientation = $("orientationSelect")?.value || "all";

  let result = wallpapers.filter(w => {
    if (currentView === "favorites" && !favorites.has(w.id)) return false;
    if (currentView === "uploads" && w.source !== "upload") return false;

    if (currentCategory !== "Tutti" && w.category !== currentCategory) return false;

    if (query && !(w.title + " " + w.category).toLowerCase().includes(query)) {
      return false;
    }

    if (collection !== "all" && !(collections[collection] || []).includes(w.id)) {
      return false;
    }

    if (orientation !== "all" && w.orientation !== orientation) {
      return false;
    }

    return true;
  });

  const sort = $("sortSelect")?.value || "default";

  if (sort === "az") {
    result.sort((a, b) => a.title.localeCompare(b.title, "it"));
  } else if (sort === "za") {
    result.sort((a, b) => b.title.localeCompare(a.title, "it"));
  } else {
    result.sort((a, b) => wallpapers.indexOf(a) - wallpapers.indexOf(b));
  }

  return result;
}

function render() {
  const grid = $("wallpaperGrid");
  if (!grid) return;

  const list = getVisibleWallpapers();
  const visible = list.slice(0, page * PAGE_SIZE);

  grid.innerHTML = "";

  visible.forEach(w => {
    const card = document.createElement("article");
    card.className = "wallpaper-card";

    const imageBox = document.createElement("div");
    imageBox.className = "wallpaper-image";
    imageBox.dataset.open = w.id;

    const img = document.createElement("img");
    img.alt = w.title;
    img.loading = "lazy";
    img.decoding = "async";
    const dimensions = getImageDimensions(w);
    img.src = w.blob ? URL.createObjectURL(w.blob) : imageUrl(w.seed, dimensions[0], dimensions[1]);

    const placeholder = document.createElement("div");
    placeholder.className = "image-placeholder";
    placeholder.textContent = "Caricamento...";

    img.onload = () => placeholder.remove();
    img.onerror = () => {
      img.classList.add("failed");
      placeholder.textContent = "Immagine non disponibile";
    };

    const overlay = document.createElement("div");
    overlay.className = "card-overlay";

    const button = document.createElement("button");
    const selected = favorites.has(w.id);

    button.type = "button";
    button.className = "favorite-button" + (selected ? " is-favorite" : "");
    button.dataset.favorite = w.id;
    button.textContent = selected ? "♥" : "♡";
    button.setAttribute("aria-label", selected ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti");

    overlay.appendChild(button);
    imageBox.append(img, placeholder, overlay);

    const meta = document.createElement("div");
    meta.className = "card-meta";

    const title = document.createElement("strong");
    title.textContent = w.title;

    const category = document.createElement("span");
    category.textContent = w.category;

    meta.append(title, category);
    card.append(imageBox, meta);
    grid.appendChild(card);
  });

  if ($("resultCount")) {
    $("resultCount").textContent =
      `${list.length} sfondi · Visualizzati ${visible.length}`;
  }

  if ($("totalCount")) $("totalCount").textContent = "500";

  if ($("emptyState")) $("emptyState").hidden = list.length !== 0;

  if ($("loadMore")) $("loadMore").hidden = visible.length >= list.length;

  if ($("viewTitle")) {
    $("viewTitle").textContent =
      currentView === "favorites" ? "I TUOI PREFERITI" :
      currentView === "uploads" ? "I TUOI CARICAMENTI" :
      "TUTTI GLI SFONDI";
  }
}

function toggleFavorite(id) {
  if (!id) return;

  if (favorites.has(id)) {
    favorites.delete(id);
  } else {
    favorites.add(id);
  }

  if (!saveFavorites()) {
    if (favorites.has(id)) favorites.delete(id);
    else favorites.add(id);
    return;
  }

  render();
  updatePreviewFavorite();
  toast(favorites.has(id) ? "Aggiunto ai preferiti ♥" : "Rimosso dai preferiti");
}

function updatePreviewFavorite() {
  if (!currentPreview || !$("previewFavorite")) return;

  $("previewFavorite").textContent =
    favorites.has(currentPreview.id) ? "♥ Nei preferiti" : "♡ Preferito";
}

function openPreview(w) {
  if (!w) return;

  currentPreview = w;

  $("previewTitle").textContent = w.title;
  $("previewCategory").textContent = w.category.toUpperCase();
  $("previewImage").src = w.blob
    ? URL.createObjectURL(w.blob)
    : imageUrl(w.seed, ...getImageDimensions(w));

  $("previewModal").classList.add("open");
  $("previewModal").setAttribute("aria-hidden", "false");

  updatePreviewFavorite();
}

function closePreview() {
  $("previewModal")?.classList.remove("open");
  $("previewModal")?.setAttribute("aria-hidden", "true");
  currentPreview = null;
}

async function downloadCurrent() {
  if (!currentPreview) return;

  const height = Number($("resolutionSelect")?.value || 1080);
  const width = Math.round(height * 0.75);

  const url = currentPreview.blob
    ? URL.createObjectURL(currentPreview.blob)
    : imageUrl(currentPreview.seed, width, height);

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Download non disponibile");

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `${currentPreview.title.replace(/[^a-z0-9]/gi, "-")}.jpg`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(objectUrl), 3000);
    if (currentPreview.blob) URL.revokeObjectURL(url);

    toast("Download avviato");
  } catch (error) {
    window.open(url, "_blank", "noopener");
    toast("Immagine aperta in una nuova scheda");
  }
}

async function handleUploads(files) {
  const selected = [...files].filter(file => file.type.startsWith("image/"));

  if (!selected.length) {
    toast("Seleziona immagini valide");
    return;
  }

  if (!db) {
    toast("Archivio non disponibile");
    return;
  }

  let count = 0;

  for (const file of selected) {
    const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    try {
      await dbRequest("readwrite", "put", {
        id,
        title: file.name.replace(/\.[^.]+$/, ""),
        blob: file
      });

      wallpapers.push({
        id,
        title: file.name.replace(/\.[^.]+$/, ""),
        category: "I miei sfondi",
        source: "upload",
        blob: file,
        orientation: "all"
      });

      count++;
    } catch (error) {
      console.error(error);
      toast("Impossibile salvare una delle immagini");
    }
  }

  currentView = "uploads";
  updateNavigation();
  render();
  toast(`${count} immagini caricate`);
}

function updateNavigation() {
  document.querySelectorAll(".nav-btn").forEach(button => {
    button.classList.toggle("active", button.dataset.view === currentView);
  });
}

function updateCollections() {
  const select = $("collectionSelect");
  if (!select) return;

  const previous = select.value;
  select.innerHTML = '<option value="all">Tutte le raccolte</option>';

  Object.keys(collections).forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });

  select.value = collections[previous] ? previous : "all";
}

function createCollection() {
  const name = prompt("Nome della nuova raccolta:");
  if (!name || !name.trim()) return;

  const clean = name.trim().slice(0, 40);

  if (collections[clean]) {
    toast("La raccolta esiste già");
    return;
  }

  collections[clean] = [];
  saveJSON(KEYS.collections, collections);
  updateCollections();
  $("collectionSelect").value = clean;
  render();
  toast("Raccolta creata");
}

function resetFilters() {
  if ($("searchInput")) $("searchInput").value = "";
  if ($("orientationSelect")) $("orientationSelect").value = "all";
  if ($("sortSelect")) $("sortSelect").value = "default";
  if ($("collectionSelect")) $("collectionSelect").value = "all";

  currentCategory = "Tutti";
  page = 1;

  document.querySelectorAll(".category").forEach(button => {
    button.classList.toggle("active", button.dataset.category === "Tutti");
  });

  render();
}

function setupCategories() {
  const list = $("categoryList");
  if (!list) return;

  list.innerHTML = `
    <button class="category active" data-category="Tutti">Tutti</button>
    <button class="category" data-category="Fotografia casuale">Fotografie casuali</button>
    <button class="category" data-category="I miei sfondi">I miei sfondi</button>
  `;
}

async function initialize() {
  loadFavorites();
  collections = readJSON(KEYS.collections, {});
  buildLibrary();
  setupCategories();
  updateCollections();
  updateNavigation();
  render();

  const grid = $("wallpaperGrid");

  grid?.addEventListener("click", event => {
    const favoriteButton = event.target.closest("[data-favorite]");

    if (favoriteButton) {
      event.preventDefault();
      event.stopPropagation();
      toggleFavorite(favoriteButton.dataset.favorite);
      return;
    }

    const image = event.target.closest("[data-open]");

    if (image) {
      const wallpaper = wallpapers.find(w => w.id === image.dataset.open);
      openPreview(wallpaper);
    }
  });

  document.querySelectorAll(".nav-btn").forEach(button => {
    button.addEventListener("click", () => {
      currentView = button.dataset.view;
      page = 1;
      updateNavigation();
      render();
    });
  });

  $("categoryList")?.addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (!button) return;

    currentCategory = button.dataset.category;
    page = 1;

    document.querySelectorAll(".category").forEach(item => {
      item.classList.toggle("active", item === button);
    });

    render();
  });

  $("searchInput")?.addEventListener("input", () => {
    page = 1;
    render();
  });

  $("orientationSelect")?.addEventListener("change", () => {
    page = 1;
    render();
  });

  $("sortSelect")?.addEventListener("change", () => {
    page = 1;
    render();
  });

  $("collectionSelect")?.addEventListener("change", () => {
    page = 1;
    render();
  });

  $("clearSearch")?.addEventListener("click", () => {
    $("searchInput").value = "";
    page = 1;
    render();
  });

  $("resetFilters")?.addEventListener("click", resetFilters);

  $("loadMore")?.addEventListener("click", () => {
    page++;
    render();
  });

  $("uploadInput")?.addEventListener("change", event => {
    handleUploads(event.target.files);
    event.target.value = "";
  });

  $("newCollection")?.addEventListener("click", createCollection);
  $("closeModal")?.addEventListener("click", closePreview);
  $("modalBackdrop")?.addEventListener("click", closePreview);
  $("downloadButton")?.addEventListener("click", downloadCurrent);

  $("previewFavorite")?.addEventListener("click", () => {
    if (currentPreview) toggleFavorite(currentPreview.id);
  });

  $("homeButton")?.addEventListener("click", event => {
    event.preventDefault();
    currentView = "all";
    resetFilters();
    updateNavigation();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closePreview();
  });

  try {
    db = await openDatabase();
    await loadUploads();
    render();
  } catch (error) {
    console.error("Archivio locale:", error);
    toast("Archivio immagini non disponibile");
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(console.error);
  }

  console.log("WallpaperHub avviato. Preferiti:", favorites.size);
}

initialize();

