# 🚀 zio.ai - AI-Powered Data Pipeline Generator for Microsoft Fabric

<div align="center">

![zio.ai Logo](frontend/public/transparent_logo.png)

**Transform natural language into production-ready Microsoft Fabric pipelines**

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![Gemini AI](https://img.shields.io/badge/Powered%20by-Gemini%20AI-8E75B2?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev/)
[![Microsoft Fabric](https://img.shields.io/badge/Microsoft-Fabric-0078D4?style=flat-square&logo=microsoft&logoColor=white)](https://www.microsoft.com/en-us/microsoft-fabric)

</div>

---

## ✨ Features

- **🗣️ Natural Language to Pipeline** - Describe your data transformation in plain English
- **🤖 Agent Mode** - Self-correcting AI that validates and fixes pipelines automatically
- **🔗 Microsoft Fabric Integration** - Connect directly to your Fabric workspaces and lakehouses
- **📊 Schema-Aware Generation** - Uses your actual table schemas for accurate pipeline code
- **⚡ One-Click Deployment** - Deploy pipelines directly to Fabric with a single click
- **💬 Conversation History** - Continue and iterate on previous pipeline requests
- **🎯 Real-time Validation** - Watch the AI validate and fix issues as it generates

---

## 🎥 Demo

![zio.ai Demo](docs/demo.gif)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, TailwindCSS, MSAL-React |
| **Backend** | Node.js, Express.js |
| **AI Engine** | Google Gemini 2.5 Flash |
| **Authentication** | Microsoft Azure AD (OAuth 2.0) |
| **Data Platform** | Microsoft Fabric APIs |

---

## 📦 Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- Microsoft Fabric account
- Google Gemini API key
- Azure AD App Registration

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/zio-ai.git
cd zio-ai
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

Update `src/auth/msalConfig.js` with your Azure AD app credentials:

```javascript
export const msalConfig = {
  auth: {
    clientId: "YOUR_AZURE_CLIENT_ID",
    authority: "https://login.microsoftonline.com/YOUR_TENANT_ID",
    redirectUri: "http://localhost:5173"
  }
};
```

### 4. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
node index.js
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

---

## 🔐 Azure AD Configuration

1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
2. Create a new registration
3. Add these **API permissions**:
   - `Microsoft Fabric` → `Workspace.Read.All`
   - `Microsoft Fabric` → `Item.Read.All`
   - `Microsoft Fabric` → `Item.ReadWrite.All`
4. Grant admin consent for your organization

---

## 🚀 Usage

### Basic Pipeline Generation

1. **Connect** - Sign in with your Microsoft account
2. **Select** - Choose your workspace, lakehouse, and tables
3. **Describe** - Type what you want in natural language:
   ```
   Load the sales_raw table, filter for orders > $100, 
   aggregate by region, and save to sales_summary
   ```
4. **Generate** - Click Generate and watch the AI create your pipeline
5. **Deploy** - One-click deploy to Microsoft Fabric

### Agent Mode

Enable **Agent Mode** (on by default) for automatic validation. The AI will:
- Generate the initial pipeline
- Validate syntax and schema
- Check table/lakehouse references
- Auto-fix any errors (up to 5 iterations)
- Deliver a production-ready pipeline

---

## 📁 Project Structure

```
zio-ai/
├── backend/
│   ├── fabric/          # Fabric API integration
│   ├── gemini/          # AI client & prompts
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic
│   ├── utils/           # Utilities
│   └── index.js         # Entry point
├── frontend/
│   ├── public/          # Static assets
│   └── src/
│       ├── api/         # API clients
│       ├── auth/        # MSAL config
│       ├── components/  # React components
│       └── pages/       # Page components
└── README.md
```

---

## 🔧 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/generate` | POST | Generate pipeline (simple mode) |
| `/api/validate` | POST | Generate with validation loop (SSE) |
| `/api/fabric/metadata` | GET | Fetch Fabric metadata |
| `/api/fabric/deploy` | POST | Deploy pipeline to Fabric |
| `/api/usage/stats` | GET | Get token usage stats |

---

## 💳 Subscription Plans

| Plan | Tokens/Day | Price |
|------|------------|-------|
| **Free** | 100,000 | ₹0 |
| **Premium** | Unlimited | ₹899/month |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Karan**

- GitHub: [@Karanbhatia110](https://github.com/Karanbhatia110)

---

<div align="center">

**⭐ Star this repo if you find it helpful!**

</div>
