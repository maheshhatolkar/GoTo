# AR Wayfinding Navigator 🧭

A modern, web-based augmented reality (AR) indoor and campus navigation system. By combining QR code scanning with orientation tracking and audio directions, the application provides real-time waypoint guidance directly in the mobile browser.

---

## 🚀 Key Features

*   **Augmented Reality Guidance:** Real-time pathfinding arrows and distance badges dynamically overlaid on the live camera stream.
*   **Intelligent Pathfinding:** Dijkstra-based shortest-path calculations across local campus nodes.
*   **Dual Scan Options:** Supports camera-based QR code scanning or manual location ID input.
*   **Voice-Guided Turn-by-Turn:** Integrated speech synthesis prompts guiding the user on when to turn or advance.
*   **Built-in QR Generator:** Access utility views inside the app to generate and save location QR codes instantly.
*   **Cross-OS Mobile Compatibility:** Supports Android Chrome and iOS Safari via tailored compass orientation routines.

---

## 🛠️ Technology Stack

*   **Core Logic:** Vanilla ES6 JavaScript & HTML5
*   **Styles:** Responsive CSS3 with premium glassmorphic UI, high-contrast dark themes, and smooth micro-animations.
*   **QR Scanner Library:** [html5-qrcode](https://github.com/mebjas/html5-qrcode) (accessed via CDN)
*   **QR Generator Library:** [qrcodejs](https://github.com/davidshimjs/qrcodejs) (accessed via CDN)

---

## 📂 File Structure

```text
├── index.html               # Mounting target & template configuration
├── package.json             # NPM dependencies & scripts list
├── vite.config.js           # Vite development server settings
├── jsconfig.json            # IDE configuration settings
├── manifest.json            # PWA configurations
├── src/
│   ├── main.jsx             # React application bootstrapping entry point
│   ├── App.jsx              # Core React view manager and state coordinator
│   ├── index.css            # Glassmorphism styling rules & layout settings
│   ├── components/
│   │   ├── Splash.jsx       # Welcome splash screen UI
│   │   ├── QRScanner.jsx    # QR scanner UI & manual ID form fallback
│   │   ├── DestinationSelect.jsx # Mapped waypoint select dropdown & search list
│   │   ├── ARNavigation.jsx # Overlay AR guidance canvas container
│   │   └── QRGenerator.jsx  # Printable location QR code cards grid
│   └── utils/
│       ├── locationGraph.js # Dijkstra pathfinder & location coordinates database
│       ├── compass.js       # Abstracted mobile orientation sensor tracker
│       ├── arRenderer.js    # Canvas rendering loop overlays engine
│       ├── audioGuide.js    # Speech synthesis announcer wrapper
│       └── qrScanner.js     # External camera scanner lifecycle wrapper
```

---

## 📱 Mobile OS Support

The application is built on web standards and is optimized for the following mobile configurations:

| Mobile OS | Browser | Orientation Handling | Hardware Access |
| :--- | :--- | :--- | :--- |
| **Android** | Google Chrome | Uses absolute device orientation (`deviceorientationabsolute` / `deviceorientation`). | Standard `getUserMedia` camera API. |
| **iOS 13+** | Apple Safari | Requires explicit permissions via user gesture (`DeviceOrientationEvent.requestPermission`) and reads custom `webkitCompassHeading`. | Safari-compliant `getUserMedia` camera streams. |

---

## 🏁 Getting Started

### 1. Run the Development Server
Vite handles local compilation and hosting. Note that camera access and device orientation features **require a secure connection (`https://`) or a `localhost` URL**.

```bash
# 1. Install dependencies
npm install

# 2. Start local server (automatically listens on port 8080 and exposes to network)
npm run dev
```

### 2. Print QR Codes
1. Start the app and load the interface in your browser.
2. Select **Generate QR Codes** from the splash screen.
3. Print the generated card sheets.
4. Place the cards at physical locations matching the coordinate nodes.

### 3. Start Navigation
1. Open the hosted server URL on your mobile browser.
2. Scan the location QR code to set your starting checkpoint.
3. Choose your destination from the search menu.
4. Approve camera and compass permissions when prompted.
5. Follow the AR directional arrow and spoken instructions.

---

## 🤖 Android Application Wrapper

A native Android wrapper is included in the `android/` directory. It uses a secure `WebView` to package the wayfinding PWA locally, enabling offline standalone execution on Android devices.

### Build Requirements
*   **JDK 21** or later
*   **Android SDK** (API 24+)

### How to Compile the APK
To compile the debug APK:
```bash
# 1. Navigate to the android directory
cd android

# 2. Set the JDK home (example for default openjdk paths)
$env:JAVA_HOME="C:\Program Files\Android\openjdk\jdk-21.0.8"

# 3. Build debug APK using Gradle
.\gradlew assembleDebug
```

The compiled installer will be generated at:
[app-debug.apk](file:///c:/Projects/GoTo/android/app/build/outputs/apk/debug/app-debug.apk)

