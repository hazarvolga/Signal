# SIGNAL Broadcast Systems

SIGNAL is a high-performance, production-grade broadcast and marketing automation platform designed for high-deliverability editorial dispatches and complex audience segmentation. Built with a modern full-stack architecture, it integrates advanced AI capabilities, real-time data processing, and robust infrastructure monitoring.

## 🚀 Key Features

- **Campaign Intelligence**: Create and manage high-impact editorial dispatches with advanced scheduling and analytics.
- **Audience Segmentation**: Dynamic segmentation engine for precise targeting based on behavioral and demographic data.
- **AI Visual Studio**: Bespoke editorial illustration and brand asset generation powered by Gemini 2.5.
- **Email Intelligence**: Production-grade verification engine for ensuring high deliverability and domain reputation.
- **Automations & Workflows**: Visual workflow builder (React Flow) for complex customer journeys and automated dispatches.
- **Infrastructure Monitoring**: Real-time visibility into server health, database performance (SQLite/Prisma), and message queues (BullMQ/Redis).
- **Commerce Integration**: Deep integration with Shopify and other commerce platforms for transactional messaging.
- **Collaboration Suite**: Role-based access control (RBAC), team management, and real-time collaborative features.
- **Integrated User Guides**: Contextual tooltips and comprehensive documentation for administrators and editors.

## 🛠 Tech Stack

### Frontend
- **React 19**: Modern UI development with functional components and hooks.
- **Vite**: Ultra-fast build tool and development server.
- **Tailwind CSS 4**: Utility-first styling with the latest features.
- **Motion (Framer Motion)**: Fluid layout animations and page transitions.
- **Recharts**: Data visualization for campaign and infrastructure reports.
- **React Flow**: Visual automation and workflow mapping.
- **Zustand**: Lightweight and scalable state management.

### Backend
- **Express**: Robust Node.js web framework.
- **Prisma & Better-SQLite3**: Type-safe database access and high-performance local storage.
- **BullMQ & IORedis**: Distributed task queue for background processing and real-time events.
- **Socket.io**: Real-time bidirectional communication.
- **Passport.js**: Secure authentication with OIDC and SAML support.

### AI Integration
- **Gemini API (@google/genai)**: Advanced generative AI for content and visual asset creation.

## 📦 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Redis (for BullMQ and real-time features)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/signal-broadcast-systems.git
   cd signal-broadcast-systems
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file based on `.env.example`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   DATABASE_URL="file:./dev.db"
   REDIS_URL="redis://localhost:6379"
   # Add other necessary keys for OIDC/SAML if applicable
   ```

4. Initialize the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## 🏗 Project Structure

- `/src`: Frontend React application.
  - `/components`: Reusable UI components.
  - `/services`: API and AI service integrations.
  - `/constants`: Global configuration and documentation.
- `/server.ts`: Express backend entry point.
- `/prisma`: Database schema and migrations.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*Built with precision by Signal Broadcast Systems.*
