const terraGuardSetupConfig = {
    nominatimUrl: "https://nominatim.openstreetmap.org/search",
    storageKeys: {
        location: "terraGuardLocation",
        latitude: "terraGuardLatitude",
        longitude: "terraGuardLongitude",
        locationData: "terraGuardLocationData",
        preferences: "terraGuardAlertPreferences",
        setupComplete: "terraGuardSetupComplete"
    },
    searchDelay: 400
};

let setupState = {
    currentStep: 1,
    selectedLocation: null,
    searchTimer: null
};

function getSetupElement(id) {
    return document.getElementById(id);
}

function escapeHTML(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
}

function showSetupError(message) {
    const errorBox = getSetupElement("location-error");

    if (!errorBox) return;

    errorBox.textContent = message;
    errorBox.classList.remove("hidden");
}

function hideSetupError() {
    const errorBox = getSetupElement("location-error");

    if (!errorBox) return;

    errorBox.textContent = "";
    errorBox.classList.add("hidden");
}

function showFinalSetupError(message) {
    const errorBox = getSetupElement("setup-error");

    if (!errorBox) return;

    errorBox.textContent = message;
    errorBox.classList.remove("hidden");
}

function hideFinalSetupError() {
    const errorBox = getSetupElement("setup-error");

    if (!errorBox) return;

    errorBox.textContent = "";
    errorBox.classList.add("hidden");
}

async function searchSetupLocations(query) {
    const suggestionsBox = getSetupElement(
        "setup-location-suggestions"
    );

    if (!suggestionsBox) return;

    if (!query || query.trim().length < 2) {
        suggestionsBox.innerHTML = "";
        suggestionsBox.classList.add("hidden");
        return;
    }

    suggestionsBox.classList.remove("hidden");
    suggestionsBox.innerHTML =
        `<div class="px-4 py-3 text-sm text-gray-500">Searching locations...</div>`;

    try {
        const params = new URLSearchParams({
            q: query.trim(),
            format: "jsonv2",
            addressdetails: "1",
            limit: "5",
            countrycodes: "in",
            "accept-language": "en"
        });

        const response = await fetch(
            `${terraGuardSetupConfig.nominatimUrl}?${params.toString()}`,
            {
                headers: {
                    Accept: "application/json"
                }
            }
        );

        if (!response.ok) {
            throw new Error("Location search failed.");
        }

        const results = await response.json();

        if (!results.length) {
            suggestionsBox.innerHTML =
                `<div class="px-4 py-3 text-sm text-gray-500">No locations found in India.</div>`;

            return;
        }

        renderSetupSuggestions(results);
    } catch (error) {
        console.error(
            "TerraGuard location search error:",
            error
        );

        suggestionsBox.innerHTML =
            `<div class="px-4 py-3 text-sm text-red-600">Unable to search locations. Please try again.</div>`;
    }
}

function renderSetupSuggestions(results) {
    const suggestionsBox = getSetupElement(
        "setup-location-suggestions"
    );

    if (!suggestionsBox) return;

    suggestionsBox.innerHTML = results
        .map((result, index) => {
            const name =
                result.name ||
                result.address?.city ||
                result.address?.town ||
                result.address?.village ||
                result.display_name?.split(",")[0] ||
                "Unknown location";

            const displayName =
                result.display_name || name;

            return `
                <button
                    type="button"
                    class="setup-location-suggestion w-full text-left px-4 py-3 hover:bg-[#fefae0] transition border-b border-gray-100 last:border-b-0"
                    data-location-index="${index}"
                >
                    <div class="flex items-start gap-3">
                        <div class="mt-1 text-[#606c38]">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                        </div>

                        <div class="min-w-0">
                            <p class="font-medium text-[#283618] truncate">
                                ${escapeHTML(name)}
                            </p>

                            <p class="text-xs text-gray-500 mt-1 line-clamp-2">
                                ${escapeHTML(displayName)}
                            </p>
                        </div>
                    </div>
                </button>
            `;
        })
        .join("");

    suggestionsBox.classList.remove("hidden");

    suggestionsBox
        .querySelectorAll(".setup-location-suggestion")
        .forEach(button => {
            button.addEventListener("click", () => {
                const index =
                    Number(button.dataset.locationIndex);

                selectSetupLocation(results[index]);
            });
        });
}

function selectSetupLocation(result) {
    if (!result) return;

    const latitude = Number(result.lat);
    const longitude = Number(result.lon);

    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
    ) {
        showSetupError("Invalid location coordinates.");
        return;
    }

    const address = result.address || {};

    const locationName =
        result.name ||
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        address.county ||
        result.display_name?.split(",")[0] ||
        "Selected Location";

    setupState.selectedLocation = {
        name: locationName,
        latitude,
        longitude,
        displayName:
            result.display_name || locationName,
        osmType: result.type || "",
        osmId: result.osm_id || "",
        address
    };

    hideSetupError();

    const input = getSetupElement(
        "setup-location-input"
    );

    if (input) {
        input.value = locationName;
    }

    const suggestionsBox = getSetupElement(
        "setup-location-suggestions"
    );

    if (suggestionsBox) {
        suggestionsBox.innerHTML = "";
        suggestionsBox.classList.add("hidden");
    }

    displaySelectedLocation();
    updateContinueButton();
}

