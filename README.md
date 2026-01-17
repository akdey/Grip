# Griply: The financial diet that sticks.

**Griply** is a privacy-first, AI-powered financial companion designed to convert raw banking communications into structured, actionable insights without compromising user privacy. With **Hybrid Manual-First** capabilities, credit card lifecycle intelligence, and predictive analytics.

## 🚀 How It Works

Griply acts as a central hub for your financial life, utilizing a multi-stage pipeline to process data:

1.  **Ingestion**: Receives banking emails via three methods:
    *   **Direct Push**: A Google Apps Script pings the backend with raw email content.
    *   **Manual Pull**: The backend fetches new emails using OAuth2 credentials.
    *   **Manual Entry**: You can manually record transactions (e.g., Cash, Credit Card) which are automatically marked as `VERIFIED`.
2.  **Sanitization**: Before reaching any AI model, the raw text is processed by a **PII Sanitizer**. This regex-based engine masks sensitive data like PAN cards, Aadhaar numbers, Credit Card numbers, and UPI IDs.
3.  **Intelligence extraction**: The "Brain" (powered by **Groq Llama 3**) analyzes the sanitized text to extract structured JSON data:
    *   Amount & Currency
    *   Merchant Name
    *   Category & Sub-Category
    *   Account Type (Savings, Credit Card, etc.)
4.  **Deduplication**: A SHA-256 hash of the unique message ID and internal timestamp ensures no transaction is ever processed twice.
5.  **Memory (Merchant Mapping)**: When you manually verify a transaction, the engine creates a "Merchant Mapping." Future transactions from that same merchant are automatically categorized based on your past preferences.
6.  **Insights**: A dedicated dashboard provides real-time visibility into your Liquidity and Investment portfolio.
7.  **Predictive Forecasting**: Leverages a **Hybrid AI Engine** (Meta Prophet locally, or Groq Llama 3 on Vercel) to analyze historical spending patterns, predicting your upcoming monthly burden to calculate a 30-day "Safe-to-Spend" margin.
8.  **PWA Ready**: Install Griply on your mobile device as a Progressive Web App for a native-like experience with offline capabilities.

---

## ✨ Core Functionalities

### 🏦 Transaction Management
- **Verification Workflow**: Transactions start as `PENDING`. You can approve, reject, or adjust them.
- **Merchant Memory**: Automatically maps raw merchant strings to clean, user-defined display names and categories.
- **Hybrid Manual-First**: Support for both automated email parsing and manual transaction entry.
- **Surety Tracking**: Mark recurring bills (rent, utilities) as "surety" for better burden calculation.

### 💳 Credit Card Intelligence
- **Card Management**: Register multiple credit cards with billing cycle details (statement date, payment due date).
- **Billing Cycle Tracking**: Automatically calculates current billing cycle, unbilled amount, and days until statement.
- **Cycle Notifications**: Get alerts X days before your billing cycle closes.
- **Utilization Monitoring**: Track credit utilization percentage against your credit limit.
- **Transaction Linking**: Link credit card transactions to specific cards for accurate cycle tracking.

### 📋 Bill Management & "Surety" Intelligence
- **Bill Tracking**: Create one-time or recurring bills with due dates.
- **Surety Bills**: Identify predictable recurring bills (rent, utilities, maintenance).
- **Burden Calculation**: Formula: `Frozen Funds = UnpaidBills + ProjectedSuretyBills + CurrentUnbilledCC`
- **Upcoming Bills**: View all unpaid bills due in the next X days.
- **Payment Tracking**: Mark bills as paid/unpaid.

### 🔄 Multi-Source Sync
- **Google Apps Script Webhook**: Secure production-ready endpoint for real-time transaction ingestion.
- **Legacy OAuth Sync**: Fallback method for manual history fetching using Google API Client.
- **X-GRIPLY-SECRET**: Header-based authentication for secure webhook communication.

### 📉 Predictive Analytics & Hybrid Forecasting
- **Hybrid AI Engine**: 
    - **Meta Prophet**: Uses high-performance statistical time-series forecasting for deep local analysis.
    - **Groq LLM Fallback**: Seamlessly switches to Llama 3 for trend analysis in resource-constrained environments (like Vercel).
- **Credit Card Bill Prediction**: Analyzes previous spending patterns and unbilled transactions to estimate upcoming credit card liabilities.
- **Variance Analysis**: Compare current month-to-date spending vs. last month-to-date with category-level breakdowns.
- **Percentage Metrics**: Calculate % over/under for total spend and category-specific spend.
- **Spend Analysis**: Breaks down historical data to identify "Sure Bills" (recurring rent, utilities, maintenance) and calculate a reliable "Safe-to-Spend" limit.
- **Pattern Recognition**: Detects cyclical spending habits to alert you about upcoming recurring outflows before they happen.

