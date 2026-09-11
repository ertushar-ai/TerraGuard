const terraGuardAuthConfig = {
    demoMode: !window.TERRAGUARD_API_BASE,
    storageKeys: {
        user: "terraGuardUser",
        loggedIn: "terraGuardLoggedIn",
        rememberMe: "terraGuardRememberMe",
        accessToken: "terraGuardAccessToken"
    }
};

function saveAuthUser(user) {
    localStorage.setItem(
        terraGuardAuthConfig.storageKeys.user,
        JSON.stringify(user)
    );
}

function getAuthUser() {
    const user = localStorage.getItem(
        terraGuardAuthConfig.storageKeys.user
    );

    if (!user) return null;

    try {
        return JSON.parse(user);
    } catch (error) {
        console.error("TerraGuard: Unable to read saved user.", error);
        return null;
    }
}

function setLoggedIn(status) {
    localStorage.setItem(
        terraGuardAuthConfig.storageKeys.loggedIn,
        status ? "true" : "false"
    );
}

function isLoggedIn() {
    if (localStorage.getItem(terraGuardAuthConfig.storageKeys.accessToken)) {
        return true;
    }

    return localStorage.getItem(
        terraGuardAuthConfig.storageKeys.loggedIn
    ) === "true";
}

function getCurrentAuthPage() {
    const path = window.location.pathname.toLowerCase();

    if (path.includes("signup")) return "signup";
    if (path.includes("login")) return "login";

    return null;
}

function getLoginUrl() {
    const path = window.location.pathname.toLowerCase();

    if (path.includes("/pages/")) {
        return "login.html";
    }

    return "pages/login.html";
}

function getDashboardUrl() {
    const path = window.location.pathname.toLowerCase();

    if (path.includes("/pages/")) {
        return "../index.html";
    }

    return "index.html";
}

function getSetupUrl() {
    const path = window.location.pathname.toLowerCase();

    if (path.includes("/pages/")) {
        return "setup.html";
    }

    return "pages/setup.html";
}

function showAuthMessage(elementId, message, type = "error") {
    const element = document.getElementById(elementId);

    if (!element) return;

    element.textContent = message;
    element.className = `auth-message ${type}`;
    element.style.display = message ? "block" : "none";
}

function hideAuthMessage(elementId) {
    showAuthMessage(elementId, "", "error");
}

function setSubmitLoading(form, loading, defaultText) {
    const button = form?.querySelector(".auth-submit");

    if (!button) return;

    if (loading) {
        button.disabled = true;

        if (!button.dataset.originalText) {
            button.dataset.originalText = button.textContent;
        }

        button.textContent = "Please wait...";
    } else {
        button.disabled = false;
        button.textContent =
            button.dataset.originalText || defaultText;
    }
}

