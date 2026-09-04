const terraGuardAuthConfig = {
    demoMode: true,
    storageKeys: {
        user: "terraGuardUser",
        loggedIn: "terraGuardLoggedIn",
        rememberMe: "terraGuardRememberMe"
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

function setupPasswordToggle(buttonId, inputId) {
    const button = document.getElementById(buttonId);
    const input = document.getElementById(inputId);

    if (!button || !input) return;

    button.addEventListener("click", () => {
        const isPassword = input.type === "password";

        input.type = isPassword ? "text" : "password";
        button.textContent = isPassword ? "🙈" : "👁️";
        button.setAttribute(
            "aria-label",
            isPassword ? "Hide password" : "Show password"
        );
    });
}

function showMessage(elementId, message) {
    const element = document.getElementById(elementId);

    if (!element) return;

    element.textContent = message;
    element.classList.remove("hidden");
}

function hideMessage(elementId) {
    const element = document.getElementById(elementId);

    if (!element) return;

    element.textContent = "";
    element.classList.add("hidden");
}

function setButtonLoading(buttonId, textId, loading) {
    const button = document.getElementById(buttonId);
    const text = document.getElementById(textId);

    if (!button || !text) return;

    if (loading) {
        button.disabled = true;
        button.classList.add("opacity-70", "cursor-not-allowed");
        text.textContent = "Please wait...";
    } else {
        button.disabled = false;
        button.classList.remove("opacity-70", "cursor-not-allowed");
        text.textContent =
            buttonId === "login-button"
                ? "Sign in"
                : "Create account";
    }
}

async function handleLogin(event) {
    event.preventDefault();

    hideMessage("login-error");

    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value;
    const rememberMe =
        document.getElementById("remember-me")?.checked || false;

    if (!email || !password) {
        showMessage(
            "login-error",
            "Please enter your email address and password."
        );
        return;
    }

    if (!isValidEmail(email)) {
        showMessage(
            "login-error",
            "Please enter a valid email address."
        );
        return;
    }

    setButtonLoading("login-button", "login-button-text", true);

    try {
        if (terraGuardAuthConfig.demoMode) {
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

            localStorage.setItem(
                terraGuardAuthConfig.storageKeys.rememberMe,
                rememberMe ? "true" : "false"
            );

            const setupComplete =
                localStorage.getItem("terraGuardSetupComplete") === "true";

            window.location.href = setupComplete
                ? "../index.html"
                : "setup.html";

            return;
        }

        throw new Error(
            "Backend authentication has not been connected yet."
        );
    } catch (error) {
        console.error("TerraGuard Login Error:", error);

        showMessage(
            "login-error",
            error.message || "Unable to sign in. Please try again."
        );

        setButtonLoading("login-button", "login-button-text", false);
    }
}

async function handleSignup(event) {
    event.preventDefault();

    hideMessage("signup-error");
    hideMessage("signup-success");

    const name = document.getElementById("name")?.value.trim();
    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value;
    const confirmPassword =
        document.getElementById("confirm-password")?.value;

    if (!name) {
        showMessage("signup-error", "Please enter your full name.");
        return;
    }

    if (name.length < 2) {
        showMessage("signup-error", "Please enter a valid name.");
        return;
    }

    if (!email) {
        showMessage(
            "signup-error",
            "Please enter your email address."
        );
        return;
    }

    if (!isValidEmail(email)) {
        showMessage(
            "signup-error",
            "Please enter a valid email address."
        );
        return;
    }

    if (!password) {
        showMessage("signup-error", "Please create a password.");
        return;
    }

    if (password.length < 8) {
        showMessage(
            "signup-error",
            "Password must contain at least 8 characters."
        );
        return;
    }

    if (password !== confirmPassword) {
        showMessage(
            "signup-error",
            "Passwords do not match."
        );
        return;
    }

    setButtonLoading("signup-button", "signup-button-text", true);

    try {
        if (terraGuardAuthConfig.demoMode) {
            await delay(700);

            const newUser = {
                id: "user-" + Date.now(),
                name,
                email
            };

            saveAuthUser(newUser);
            setLoggedIn(true);

            localStorage.removeItem("terraGuardSetupComplete");

            showMessage(
                "signup-success",
                "Account created successfully! Setting up your TerraGuard profile..."
            );

            await delay(900);

            window.location.href = "setup.html";

            return;
        }

        throw new Error(
            "Backend registration has not been connected yet."
        );
    } catch (error) {
        console.error("TerraGuard Signup Error:", error);

        showMessage(
            "signup-error",
            error.message ||
                "Unable to create your account. Please try again."
        );

        setButtonLoading("signup-button", "signup-button-text", false);
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

    window.location.href = "pages/login.html";
}

function requireLogin() {
    if (!isLoggedIn()) {
        window.location.href = "pages/login.html";
        return false;
    }

    return true;
}

function handleForgotPassword(event) {
    event.preventDefault();

    alert(
        "Password reset will be available once the TerraGuard backend is connected."
    );
}

function initializeLoginPage() {
    const form = document.getElementById("login-form");

    if (!form) return;

    form.addEventListener("submit", handleLogin);

    setupPasswordToggle("toggle-password", "password");

    const forgotPassword =
        document.getElementById("forgot-password");

    if (forgotPassword) {
        forgotPassword.addEventListener(
            "click",
            handleForgotPassword
        );
    }
}

function initializeSignupPage() {
    const form = document.getElementById("signup-form");

    if (!form) return;

    form.addEventListener("submit", handleSignup);

    setupPasswordToggle("toggle-password", "password");
    setupPasswordToggle(
        "toggle-confirm-password",
        "confirm-password"
    );
}

function initializeAuth() {
    const currentPage = getCurrentAuthPage();

    if (currentPage === "login") {
        initializeLoginPage();
    }

    if (currentPage === "signup") {
        initializeSignupPage();
    }
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