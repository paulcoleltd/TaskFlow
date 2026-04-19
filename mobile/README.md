# TaskFlow Mobile

React Native / Expo companion app for the TaskFlow Task Management system.

## Stack

| Concern | Tool |
|---------|------|
| Framework | React Native 0.79 + Expo 53 |
| Language | TypeScript (strict) |
| Navigation | React Navigation v7 (native stack + bottom tabs) |
| State | Zustand + AsyncStorage persistence |
| Real-time | Socket.io-client (connects to :3002) |
| Validation | Zod |

## Design Tokens

Same dark navy palette as the web app:
- Background: `#0B1437`
- Card: `#111C44`
- Blue accent: `#3B82F6`
- Text primary: `#E2E8F0`

## Getting Started

```bash
cd mobile

# Install dependencies
npm install

# Start Expo dev server
npm start          # → QR code for Expo Go app
npm run android    # → Android emulator
npm run ios        # → iOS simulator (Mac only)
```

## Server Connection

The mobile app connects to the same Socket.io server as the web app (port 3002).

For physical devices, set your machine's LAN IP in `mobile/.env`:
```
EXPO_PUBLIC_SERVER_URL=http://192.168.1.10:3002
```

For emulators, `localhost` works out of the box.

## Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Login | — | Email + password, demo account shortcuts |
| Dashboard | Tab | Stats, active projects, tasks assigned to me |
| Tasks | Tab | Full task list with search + filter by status |
| Task Detail | Stack | Status/priority change, description, meta |
| Projects | Tab | Project list with progress bars |
| Settings | Tab | Profile, connection status, logout |

## Real-Time Features

- `ConnectionStatus` chip shows Live / Reconnecting
- Tasks created/updated/deleted on the web app appear instantly on mobile
- Online user presence synced with the web app via Socket.io