async function apiRequest(path, options = {}) {
    const defaultBase = window.location.hostname
        ? `${window.location.protocol}//${window.location.hostname}:8000/api`
        : "http://127.0.0.1:8000/api";
    const base = window.TERRAGUARD_API_BASE || defaultBase;

    const headers = {
        ...(options.headers || {})
    };

    if (options.body && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    const token = localStorage.getItem(
        terraGuardAuthConfig.storageKeys.accessToken
    );

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${base}${path}`, {
        ...options,
        headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.detail ||
                `Request failed (${response.status})`
        );
    }

    return data;
}

function persistAuthSession(data, rememberMe = false) {
    if (data.access_token) {
        localStorage.setItem(
            terraGuardAuthConfig.storageKeys.accessToken,
            data.access_token
        );
    }

    if (data.user) {
        saveAuthUser(data.user);
    }

    setLoggedIn(true);

    localStorage.setItem(
        terraGuardAuthConfig.storageKeys.rememberMe,
        rememberMe ? "true" : "false"
    );
}

async function loginWithApi(email, password) {
    const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
    });

    persistAuthSession(data);
    return data;
}

async function signupWithApi(name, email, password) {
    const data = await apiRequest("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name, email, password })
    });

    persistAuthSession(data);
    return data;
}

async function handleLogin(event) {
    event.preventDefault();

    const form = event.currentTarget;

    hideAuthMessage("login-message");

    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value;

    if (!email || !password) {
        showAuthMessage(
            "login-message",
            "Please enter your email address and password.",
            "error"
        );
        return;
    }

    if (!isValidEmail(email)) {
        showAuthMessage(
            "login-message",
            "Please enter a valid email address.",
            "error"
        );
        return;
    }

    setSubmitLoading(form, true, "Login");

    try {
        if (!terraGuardAuthConfig.demoMode) {
            await loginWithApi(email, password);
        } else {
            await delay(700);

            const demoUser = {
                id: "demo-user",
                name: email
                    .split("@")[0]
                    .replace(/[._-]/g, " "),
                email
            };

            saveAuthUser(demoUser);
            setLoggedIn(true);
        }

        const setupComplete =
            localStorage.getItem("terraGuardSetupComplete") === "true";

        window.location.href = setupComplete
            ? getDashboardUrl()
            : getSetupUrl();
    } catch (error) {
        console.error("TerraGuard Login Error:", error);

        showAuthMessage(
            "login-message",
            error.message || "Unable to sign in. Please try again.",
            "error"
        );

        setSubmitLoading(form, false, "Login");
    }
}

async function handleSignup(event) {
    event.preventDefault();

    const form = event.currentTarget;

    hideAuthMessage("signup-message");

    const name = document.getElementById("name")?.value.trim();
    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value;
    const confirmPassword =
        document.getElementById("confirm-password")?.value;

    if (!name) {
        showAuthMessage(
            "signup-message",
            "Please enter your full name.",
            "error"
        );
        return;
    }

    if (name.length < 2) {
        showAuthMessage(
            "signup-message",
            "Please enter a valid name.",
            "error"
        );
        return;
    }

    if (!email) {
        showAuthMessage(
            "signup-message",
            "Please enter your email address.",
            "error"
        );
        return;
    }

    if (!isValidEmail(email)) {
        showAuthMessage(
            "signup-message",
            "Please enter a valid email address.",
            "error"
        );
        return;
    }

    if (!password) {
        showAuthMessage(
            "signup-message",
            "Please create a password.",
            "error"
        );
        return;
    }

    if (password.length < 8) {
        showAuthMessage(
            "signup-message",
            "Password must contain at least 8 characters.",
            "error"
        );
        return;
    }

    if (password !== confirmPassword) {
        showAuthMessage(
            "signup-message",
            "Passwords do not match.",
            "error"
        );
        return;
    }

    setSubmitLoading(form, true, "Create Account");

    try {
        if (!terraGuardAuthConfig.demoMode) {
            await signupWithApi(name, email, password);
        } else {
            await delay(700);

            const newUser = {
                id: "user-" + Date.now(),
                name,
                email
            };

            saveAuthUser(newUser);
            setLoggedIn(true);
        }

        localStorage.removeItem("terraGuardSetupComplete");

        showAuthMessage(
            "signup-message",
            "Account created successfully! Setting up your TerraGuard profile...",
            "success"
        );

        await delay(900);

        window.location.href = getSetupUrl();
    } catch (error) {
        console.error("TerraGuard Signup Error:", error);

        showAuthMessage(
            "signup-message",
            error.message ||
                "Unable to create your account. Please try again.",
            "error"
        );

        setSubmitLoading(form, false, "Create Account");
    }
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function delay(milliseconds) {
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}

function logout() {
    localStorage.removeItem(
        terraGuardAuthConfig.storageKeys.loggedIn
    );

    localStorage.removeItem(
        terraGuardAuthConfig.storageKeys.user
    );

    localStorage.removeItem(
        terraGuardAuthConfig.storageKeys.rememberMe
    );

    localStorage.removeItem(
        terraGuardAuthConfig.storageKeys.accessToken
    );

    window.location.href = getLoginUrl();
}

function requireLogin() {
    if (!isLoggedIn()) {
        window.location.href = getLoginUrl();
        return false;
    }

    return true;
}

function initializeLoginPage() {
    const form = document.getElementById("login-form");

    if (!form) return;

    form.addEventListener("submit", handleLogin);
}

function initializeSignupPage() {
    const form = document.getElementById("signup-form");

    if (!form) return;

    form.addEventListener("submit", handleSignup);
}

function initializeLogoutButtons() {
    document
        .querySelectorAll("[data-action='logout'], #logout-button")
        .forEach(button => {
            button.addEventListener("click", event => {
                event.preventDefault();
                logout();
            });
        });
}

function initializeAuth() {
    const currentPage = getCurrentAuthPage();

    if (currentPage === "login") {
        initializeLoginPage();
    }

    if (currentPage === "signup") {
        initializeSignupPage();
    }

    initializeLogoutButtons();
}

window.TerraGuardAuth = {
    initialize: initializeAuth,
    login: handleLogin,
    signup: handleSignup,
    logout,
    isLoggedIn,
    requireLogin,
    getUser: getAuthUser
};

document.addEventListener("DOMContentLoaded", initializeAuth);
