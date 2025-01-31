document.addEventListener("DOMContentLoaded", () => {
    initializeHeaderAndFooter();

    const path = window.location.pathname;

    // Index laden anhand url
    if (
        path.includes("index.html") ||
        !(
            path.includes("detail.html") ||
            path.includes("kontakt.html") ||
            path.includes("edit.html") ||
            path.includes("search.html") ||
            path.includes("impressum.html")
        )
    ) {
        loadDevicesOnIndex();
    }

    if (path.includes("detail.html")) {
        loadDeviceDetails();
    }

    if (path.includes("kontakt.html")) {
        try {
            initializeMap();
        } catch (error) {
            console.error("Fehler in initializeMap():", error);
        }
    }

    if (path.includes("edit.html")) {
        setupCRUD();
        loadDevices();
    }

    if (path.includes("search.html")) {
        loadSearchResults();
    }

    const urlParams = new URLSearchParams(window.location.search);
    const deviceId = urlParams.get("id");

    if (path.includes("edit.html") && deviceId !== null) {
        loadEditForm();
    }

    // Kontaktnachricht bestätigen
    const sendButton = document.getElementById("send-btn");
    if (sendButton) {
        sendButton.addEventListener("click", function (event) {
            event.preventDefault();
            showConfirmationMessage();
        });
    }
});


// Header&Footer laden
function initializeHeaderAndFooter() {
    // warte auf alle fetch
    Promise.all([
        fetch("header.html").then(response => response.text()),
        fetch("footer.html").then(response => response.text())
    ]).then(([headerData, footerData]) => {
        document.getElementById("autoHeader").innerHTML = headerData;
        document.getElementById("autoFooter").innerHTML = footerData;
        // Suche aktivieren
        initializeSearch();
    });
}

// Karte initialisieren
function initializeMap() {
    // Map vorhanden?
    const mapElement = document.getElementById("map");
    if (!mapElement) {
        return;
    }

    // OpenStreetMap-Karte initialisieren
    let map = L.map('map').setView([52.492675, 13.523722], 12);

    // OpenStreetMap-Kacheln hinzufügen
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Marker hinzufügen
    L.marker([52.492675, 13.523722]).addTo(map)
        .bindPopup("<b>Homie - Smart Home</b>")
        .openPopup();
}

// Sichtbarkeit der Suchleiste anpassen
function initializeSearch() {
    const searchIcon = document.getElementById("search-icon");
    const searchFilterWrapper = document.getElementById("search-filter-wrapper");
    const searchContainer = document.querySelector(".search-container");

    if (!searchIcon || !searchFilterWrapper || !searchContainer) {
        console.error("Such- oder Filterelemente nicht gefunden!");
        return;
    }

    // Klick auf Suchcontainer öffnet  leeres Suchfeld
    searchIcon.addEventListener("click", function (event) {
        event.preventDefault();
        searchContainer.classList.toggle("active");

        if (searchContainer.classList.contains("active")) {
            document.getElementById("search-field").focus();
        } else {
            clearSearchInputs();
        }
    });

    // Klick außerhalb Suchcontainer schließt Suchfeld
    document.addEventListener("click", function (event) {
        if (!searchContainer.contains(event.target) && !searchIcon.contains(event.target)) {
            searchContainer.classList.remove("active");
            clearSearchInputs();
        }
    });
    initializeFiltering();
}

// Suchfelder zurücksetzen
function clearSearchInputs() {
    document.getElementById("search-field").value = "";
    document.getElementById("power-min").value = "";
    document.getElementById("power-max").value = "";
}