### 💰 Safe-to-Spend Intelligence
- **Real-Time Calculation**: `Safe-to-Spend = Balance - FrozenFunds - Buffer`
- **Frozen Funds Breakdown**: See exactly what's locked (unpaid bills, projected surety, unbilled CC).
- **Configurable Buffer**: Set your own safety buffer percentage (default 10%).
- **Smart Recommendations**: Get actionable advice based on your spending capacity.

### 🛡️ Privacy & Security
- **Local-First Sanitization**: Sensitive data is masked *locally* before being sent to any third-party AI APIs.
- **JWT Authentication**: Secure user sessions with encrypted tokens.
- **Production-Ready Logging**: Balanced logs that support real-time debugging (local) and serverless environments (Vercel).

### 📊 Financial Dashboard
- **Liquidity View**: Aggregated balances across savings and cash.
- **Investment Tracking**: Grouped views for mutual funds, stocks, and fixed deposits.
- **Credit Card Overview**: See all cards with unbilled amounts and upcoming statement dates.
- **Bill Calendar**: Upcoming bills and their due dates.

---

## 🛠️ Tech Stack
- **Backend**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL (via SQLAlchemy + asyncpg)
- **AI Engine**: Groq (Llama 3 70B/8B)
- **Forecasting**: Meta Prophet
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

# Feature Flags
USE_AI_FORECASTING="True" # Required for both Prophet and Groq-based forecasting

# Secondary Ingress
GRIPLY_SECRET="your-custom-webhook-secret"
```

### Installation & Execution

1.  **Install dependencies**:
    ```bash
    uv sync
    ```

2.  **Run database migrations**:
    ```bash
    alembic upgrade head
    ```

3.  **Seed the database** (Optional - creates amit@griply.com/admin and default categories):
    ```bash
    uv run scripts/seed_db.py
    ```

4.  **Run the application**:
    ```bash
    uv run main.py
    ```

4.  **Deploy to Vercel**:
    ```bash
    vercel --prod
    ```

---

## 📖 API Documentation
Once running, you can access the interactive API docs at:
- Swagger UI: `http://localhost:8000/docs`
- Redoc: `http://localhost:8000/redoc`

### Key Endpoints

#### Credit Cards
- `POST /api/v1/credit-cards` - Add a new credit card
- `GET /api/v1/credit-cards` - List all cards
- `GET /api/v1/credit-cards/{id}/cycle-info` - Get billing cycle information

#### Bills
- `POST /api/v1/bills` - Create a bill (one-time or recurring)
- `GET /api/v1/bills/upcoming?days=30` - Get upcoming bills
- `POST /api/v1/bills/{id}/mark-paid` - Mark bill as paid

#### Analytics
- `GET /api/v1/analytics/variance` - Month-to-date vs last month comparison
- `GET /api/v1/analytics/burden` - Calculate frozen funds
- `GET /api/v1/analytics/safe-to-spend` - Real-time safe-to-spend calculation

#### Transactions
- `POST /api/v1/transactions/manual` - Manually record a transaction
- `GET /api/v1/transactions/pending` - Get pending transactions for verification

---

## 🎯 Usage Examples

### Adding a Credit Card
```bash
curl -X POST "http://localhost:8000/api/v1/credit-cards" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "card_name": "HDFC Regalia",
    "last_four_digits": "1234",
    "statement_date": 15,
    "payment_due_date": 25,
    "credit_limit": 500000
  }'
```

### Creating a Recurring Bill
```bash
curl -X POST "http://localhost:8000/api/v1/bills" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Rent",
    "amount": 25000,
    "due_date": "2026-02-01",
    "is_recurring": true,
    "recurrence_day": 1,
    "category": "Housing",
    "sub_category": "Rent"
  }'
```

### Manual Transaction Entry
```bash
curl -X POST "http://localhost:8000/api/v1/transactions/manual" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1500,
    "merchant_name": "Starbucks",
    "category": "Food & Dining",
    "sub_category": "Coffee",
    "account_type": "CREDIT_CARD",
    "credit_card_id": "your-card-uuid",
    "transaction_date": "2026-01-17",
    "is_surety": false
  }'
```

### Check Safe-to-Spend
```bash
curl -X GET "http://localhost:8000/api/v1/analytics/safe-to-spend?buffer=0.10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔄 Migration Guide

If you're upgrading from a previous version, run the database migration:

```bash
cd Backend
alembic upgrade head
```

This will:
- Create `credit_cards` and `bills` tables
- Add new columns to `transactions` table (`is_surety`, `credit_card_id`, `transaction_date`, `is_manual`)
- Backfill `transaction_date` from existing `created_at` values

---

## 📝 License

This project is private and proprietary.

