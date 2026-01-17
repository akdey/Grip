# Griply: The financial diet that sticks.

**Griply** is a privacy-first, AI-powered financial companion designed to convert raw banking communications into structured, actionable insights without compromising user privacy.

## 🚀 How It Works

Griply acts as a central hub for your financial life, utilizing a multi-stage pipeline to process data:

1.  **Ingestion**: Receives banking emails via three methods:
    *   **Direct Push**: A Google Apps Script pings the backend with raw email content.
    *   **Manual Pull**: The backend fetches new emails using OAuth2 credentials.
    *   **Manual Entry**: You can manually record transactions (e.g., Cash) which are automatically marked as `VERIFIED`.
2.  **Sanitization**: Before reaching any AI model, the raw text is processed by a **PII Sanitizer**. This regex-based engine masks sensitive data like PAN cards, Aadhaar numbers, Credit Card numbers, and UPI IDs.
3.  **Intelligence extraction**: The "Brain" (powered by **Groq Llama 3**) analyzes the sanitized text to extract structured JSON data:
    *   Amount & Currency
    *   Merchant Name
    *   Category & Sub-Category
    *   Account Type (Savings, Credit Card, etc.)
4.  **Deduplication**: A SHA-256 hash of the unique message ID and internal timestamp ensures no transaction is ever processed twice.
5.  **Memory (Merchant Mapping)**: When you manually verify a transaction, the engine creator a "Merchant Mapping." Future transactions from that same merchant are automatically categorized based on your past preferences.
6.  **Insights**: A dedicated dashboard provides real-time visibility into your Liquidity and Investment portfolio.
7.  **Predictive Forecasting**: Leverages **Meta Prophet** to analyze historical spending patterns, predicting your upcoming monthly burden (including Credit Card bills and recurring "Sure Bills") to calculate a "Safe-to-Spend" margin.

---

## ✨ Core Functionalities

### 🏦 Transaction Management
- **Verification Workflow**: Transactions start as `PENDING`. You can approve, reject, or adjust them.
- **Merchant Memory**: Automatically maps raw merchant strings to clean, user-defined display names and categories.

### 🔄 Multi-Source Sync
- **Google Apps Script Webhook**: Secure production-ready endpoint for real-time transaction ingestion.
- **Legacy OAuth Sync**: Fallback method for manual history fetching using Google API Client.
- **X-PFIE-SECRET**: Header-based authentication for secure webhook communication.

### 📉 Predictive Analytics & Forecasting
- **Meta Prophet Integration**: Uses high-performance time-series forecasting to predict your financial burden for the next 30 days.
- **Credit Card Bill Prediction**: Analyzes previous spending patterns and unbilled transactions to estimate upcoming credit card liabilities.
- **Spend Analysis**: Breaks down historical data to identify "Sure Bills" (recurring rent, utilities, maintenance) and calculate a reliable "Safe-to-Spend" limit.
- **Pattern Recognition**: Detects cyclical spending habits to alert you about upcoming recurring outflows before they happen.

### 🛡️ Privacy & Security
- **Local-First Sanitization**: Sensitive data is masked *locally* before being sent to any third-party AI APIs.
- **JWT Authentication**: Secure user sessions with encrypted tokens.
- **Production-Ready Logging**: Balanced logs that support real-time debugging (local) and serverless environments (Vercel).

### 📊 Financial Dashboard
- **Liquidity View**: Aggregated balances across savings and cash.
- **Investment Tracking**: Grouped views for mutual funds, stocks, and fixed deposits.

---

## 🛠️ Tech Stack
- **Backend**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL (via SQLAlchemy + asyncpg)
- **AI Engine**: Groq (Llama 3 70B/8B)
- **Hosting**: Vercel ready
- **Package Management**: uv

---

## ⚙️ Environment Setup

### Prerequisites
- Python 3.11+
- [uv](https://github.com/astral-sh/uv) (Recommended)
- PostgreSQL (e.g., Supabase or NeonDB)
- Groq API Key

### Configuration
Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://user:pass@host:port/dbname?pgbouncer=true"
SECRET_KEY="your-jwt-secret-here"
ENVIRONMENT="local" # Set to 'production' on Vercel

# External APIs
GROQ_API_KEY="your-groq-api-key"
GOOGLE_CLIENT_ID="your-google-id"
GOOGLE_CLIENT_SECRET="your-google-secret"

# Secondary Ingress
PFIE_SECRET="your-custom-webhook-secret"
```

### Installation & Execution

1.  **Install dependencies**:
    ```bash
    uv sync
    ```

2.  **Run the application**:
    ```bash
    uv run main.py
    ```

3.  **Deploy to Vercel**:
    ```bash
    vercel --prod
    ```

---

## 📖 API Documentation
Once running, you can access the interactive API docs at:
- Swagger UI: `http://localhost:8000/docs`
- Redoc: `http://localhost:8000/redoc`