function displaySelectedLocation() {
    const location = setupState.selectedLocation;

    if (!location) return;

    const nameElement = getSetupElement(
        "selected-location-name"
    );

    const addressElement = getSetupElement(
        "selected-location-address"
    );

    const latitudeElement = getSetupElement(
        "selected-location-latitude"
    );

    const longitudeElement = getSetupElement(
        "selected-location-longitude"
    );

    if (nameElement) {
        nameElement.textContent = location.name;
    }

    if (addressElement) {
        addressElement.textContent = location.displayName;
    }

    if (latitudeElement) {
        latitudeElement.textContent =
            location.latitude.toFixed(6);
    }

    if (longitudeElement) {
        longitudeElement.textContent =
            location.longitude.toFixed(6);
    }

    const locationCard = document.querySelector(
        "[data-selected-location]"
    );

    if (locationCard) {
        locationCard.classList.remove("hidden");
    }
}

function updateContinueButton() {
    const button = getSetupElement(
        "location-continue-button"
    );

    if (!button) return;

    button.disabled = !setupState.selectedLocation;

    if (setupState.selectedLocation) {
        button.classList.remove(
            "opacity-50",
            "cursor-not-allowed"
        );
    } else {
        button.classList.add(
            "opacity-50",
            "cursor-not-allowed"
        );
    }
}

function showStep(step) {
    setupState.currentStep = step;

    const locationStep = document.querySelector(
        "[data-setup-step='location']"
    );

    const alertsStep = document.querySelector(
        "[data-setup-step='alerts']"
    );

    if (locationStep) {
        locationStep.classList.toggle(
            "hidden",
            step !== 1
        );
    }

    if (alertsStep) {
        alertsStep.classList.toggle(
            "hidden",
            step !== 2
        );
    }

    updateStepIndicator(step);
}

function updateStepIndicator(step) {
    document
        .querySelectorAll("[data-step-indicator]")
        .forEach(indicator => {
            const indicatorStep = Number(
                indicator.dataset.stepIndicator
            );

            const circle = indicator.querySelector(
                "[data-step-circle]"
            );

            const label = indicator.querySelector(
                "[data-step-label]"
            );

            if (indicatorStep === step) {
                circle?.classList.remove(
                    "bg-gray-200",
                    "text-gray-500"
                );

                circle?.classList.add(
                    "bg-[#606c38]",
                    "text-white"
                );

                label?.classList.remove(
                    "text-gray-400"
                );

                label?.classList.add(
                    "text-[#283618]",
                    "font-semibold"
                );
            } else if (indicatorStep < step) {
                circle?.classList.remove(
                    "bg-gray-200",
                    "text-gray-500"
                );

                circle?.classList.add(
                    "bg-[#283618]",
                    "text-white"
                );

                label?.classList.remove(
                    "text-gray-400"
                );

                label?.classList.add(
                    "text-[#283618]"
                );
            } else {
                circle?.classList.remove(
                    "bg-[#606c38]",
                    "bg-[#283618]",
                    "text-white"
                );

                circle?.classList.add(
                    "bg-gray-200",
                    "text-gray-500"
                );

                label?.classList.remove(
                    "text-[#283618]",
                    "font-semibold"
                );

                label?.classList.add(
                    "text-gray-400"
                );
            }
        });
}

function saveSetupLocation() {
    const location = setupState.selectedLocation;

    if (!location) return false;

    localStorage.setItem(
        terraGuardSetupConfig.storageKeys.location,
        location.name
    );

    localStorage.setItem(
        terraGuardSetupConfig.storageKeys.latitude,
        String(location.latitude)
    );

    localStorage.setItem(
        terraGuardSetupConfig.storageKeys.longitude,
        String(location.longitude)
    );

    localStorage.setItem(
        terraGuardSetupConfig.storageKeys.locationData,
        JSON.stringify(location)
    );

    return true;
}

function getSetupAlertPreferences() {
    const weather = getSetupElement("weather-alerts");
    const landslide = getSetupElement("landslide-alerts");
    const earthquake = getSetupElement(
        "earthquake-alerts"
    );

    const browser = getSetupElement(
        "browser-notifications"
    );

    const email = getSetupElement(
        "email-notifications"
    );

    const severity = document.querySelector(
        'input[name="alert_severity"]:checked'
    );

    return {
        weather: weather ? weather.checked : true,
        landslide: landslide ? landslide.checked : true,
        earthquake: earthquake
            ? earthquake.checked
            : true,
        minimumSeverity: severity
            ? severity.value
            : "High",
        browser: browser
            ? browser.checked
            : true,
        email: email
            ? email.checked
            : false
    };
}

