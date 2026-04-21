# Anonymous Rooms v3 - Authenticated Real-time Chat with File Sharing

A production-grade anonymous chat application with JWT authentication, secure file uploads, user profiles, and persistent data storage. Real-time messaging via WebSockets with PostgreSQL backend.

![Demo Landing](./ChatAppFE/public/img_1.png)
![Demo Chat Room](./ChatAppFE/public/img_2.png)

<div style="display: flex; gap: 20px; justify-content: center;">
  <img src="./ChatAppFE/public/img_3.jpeg" alt="Demo Mobile" width="280" />
</div>

## Features

**Core Chat**
- Real-time Messaging - WebSocket-powered instant delivery
- Live Typing Indicators - See who's typing in real-time  
- Smart Link Sharing - Share rooms with dynamic routing
- Live User Count - Real-time presence tracking
- Mobile-First - Fully responsive design

**Authentication & Users**
- JWT Authentication - Secure session management
- Passport OAuth - Google login integration
- User Profiles - Customizable profile pictures and bios
- Rate Limiting - Protection against abuse

**File Management**
- File Sharing - Upload files directly in chat
- AWS S3 Storage - Secure cloud storage with presigned URLs
- Drag & Drop - Easy file upload interface
- Auto-Cleanup - Automatic deletion of old files

**Data Persistence**
- PostgreSQL Database - Persistent message & user data
- Prisma ORM - Type-safe database access
- Message History - Full conversation history saved
- Sync Across Devices - Access history from any device

## 🏗️ Tech Stack

**Frontend:** React 19 | TypeScript | Tailwind CSS | Vite | WebSocket API

**Backend:** Node.js | Express | WebSocket (ws) | JWT | Passport

**Database:** PostgreSQL | Prisma ORM

**Cloud:** AWS S3 | DigitalOcean (DO App Platform)

**Infrastructure:** HTTPS/WSS | Docker-ready | Environment-based config

## 📦 Project Structure

```
Chat_app_websockets/
├── ChatAppBE/                 # Backend
│   ├── src/
│   │   ├── index.ts          # Server & WebSocket setup
│   │   ├── prisma.ts         # Database client
│   │   ├── routes/           # API endpoints
│   │   ├── middlewares/       # Auth, rate limiting
│   │   ├── jobs/             # Cleanup tasks
│   │   └── utils/            # S3, validators, etc
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   └── migrations/       # DB migrations
│   └── package.json
│
└── ChatAppFE/                 # Frontend
    ├── src/
    │   ├── pages/            # Room, Auth, Profile
    │   ├── components/       # Reusable UI components
    │   ├── services/         # API client, auth service
    │   ├── contexts/         # Auth context
    │   └── hooks/            # Custom React hooks
    └── package.json
```

## 🔐 Architecture Highlights

**Authentication Flow**
```
Login → Google OAuth (Passport) → JWT Token → Secure API Access
```

**File Upload Pipeline**
```
User Selects File 
  ↓
Get Presigned S3 URL from Backend
  ↓
Upload directly to AWS S3
  ↓
Backend updates Database with File Metadata
  ↓
WebSocket broadcasts to Room
  ↓
Frontend displays File Message with Download Link
```

**Data Persistence**
- Messages stored in PostgreSQL with full history
- User profiles with authentication status
- File references with S3 URLs
- Automatic cleanup of orphaned files

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- AWS S3 bucket
- Google OAuth credentials (optional)

### Local Development

```bash
# Clone & setup
git clone <repo>
cd Chat_app_websockets

# Backend
cd ChatAppBE
npm install
# Create .env.development with DB_URL, AWS credentials, etc.
npm run dev

# Frontend (new terminal)
cd ChatAppFE
npm install
npm run dev
```

Open `http://localhost:5173`

### Environment Variables

**Backend (.env.development)**
```env
FRONTEND_URL=http://localhost:2005
PORT=8080
JWT_SECRET=your-secret-key
DATABASE_URL=postgresql://user:pass@localhost/chat_db
AWS_S3_BUCKET_NAME=your-bucket
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

**Frontend (.env)**
```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

## 📡 API Endpoints

**Authentication**
- `POST /auth/register` - Create account
- `POST /auth/login` - Login with email/password
- `GET /auth/login/federated/google` - Google OAuth
- `POST /auth/logout` - Logout

**User Profile**
- `GET /api/user/profile` - Get current user
- `PUT /api/user/profile` - Update profile
- `POST /api/user/profile-picture/upload` - Upload avatar

**Files**
- `POST /api/files/presigned-url` - Get S3 upload URL
- `GET /api/files/:fileId` - Download file metadata

**Chat**
- WebSocket: `wss://api.domain.com` - Real-time messaging

## 📊 Key Improvements from V2

| Feature | V2 | V3 |
|---------|----|----|
| Authentication | None | JWT + OAuth |
| File Sharing | Planned | Yes |
| Data Storage | localStorage | PostgreSQL |
| User Profiles | No | Yes |
| Message History | 100 (local) | Unlimited |
| Multi-device Sync | No | Yes |
| Rate Limiting | No | Yes |

## 🌐 Deployment

**Frontend:** https://rooms.sahils.tech (Vercel)

**Backend:** https://anonymous-api.sahils.tech (DigitalOcean)

## 📄 License

MIT License - Open source and free to use!

---

**v3.0 Release | April 2026**

[Archive: v2.0](./V2_README.md) | [Archive: v1.0](./V1_README.md)
