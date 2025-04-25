# WiFi CSI Human Sensing Platform
This project uses WiFi Channel State Information (CSI) and Received Signal Strength Indicator (RSSI) for passive human sensing applications such as motion detection and breathing rate monitoring.

## System Architecture

The system consists of three main components:

### ESP32C5 Firmware
- **CSI Receiver**: Captures CSI data from WiFi transmissions and processes it for motion detection
- **CSI Sender**: Acts as a dedicated transmitter for consistent CSI measurements

### Backend (Python)
- Processes incoming CSI data from MQTT broker
- Runs algorithms for breathing rate estimation
- Manages data storage and provides API endpoints for the frontend

### Frontend (Next.js)
- Interactive dashboard for visualizing real-time CSI data
- Displays motion detection status and breathing rate measurements
- Built with React 19 and modern UI components from Radix UI

## Setup Instructions

### ESP32C5 Setup

1. **For CSI Receiver:**
   ```bash
   cd esp32c5/csi_recv
   idf.py build
   idf.py -p [PORT] flash
   ```

2. **For CSI Sender:**
   ```bash
   cd esp32c5/csi_send
   idf.py build
   idf.py -p [PORT] flash
   ```

3. **WiFi Configuration:**
   - Update the WiFi SSID and password in app_main.c to match your network
   - Update MQTT broker URL and port to match your own

### Backend Setup

1. **Install dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Run the server:**
   ```bash
   python server.py
   ```

### Frontend Setup

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm build
   ```