// Filtern durch Enter, wenn ausgefüllt
function initializeFiltering() {
    const searchField = document.getElementById("search-field");
    const powerMinField = document.getElementById("power-min");
    const powerMaxField = document.getElementById("power-max");

    function filterOnEnter(event) {
        // Bei Enter Felder nach Werte absuchen
        if (event.key === "Enter") {
            event.preventDefault();
            const searchQuery = searchField.value.trim();
            const searchPowerMin = powerMinField.value.trim();
            const searchPowerMax = powerMaxField.value.trim();
            let searchURL = `search.html?q=${encodeURIComponent(searchQuery)}`;
            // wenn vorhanden, URL erweitern, sonst leer
            if (searchPowerMin) {
                searchURL += `&powermin=${encodeURIComponent(searchPowerMin)}`;
            }
            if (searchPowerMax) {
                searchURL += `&powermax=${encodeURIComponent(searchPowerMax)}`;
            }
            if (searchQuery) {
                window.location.href = searchURL;
            }
        }
    }
    if (searchField) {
        searchField.addEventListener("keydown", filterOnEnter);
    }
    if (powerMinField) {
        powerMinField.addEventListener("keydown", filterOnEnter);
    }
    if (powerMaxField) {
        powerMaxField.addEventListener("keydown", filterOnEnter);
    }
}
// Liste aus API abfragen
async function fetchDevices() {
    try {
        const response = await fetch('/api/devices');
        if (!response.ok) throw new Error("Server antwortete nicht korrekt");
        // als json zurück
        const devices = await response.json();
        return devices;
    } catch (error) {
        console.error("Fehler beim Abrufen der Geräte:", error);
        return []; // Falls die API fehlschlägt, gebe ein leeres Array zurück
    }
}

// Einzelnes Gerät abfragen
async function getDeviceById(id) {
    try {
        const response = await fetch(`/api/devices/${id}`);
        if (!response.ok) throw new Error("Gerät nicht gefunden");
        return await response.json();
    } catch (error) {
        console.error(`Fehler beim Abrufen des Geräts mit ID ${id}:`, error);
        return null;
    }
}

// Gerät bearbeiten
async function editDevice(id) {
    const device = await getDeviceById(id);
    if (!device) {
        alert("Gerät nicht gefunden.");
        return;
    }
    // automatisch ausfüllen, wenn edit.html geöffnet wird
    if (window.location.pathname.includes("edit.html")) {
        const nameField = document.getElementById("device-name");
        const typeField = document.getElementById("device-type");
        const powerField = document.getElementById("device-power");
        const roomField = document.getElementById("device-room");
        const categoryField = document.getElementById("device-category");
        const imageField = document.getElementById("device-image");
        const idField = document.getElementById("device-id");

        if (!nameField || !typeField || !powerField || !roomField || !categoryField || !imageField || !idField) {
            console.error("Bearbeitungsformular nicht gefunden.");
            return;
        }
        idField.value = device.id;
        nameField.value = device.name;
        typeField.value = device.type;
        powerField.value = device.power;
        roomField.value = device.room;
        categoryField.value = device.category;
        imageField.value = device.image || "images/default.png";

        document.getElementById("form-title").textContent = "Gerät bearbeiten";
        document.getElementById("edit-btn").textContent = "bearbeiten";
    } else {
        window.location.href = `edit.html?id=${id}`;
    }
}

// Gerät löschen mittels delete
async function deleteDeviceperm(id) {
    try {
        await fetch('/api/devices', {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id}),
        });
        loadDevices(); // Aktualisierte Liste neu laden
    } catch (error) {
        console.error("Fehler beim Löschen des Geräts:", error);
    }
}

// Gerät löschen mittels Bestätigung
async function deleteDevice(id) {
    const devices = await fetchDevices();
    const device = devices.find(d => d.id === id);

    if (confirm("Möchtest du " + device.name + " wirklich löschen?")) {
        await deleteDeviceperm(id);
        // Zurückleitung
        if (window.location.pathname.includes("detail.html")) {
            alert(device.name + " wurde gelöscht. Zurück zur Startseite.");
            window.location.href = "index.html";
        } else {
            loadDevices();
        }
    }
}

