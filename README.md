# TerraGuard 🌍

### Local Disaster Monitoring & Alert System

TerraGuard is a web-based disaster monitoring system designed to provide **local and real-time environmental risk information** in a simple dashboard.

The system monitors **weather conditions, rainfall, landslide risk, and earthquake activity** for a selected location. Based on the collected data, TerraGuard evaluates risk levels and generates alerts for potentially dangerous conditions.

---

## 🚨 Features

* 📍 **Location-based monitoring**

  * Search and select a monitoring location.
  * Save the selected location for future visits.
  * Uses geographic coordinates for accurate weather and rainfall data.

* 🌦️ **Weather monitoring**

  * Current temperature
  * Weather condition
  * Humidity
  * Wind speed
  * Rainfall probability
  * Weather risk level

* 🌧️ **Landslide risk monitoring**

  * Analyzes rainfall data.
  * Calculates rainfall intensity and duration.
  * Generates a landslide risk score.
  * Displays risk as Safe, Moderate, High, or Critical.

* 🌎 **Earthquake monitoring**

  * Retrieves recent earthquake activity.
  * Displays earthquake magnitude and location.
  * Calculates earthquake risk based on magnitude and relevance to the selected location.

* 🚨 **Automatic disaster alerts**

  * Generates alerts when dangerous conditions are detected.
  * Supports Weather, Landslide, and Earthquake alerts.
  * Alerts can be filtered according to minimum severity.

* 🔔 **Notification preferences**

  * Enable or disable alerts for individual disaster types.
  * Configure browser notification preferences.

* 🔄 **Automatic data refresh**

  * Dashboard data is refreshed every **10 minutes**.
  * Prevents unnecessary duplicate API requests.
  * Alerts reuse the data already collected by the dashboard.

* 🗺️ **Map integration**

  * Location and geographic information can be displayed using OpenStreetMap-based services.

* 🔐 **User setup and authentication**

  * Signup and login pages.
  * Initial location and notification preference setup.

---

## 🖥️ Dashboard

The main dashboard provides an overview of the selected location:

```text
┌───────────────────────────────────────────┐
│              TerraGuard                   │
│  Dashboard | Weather | Landslide | ...    │
├───────────────────────────────────────────┤
│                                           │
│  📍 Monitoring Location                   │
│                                           │
├─────────────┬─────────────┬───────────────┤
│ 🌦 Weather  │ 🌧 Landslide│ 🌎 Earthquake │
│             │             │               │
│ Condition   │ Risk        │ Magnitude     │
│ Temperature │ Score       │ Location      │
│ Risk        │ Status      │ Risk          │
├─────────────┴─────────────┴───────────────┤
│                                           │
│              Current Weather              │
│                                           │
├───────────────────────────────────────────┤
│              Recent Alerts                │
│                                           │
└───────────────────────────────────────────┘
```

---

## ⚙️ How It Works

```text
User selects a location
          ↓
Location is converted into coordinates
          ↓
TerraGuard requests environmental data
          ↓
┌─────────────┬──────────────┬──────────────┐
│   Weather   │   Rainfall   │  Earthquake  │
│    Data     │    Data      │     Data     │
└─────────────┴──────────────┴──────────────┘
          ↓
Risk calculation
          ↓
┌─────────────┬──────────────┬──────────────┐
│   Weather   │   Landslide  │  Earthquake  │
│     Risk    │     Risk     │     Risk     │
└─────────────┴──────────────┴──────────────┘
          ↓
Alert generation
          ↓
Dashboard displays current conditions
          ↓
Automatic refresh after 10 minutes
```

---

## 🧠 Risk Assessment

TerraGuard uses rule-based risk assessment rather than requiring a machine-learning model.

### Weather

Weather alerts are generated when conditions cross predefined thresholds such as:

* High rainfall probability
* Heavy precipitation
* Strong wind

### Landslide

Landslide risk is calculated using rainfall-related factors such as:

* Rainfall intensity
* Rainfall duration
* Heavy rainfall events
* Prolonged rainfall

The calculated score is converted into a risk level:

| Risk Level | Description                                     |
| ---------- | ----------------------------------------------- |
| Safe       | No significant risk detected                    |
| Moderate   | Conditions require attention                    |
| High       | Potentially dangerous conditions                |
| Critical   | Severe conditions requiring immediate attention |

### Earthquake

Earthquake risk considers factors including:

* Earthquake magnitude
* Distance/relevance to the monitored location
* Recent earthquake activity

---

## 🔌 APIs & External Services

TerraGuard uses publicly available services and APIs for collecting environmental and geographic data.

| Service                 | Purpose                        |
| ----------------------- | ------------------------------ |
| **Open-Meteo**          | Weather and precipitation data |
| **USGS Earthquake API** | Recent earthquake information  |
| **Nominatim**           | Location search and geocoding  |
| **OpenStreetMap**       | Geographic/map data            |