async function requestBrowserNotificationPermission() {
    const browserToggle = getSetupElement(
        "browser-notifications"
    );

    if (!browserToggle || !browserToggle.checked) {
        return;
    }

    if (typeof Notification === "undefined") {
        console.warn(
            "Browser notifications are not supported."
        );

        return;
    }

    if (Notification.permission === "default") {
        try {
            await Notification.requestPermission();
        } catch (error) {
            console.warn(
                "Notification permission request failed:",
                error
            );
        }
    }
}

async function saveSetupPreferences() {
    const preferences =
        getSetupAlertPreferences();

    localStorage.setItem(
        terraGuardSetupConfig.storageKeys.preferences,
        JSON.stringify(preferences)
    );

    return preferences;
}

async function finishSetup() {
    hideFinalSetupError();

    if (!setupState.selectedLocation) {
        showFinalSetupError(
            "Please select a monitoring location first."
        );

        showStep(1);
        return;
    }

    const button = getSetupElement(
        "finish-setup-button"
    );

    if (button) {
        button.disabled = true;

        button.classList.add(
            "opacity-70",
            "cursor-wait"
        );

        button.dataset.originalText =
            button.textContent;

        button.textContent = "Saving setup...";
    }

    try {
        const locationSaved =
            saveSetupLocation();

        if (!locationSaved) {
            throw new Error(
                "Unable to save monitoring location."
            );
        }

        await saveSetupPreferences();
        await requestBrowserNotificationPermission();

        localStorage.setItem(
            terraGuardSetupConfig.storageKeys.setupComplete,
            "true"
        );

        await new Promise(resolve =>
            setTimeout(resolve, 500)
        );

        window.location.href = "../index.html";
    } catch (error) {
        console.error(
            "TerraGuard setup error:",
            error
        );

        showFinalSetupError(
            "Something went wrong while saving your setup. Please try again."
        );

        if (button) {
            button.disabled = false;

            button.classList.remove(
                "opacity-70",
                "cursor-wait"
            );

            button.textContent =
                button.dataset.originalText ||
                "Finish Setup";
        }
    }
}

function setupLocationSearch() {
    const input = getSetupElement(
        "setup-location-input"
    );

    if (!input) return;

    input.addEventListener("input", () => {
        const query = input.value.trim();

        setupState.selectedLocation = null;

        const locationCard = document.querySelector(
            "[data-selected-location]"
        );

        if (locationCard) {
            locationCard.classList.add("hidden");
        }

        updateContinueButton();
        hideSetupError();

        clearTimeout(setupState.searchTimer);

        setupState.searchTimer = setTimeout(
            () => searchSetupLocations(query),
            terraGuardSetupConfig.searchDelay
        );
    });

    input.addEventListener("focus", () => {
        const query = input.value.trim();

        if (query.length >= 2) {
            searchSetupLocations(query);
        }
    });
}

function setupOutsideClickHandler() {
    document.addEventListener("click", event => {
        const input = getSetupElement(
            "setup-location-input"
        );

        const suggestions = getSetupElement(
            "setup-location-suggestions"
        );

        if (!input || !suggestions) return;

        if (
            event.target !== input &&
            !suggestions.contains(event.target)
        ) {
            suggestions.classList.add("hidden");
        }
    });
}

function setupLocationContinue() {
    const button = getSetupElement(
        "location-continue-button"
    );

    if (!button) return;

    button.addEventListener("click", () => {
        if (!setupState.selectedLocation) {
            showSetupError(
                "Please select a location from the search results."
            );

            return;
        }

        hideSetupError();
        showStep(2);
    });
}

function setupBackButton() {
    const button = getSetupElement(
        "back-to-location-button"
    );

    if (!button) return;

    button.addEventListener("click", () => {
        hideFinalSetupError();
        showStep(1);
    });
}

function setupFinishButton() {
    const button = getSetupElement(
        "finish-setup-button"
    );

    if (!button) return;

    button.addEventListener(
        "click",
        finishSetup
    );
}

function setupKeyboardSupport() {
    const input = getSetupElement(
        "setup-location-input"
    );

    if (!input) return;

    input.addEventListener("keydown", event => {
        if (event.key !== "Enter") return;

        event.preventDefault();

        const firstSuggestion = document.querySelector(
            ".setup-location-suggestion"
        );

        if (firstSuggestion) {
            firstSuggestion.click();
        }
    });
}

function initializeSetup() {
    console.log(
        "TerraGuard setup initialized."
    );

    setupLocationSearch();
    setupOutsideClickHandler();
    setupLocationContinue();
    setupBackButton();
    setupFinishButton();
    setupKeyboardSupport();
    updateContinueButton();
    showStep(1);
}

window.TerraGuardSetup = {
    getState: () => setupState,
    getSelectedLocation: () =>
        setupState.selectedLocation,
    getAlertPreferences:
        getSetupAlertPreferences,
    saveLocation: saveSetupLocation,
    savePreferences: saveSetupPreferences,
    finish: finishSetup
};

document.addEventListener(
    "DOMContentLoaded",
    initializeSetup
);