// Geräteliste abfragen und laden
async function loadDevices() {
    const deviceList = document.getElementById("device-list");
    if (!deviceList) return;

    const devices = await fetchDevices();
    // Liste zurücksetzen
    deviceList.innerHTML = "";

    // Tabelle mit Liste ausfüllen
    devices.forEach(device => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><img src="${device.image}" alt="${device.name}" width="50"></td>
            <td>${device.name}</td>
            <td>${device.type}</td>
            <td>${device.power} W</td>
            <td>${device.room}</td>
            <td>${device.category}</td>
            <td>
                <button onclick="editDevice(${device.id})"class="btn-edit">Bearbeiten</button>
                <button onclick="deleteDevice(${device.id})"class="btn-delete">Löschen</button>
            </td>
        `;
        deviceList.appendChild(row);
    });
}

// Mittels ID Gerät aktualisieren(put)
async function updateDevice(id, name, type, power, room, category, image) {
    try {
        const existingDevice = await getDeviceById(id);
        if (!existingDevice) {
            console.error(`Gerät mit ID ${id} nicht gefunden.`);
            return;
        }
        // put anfrage mittels json-format
        await fetch('/api/devices', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                id,
                name,
                type,
                power,
                room,
                category,
                image
            }),
        });
        loadDevices();
    } catch (error) {
        console.error("Fehler beim Aktualisieren des Geräts:", error);
    }
}
// Gerät hinzufügen mittels post
async function addDevice(name, type, power, room, category, image) {
    try {
        // post anfrage mittels json-format
        await fetch('/api/devices', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name, type, power, room, category, image}),
        });
        loadDevices();
    } catch (error) {
        console.error("Fehler beim Hinzufügen eines Geräts:", error);
    }
}

// CRUD-Funktionen
function setupCRUD() {
    const form = document.getElementById("device-form");

    loadDevices();

    // Gerät hinzufügen oder bearbeiten
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const id = document.getElementById("device-id").value;
        const name = document.getElementById("device-name").value;
        const type = document.getElementById("device-type").value;
        const power = document.getElementById("device-power").value;
        const room = document.getElementById("device-room").value;
        const category = document.getElementById("device-category").value;
        let imageName = document.getElementById("device-image").value.trim();

        // Falls der Benutzer keine Dateiendung (.png, .jpg, .jpeg) angibt, füge .png hinzu
        if (imageName && !imageName.includes(".")) {
            imageName += ".png";
        }

        // Standard-Bild
        const image = imageName && !imageName.includes("/") ? `images/${imageName}` : imageName || "images/default.png";

        // Wenn ID übergeben wird, dann update, sonst add
        if (id) {
            updateDevice(id, name, type, power, room, category, image);
        } else {
            addDevice(name, type, power, room, category, image);
        }

        // Felder zurücksetzen
        form.reset();
        document.getElementById("device-id").value = "";
        document.getElementById("form-title").textContent = "Gerät hinzufügen";

        loadDevices();
    });

}

// Suchergebnisse anzeigen
async function loadSearchResults() {
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get("q") || "";
    const powerMin = urlParams.get("powermin") ? parseInt(urlParams.get("powermin"), 10) : 0;
    const powerMax = urlParams.get("powermax") ? parseInt(urlParams.get("powermax"), 10) : Infinity;

    // wenn keine Eingabe, suche leer
    if (!searchQuery && powerMin === 0 && powerMax === Infinity) {
        document.querySelector("h1").textContent = "Keine Suchanfrage angegeben.";
        return;
    }

    // Überschrift mit Leistungsbereich
    let searchText = `für: "${searchQuery}"`;

    if (powerMin > 0 || powerMax < Infinity) {
        searchText += " (";
        if (powerMin > 0) searchText += `min: ${powerMin} W`;
        if (powerMin > 0 && powerMax < Infinity) searchText += " - ";
        if (powerMax < Infinity) searchText += `max: ${powerMax} W`;
        searchText += ")";
    }
    document.querySelector("h3").textContent = searchText;

    // leeren & laden
    const devices = await fetchDevices();
    const resultsTable = document.getElementById("search-results");

    resultsTable.innerHTML = "";

    // filtern
    const filteredDevices = devices.filter(device => {
        const matchesSearch =
            searchQuery === "" ||
            device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            device.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
            device.room.toLowerCase().includes(searchQuery.toLowerCase()) ||
            device.category.toLowerCase().includes(searchQuery.toLowerCase());

        const devicePower = parseInt(device.power, 10) || 0; // Sicherstellen, dass es eine Zahl ist
        const matchesPower = devicePower >= powerMin && devicePower <= powerMax;

        return matchesSearch && matchesPower;
    });

    // wenn filterergbnis leer, keine geräte
    if (filteredDevices.length === 0) {
        resultsTable.innerHTML = `<tr><td colspan="6">Keine Geräte gefunden.</td></tr>`;
        return;
    }

    // tabellenzeile tr mittels filtergebnis ausgeben
    filteredDevices.forEach(device => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${device.name}</td>
            <td>${device.type}</td>
            <td>${device.power} W</td>
            <td>${device.room}</td>
            <td>${device.category}</td>
            <td>
                <button onclick="editDevice(${device.id})" class="btn-edit">Bearbeiten</button>
                <button onclick="deleteDevice(${device.id})" class="btn-delete">Löschen</button>
            </td>
        `;
        resultsTable.appendChild(row);
    });
}