Additional government datasets and disaster-related APIs can be integrated in future versions.

---

## 🛠️ Technologies Used

### Frontend

* HTML5
* CSS3
* JavaScript
* Tailwind CSS
* Font Awesome

### APIs & Data

* Open-Meteo API
* USGS Earthquake API
* Nominatim Geocoding API
* OpenStreetMap

### Storage

* Browser LocalStorage

### Development Tools

* Visual Studio Code
* Git
* GitHub
* Browser Developer Tools

---

## 📁 Project Structure

```text
TerraGuard/
│
├── index.html
│
├── css/
│   ├── style.css
│   ├── components.css
│   └── auth.css
│
├── js/
│   ├── utils.js
│   ├── main.js
│   ├── weather.js
│   ├── landslide.js
│   ├── earthquake.js
│   ├── alerts.js
│   └── map.js
│
├── pages/
│   ├── weather.html
│   ├── landslide.html
│   ├── earthquake.html
│   ├── map.html
│   ├── login.html
│   ├── signup.html
│   └── setup.html
│
└── README.md
```

---

## 🔄 Data Refresh System

The dashboard automatically refreshes monitoring data every **10 minutes**.

Instead of allowing every module to independently request the same data, the dashboard collects the required data once and passes it to the alert system.

```text
Dashboard
    │
    ├── Weather API ────────┐
    │                       │
    ├── Rainfall API ───────┤
    │                       ↓
    └── Earthquake API ──→ Dashboard Data
                              │
                              ↓
                         Alert System
```

This reduces unnecessary API requests and prevents duplicate data fetching.

---

## 🔔 Alert System

TerraGuard currently supports three major alert categories:

### 🌦 Weather Alerts

Examples:

* Heavy Rainfall Warning
* Heavy Rainfall Detected
* Strong Wind Warning

### 🌧 Landslide Alerts

Examples:

* Moderate Landslide Risk
* High Landslide Risk
* Critical Landslide Risk
* Heavy Rainfall / Prolonged Rainfall warnings

### 🌎 Earthquake Alerts

Examples:

* Significant Earthquake Detected
* Moderate Earthquake Risk
* High Earthquake Risk
* Critical Earthquake Risk

Alerts can be filtered according to the user's selected minimum severity.

---

## 💾 Local Storage

TerraGuard uses browser LocalStorage to maintain information between sessions.

Stored information can include:

* Selected monitoring location
* Latitude and longitude
* Location information
* Notification preferences
* Setup completion status
* Alert notification history

No external database is currently required for the frontend prototype.

---

## 🚀 Running the Project

### 1. Clone the repository

```bash
git clone <repository-url>
```

### 2. Open the project

```bash
cd TerraGuard
```

### 3. Run using a local web server

For example, using VS Code with **Live Server**:

```text
Open index.html
        ↓
Right Click
        ↓
Open with Live Server
```

A local server is recommended instead of opening the HTML files directly with `file://`.

---

## 🌐 Browser Requirements

TerraGuard works best on modern browsers such as:

* Google Chrome
* Microsoft Edge
* Brave
* Firefox

JavaScript and browser notifications should be enabled for the full experience.

---

## 🔮 Future Improvements

The current version is a functional prototype. Possible future improvements include:

* 🤖 Machine-learning based disaster prediction
* 📱 Progressive Web App (PWA) support
* 📲 SMS and WhatsApp notifications
* 📧 Email alerts
* 🛰️ Integration with additional government disaster datasets
* 🗺️ Real-time disaster visualization on maps
* 📊 Historical weather and disaster analytics
* 👥 Multi-user backend authentication
* 🗄️ Database integration
* 📈 Risk prediction using historical data
* 🚨 More advanced local disaster warning mechanisms
* ☁️ Cloud deployment
* 📍 More accurate location-specific risk calculations

---

## 🎯 Project Objective

The main objective of TerraGuard is to make disaster-related information **local, understandable, and actionable**.

Instead of simply displaying raw environmental data, TerraGuard processes the data and converts it into understandable risk levels and alerts so that users can quickly understand whether their selected area may be experiencing potentially dangerous conditions.

---

## 👨‍💻 Project Type

**Academic Mini Project**

**Domain:**
Web Development • Disaster Management • Environmental Monitoring

**Development Approach:**
Frontend-based monitoring system with API integration and rule-based risk assessment.

---

## 📌 Current Status

```text
✅ Weather monitoring
✅ Rainfall monitoring
✅ Landslide risk calculation
✅ Earthquake monitoring
✅ Disaster alert generation
✅ Location search
✅ Notification preferences
✅ User setup
✅ Authentication interface
✅ Automatic 10-minute refresh
✅ Duplicate API request prevention
🔄 Map functionality
🔄 Advanced notifications
🔄 Backend integration
🔄 Machine-learning prediction
```

---

## 📜 License

This project is developed for educational and academic purposes.

You are free to modify and extend the project for learning and experimentation.