// Formnularfelder ausfüllen aus ID mittels URL
async function loadEditForm() {
    const urlParams = new URLSearchParams(window.location.search);
    const deviceId = urlParams.get("id");

    if (!deviceId) {
        console.error("Keine ID in der URL gefunden.");
        return;
    }

    const devices = await fetchDevices();
    const device = devices.find(d => d.id === parseInt(deviceId));

    if (!device) {
        console.error("Gerät nicht gefunden.");
        alert("Gerät nicht gefunden.");
        return;
    }

    // Formularfelder mit Gerätedaten füllen
    document.getElementById("device-id").value = device.id;
    document.getElementById("device-name").value = device.name;
    document.getElementById("device-type").value = device.type;
    document.getElementById("device-power").value = device.power;
    document.getElementById("device-room").value = device.room;
    document.getElementById("device-category").value = device.category;
    document.getElementById("device-image").value = device.image;

    document.getElementById("form-title").textContent = "Gerät bearbeiten";
    document.getElementById("edit-btn").textContent = "bearbeiten";
}


// Detailfelder ausfüllen aus ID mittels URL
async function loadDeviceDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const deviceId = urlParams.get("id");

    if (!deviceId) {
        document.getElementById("device_title").textContent = "Kein Gerät ausgewählt.";
        return;
    }

    const device = await getDeviceById(deviceId);

    if (!device) {
        document.getElementById("device_title").textContent = "Gerät nicht gefunden.";
        return;
    }

    // Gerätedetails in die Seite einfügen
    document.getElementById("device_title").textContent = device.name;
    document.getElementById("device_image").src = device.image || "images/default.png";
    document.getElementById("typ").textContent = device.type;
    document.getElementById("power").textContent = device.power ? `${device.power} Watt` : "Unbekannt";
    document.getElementById("room").textContent = device.room;
    document.getElementById("category").textContent = device.category;

    // Bearbeiten-Link aktualisieren
    document.getElementById("edit-link").href = `edit.html?id=${device.id}`;
    document.getElementById("delete-button").setAttribute("onclick", `deleteDevice(${device.id})`);
}

// Index Container füllen
async function loadDevicesOnIndex() {
    const devices = await fetchDevices();
    const container = document.getElementById("device-container");

    if (!container) {
        console.warn("Geräteliste konnte nicht gefunden werden.");
        return;
    }

    container.innerHTML = "";

    if (devices.length === 0) {
        container.innerHTML = "<p>Keine Geräte vorhanden.</p>";
        return;
    }

    devices.forEach(device => {
        const deviceElement = document.createElement("div");
        deviceElement.classList.add("container-item");
        deviceElement.innerHTML = `
            <section class="image-section">
                <img src="${device.image || 'images/default.png'}" alt="${device.name}" aria-label="${device.name}">
            </section>
            <div class="device-info">
                <h3>${device.name}</h3>
                <p><strong>Leistung:</strong> ${device.power} W</p>
                <p><strong>Kategorie:</strong> ${device.category}</p>
                <a href="detail.html?id=${device.id}" class="btn-details">Mehr Details</a>
            </div>
        `;
        container.appendChild(deviceElement);
    });
}

// Bestätigungnachricht kontakt
function showConfirmationMessage() {
    const mainContent = document.getElementById("contact-content");
    if (!mainContent) return;

    mainContent.innerHTML = `
        <h1>Vielen Dank für Ihre Nachricht!</h1>
        <p>Wir werden uns so schnell wie möglich bei Ihnen melden.</p>
        <a href="index.html" class="contact-btn-back" >Zur Startseite</a>
    `;
}



