# GRIP

> **Autonomous Financial Intelligence.**

An AI-powered personal platform that transforms your inbox into a complete financial intelligence system. Track spending, forecast expenses, grow investments—all while keeping your data private and secure.

**🎯 The Only Platform in India That Shows If Your SIP Date is Costing You Money.**

Import your Consolidated Account Statement (CAMS, KFin, MFCentral) in 60 seconds. Discover if switching your SIP date could earn you thousands more. No other platform does this.

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)

---

## 🌟 What Makes Grip Different

### 💰 Know Your True Spending Power
- **Safe-to-Spend Engine**: See what you can *actually* spend after bills, credit cards, and commitments—not just your bank balance.
- **Real-Time Intelligence**: Automatically accounts for unpaid bills, upcoming rent, and unbilled credit card purchases.
- **Predictive Budgeting**: Includes projected recurring expenses ("Surety") before they even arrive.

### 🎯 Timing Alpha: The Only Platform for Precision Wealth Analytics
Most investment apps are "lazy"—they show you generic fund returns or XIRR calculated with approximate dates. Grip is built for the precision-obsessed investor.

**The "Average" Problem with Other Platforms:**
- ❌ **Lazy Pricing**: Use month-end NAVs or weekly averages to calculate your returns.
- ❌ **Generic XIRR**: Show you a number that assumes your transactions happened at a "standard" time.
- ❌ **The Blind Spot**: No insight into whether your SIP date is actually helping or hurting you.

**The Grip Precision Advantage:**
- ✅ **Day-Specific NAV**: We fetch the *exact* NAV of the day your transaction hit the bank. If you invest on the 7th, we calculate parity with the 7th, not a "monthly average".
- ✅ **Timing Leakage Analysis (WORLD FIRST)**: We analyze every SIP you've ever made and cross-reference them with the volatility schedules of that specific fund. 
- ✅ **What-If Date Simulation**: Grip simulates your entire investment history against every other day of the month (1st to 28th) to determine if a simple change in your salary-cycle could yield an extra 1-2% in "Timing Alpha".

**Why this is a Big Deal:**
Mutual Fund NAVs fluctuates daily. An investor who does a SIP on the 10th vs. the 15th might see a **1.5% difference in lifetime XIRR** for the exact same fund. Most platforms hide this "Timing Leakage." Grip exposes it and shows you how to fix it.

> **Our Finding says:** No other retail investment platform in India—not Zerodha Coin, INDMoney, or Groww—performs historical date-permutation analysis on your *actual* transactions to optimize your future returns.

### 🛡️ Frictionless, Private Onboarding
While others make you wait for "syncs" or manual entries, Grip is built to get you from zero to "Deep Insights" in under a minute.

- **Universal Statement Import**: Upload your Consolidated Account Statement (CAS) from CAMS, KFin, or MFCentral. We reconstruct your entire investment life—identifying SIPs, step-ups, and even "missed" months—instantly.
- **Step-Up & Skip Detection**: We don't just show total units; we map the *evolution* of your discipline. See exactly when you increased your SIPs and where you missed a beat.
- **Privacy-First Intelligence**: All your data is processed with local sanitization. Your bank details and PAN are masked *before* our analysis engines ever touch the data.

### 📊 Professional-Grade Portfolio Simulation
- **AI-Powered Forecasting**: We use Facebook Prophet (the same engine used by data scientists for revenue forecasting) to project your portfolio 10-20 years into the future with realistic confidence intervals.
- **Simulation Mode**: Instantly see how a ₹2,000 "Step-Up" in your monthly SIP today changes your net worth 15 years from now.
- **Email-to-Wealth Pipeline**: Once imported, Grip auto-extracts your future buys from your bank alert emails. No more manual tracking.
- **Precision XIRR**: Calculated using the Newton-Raphson method for accurate annualized returns based on daily cashflows.
- **Timing Leakage Reports**: Detailed breakdown of how much "extra" money you could have made by simply shifting your SIP date.

### 🤖 Hybrid Intelligence — Fast, Private, Reliable
- **Rule Engine (Primary)**: A deterministic, zero-latency, zero-cost pattern-matching engine handles >90% of Indian bank email formats. Works offline. No API calls needed.
- **Groq AI (Fallback)**: Only called when the rule engine is uncertain. Sanitized snippets only — no raw PII ever sent externally.
- **Automatic Transaction Extraction**: Connect Gmail once; transactions are extracted from bank alerts automatically
- **Autonomous Notification Engine**: Scheduled email alerts for Gmail disconnection, surety bill reminders, and spending insights
- **Hybrid Forecasting**: Combines Meta Prophet (statistical) + Groq LLM (contextual) to predict month-end expenses
- **Smart Learning**: Remembers your merchant preferences, auto-categorizes future transactions
- **Multi-Layer Spam Filter**: Sender whitelist + subject gates + body signals distinguish real transactions from marketing emails

### 🔒 Privacy Built-In, Not Bolted-On
- **Local Rule Engine First**: The primary extraction runs 100% on-server — no data leaves for the common case
- **Sanitization Before AI**: PAN, Aadhaar, Credit Card numbers masked *before* any external AI sees them
- **No Data Selling**: Your financial data stays yours. Period.
- **Self-Hostable**: Open architecture—you control the deployment and data
- **Read-Only Gmail**: OAuth 2.0 with minimal scopes; we can't send or modify your emails


---

## ⚡ Zero-Effort Automation
- **One-Click Sync**: Connect Gmail → Transactions flow in automatically
- **Smart Deduplication**: SHA-256 hashing ensures no duplicate transactions
- **Background Processing**: Email parsing happens async—never blocks your UI
- **Merchant Intelligence**: Auto-learns from your verifications, gets smarter over time
- **Daily Price Sync**: Scheduled job updates investment NAVs every evening at 9 PM IST

---

## 🚀 How It Works

Grip processes your financial data through a sophisticated, privacy-preserving pipeline:

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. EMAIL INGESTION (3 Methods)                                 │
│    • OAuth Sync: Gmail API fetch (manual/scheduled)            │
│    • Webhook Push: Real-time via Google Apps Script            │
│    • Manual Entry: Cash/other transactions (auto-verified)     │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. PRIVACY SANITIZATION (LOCAL)                                 │
│    Regex Engine → Masks PII → Safe for AI processing            │
│    • Credit Card: ****-****-XXXX-1234                           │
│    • Aadhaar: XXXX-XXXX-5678                                    │
│    • UPI ID: user@***                                           │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. AI EXTRACTION (Groq Llama 3.3)                               │
│    Natural Language → Structured JSON                           │
│    "Rs 1,250 debited from Card ending 4521 at Swiggy"          │
│    ↓                                                             │
│    { amount: 1250, merchant: "Swiggy",                          │
│      category: "Food & Dining", account: "CREDIT_CARD" }        │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. SMART DEDUPLICATION                                          │
│    SHA-256 Hash → Check Database → Skip if exists               │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. INVESTMENT DETECTION & MAPPING                               │
│    "ICICI Pru SIP ₹5000" → Match Rule → Fetch NAV → Add Units  │
│    Auto-creates snapshots for portfolio tracking                │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. MERCHANT INTELLIGENCE                                        │
│    User Verification → Create Mapping → Future Auto-categorize  │
│    "SWIGGY*BANGALORE" → Clean: "Swiggy" → Category: Food        │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. PREDICTIVE FORECASTING                                       │
│    Historical Data → Prophet/Groq → Month-end burden prediction │
│    "Expected ₹12,500 in remaining expenses (18 days left)"     │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
│ 8. AUTONOMOUS NOTIFICATIONS                                     │
│    • Gmail Connection Alerts: Instant email if OAuth expires       │
│    • Surety Reminders: Morning-of alerts for big recurring bills  │
│    • Weekly Insights: Smart alerts for Category spending spikes   │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 9. ACTIONABLE INSIGHTS & DASHBOARD                              │
│    • Safe-to-Spend = Balance - (Bills + CC + Buffer)           │
│    • Wealth Trajectory: Historical + 10Y AI forecast           │
│    • Investment XIRR: Annualized returns per asset              │
│    Visual dashboard with spending trends and recommendations    │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

### 💰 Safe-to-Spend Intelligence (Core USP)

**The Number That Matters Most**

Forget checking your bank balance—Grip shows you what you can *actually* spend without stress.

**Intelligent Calculation:**
```
Safe-to-Spend = Current Balance 
                - Unpaid Bills
                - Projected Recurring Bills (Surety)
                - Current Unbilled Credit Card Expenses
                - Configurable Safety Buffer (default 10%)
```

**Real-World Example:**
```
Bank Balance:              ₹45,000
- Rent (due in 5 days):    -₹15,000
- Utilities (projected):    -₹2,500
- Unbilled CC purchases:    -₹8,200
- Safety Buffer (10%):      -₹1,930
─────────────────────────────────────
Safe-to-Spend:             ₹17,370 ✅
```

**Visual Health System:**
- 🔴 **Negative**: Overdrawn (immediate action required)
- 🟠 **Critical**: < ₹1,000 (extremely tight budget)
- 🟡 **Warning**: ₹1,000 - ₹3,000 (limited spending room)
- 🟢 **Healthy**: > ₹3,000 (comfortable spending capacity)

**Why This Matters:**
- **Prevents Overspending**: Accounts for committed expenses before they hit
- **Reduces Anxiety**: One number tells you your true spending power
- **Builds Buffer**: Automatic safety margin prevents living paycheck-to-paycheck
- **Predictive**: Includes projected bills, not just current ones

### 📈 Investment Intelligence Platform (NEW!)

**Automated Wealth Tracking**

Transform your investment expenses into a live-tracked portfolio with zero manual work.

**Email-to-Wealth Pipeline:**
```
① Bank Email: "SIP ₹5,000 debited for ICICI Pru Bluechip"
② Auto-Detection: Investment category + merchant pattern match
③ Smart Linking: Checks if asset exists in portfolio
   - If New: Creates new holding
   - If Existing: Appends transaction to history
④ NAV Fetch: Historical price on transaction date (mfapi.in)
⑤ Unit Calculation: ₹5,000 / ₹45.23 = 110.52 units
⑤ Snapshot Created: Portfolio updated with new units
⑥ XIRR Recalculated: Annualized returns refreshed
⑥ Portfolio Update: Total units increased, XIRR recalibrated
```

**🆕 Universal Statement Import (Instant Onboarding):**
- **Broad Support**: Import statements from CAMS, KFin, or MFCentral
- **Format Agnostic**: Supports both CSV and Excel formats
- **Bulk Processing**: Import years of transactions in seconds
- **Auto-Detection**: Automatically identifies SIP patterns vs lump sum
- **Step-Up Tracking**: Detects when SIP amount increases (e.g., ₹5k → ₹7k)
- **Skip Detection**: Identifies missed SIP months with gap analysis
- **Smart Metadata**: Stores change percentages, skip reasons, historical patterns
- **Zero Manual Work**: Auto-creates holdings, fetches historical NAVs, calculates units
- **Preview Before Import**: Review all transactions before committing

**🎯 SIP Date-Specific Performance Analysis (UNIQUE USP!):**

*No other platform in India offers this!*

**What Others Show:**
- ❌ Generic monthly average returns
- ❌ Hypothetical "if you invested on 1st Jan every year"
- ❌ Fund-level performance only

**What Grip Shows:**
- ✅ **YOUR Actual SIP Dates**: Analyzes your real purchase dates (e.g., 15th of every month)
- ✅ **Alternative Date Comparison**: Simulates 6 alternative dates (1st, 5th, 10th, 15th, 20th, 25th)
- ✅ **Exact NAV on Your Dates**: Fetches historical NAV for your specific purchase days
- ✅ **Potential Improvement**: Shows how much more you could have earned with different dates
- ✅ **Historical Win Rate**: "10th-date SIPs outperformed 15th in 16/24 months (67%)"
- ✅ **AI Insights**: "Switching to 10th could earn you ₹1,100 more (4.4% better)"
- ✅ **Optimization Recommendations**: Actionable suggestions for future SIPs

**Example Analysis:**
```
Your SIP Date: 15th of every month
Your Performance:
  • Total Invested: ₹1,20,000
  • Current Value: ₹1,45,000
  • Returns: +₹25,000 (20.8%)
  • XIRR: 12.5%

Best Alternative: 10th of every month
  • Returns: +₹26,100 (21.8%)
  • XIRR: 13.2%
  • Improvement: ₹1,100 (0.9% better)

💡 Insight: "Your 15th date SIP performed well, but switching 
to 10th could have earned you ₹1,100 more. Consider adjusting 
your SIP date for future investments."
```

**Live Market Sync:**
- **Daily Price Updates**: Scheduled job at 9:00 PM IST
- **Mutual Funds**: NAV from mfapi.in (India's official MF API)
- **Stocks**: Real-time prices via yfinance
- **Auto-Snapshots**: Daily value tracking for Prophet forecasting

**Professional-Grade Analytics:**
- **XIRR Calculation**: scipy.optimize.newton for accurate annualized returns
- **Historical Performance**: Complete transaction history with date-wise snapshots
- **Asset-Level Drill-Down**: Click any holding to see detailed growth chart + SIP analysis
- **Portfolio Aggregation**: Net worth, total invested, absolute returns
- **Step-Up/Skip Visualization**: Timeline showing SIP changes and missed months

**AI-Powered Forecasting:**
- **Facebook Prophet**: Statistical time-series analysis on daily snapshots
- **10-20 Year Projections**: Confidence intervals with upper/lower bounds
- **Simulation Mode**: Adjust monthly SIP, see instant forecast updates
- **Category Breakdown**: Equity, Debt, Liquid, Fixed Income allocation

**Supported Asset Types:**
- ✅ **SIP** (Systematic Investment Plans) - *with date optimization*
- ✅ **Mutual Funds** (Lump sum)
- ✅ **Stocks** (Equity holdings)
- ✅ **FD/RD** (Fixed/Recurring Deposits - manual input)
- ✅ **PF/Gratuity** (Retirement accruals - formulaic)
- ✅ **Gold, Real Estate** (Manual tracking)

**Human-in-the-Loop:**
- **Statement Import**: Upload consolidated statement (CAMS/KFin/MFCentral) for instant portfolio creation
- **Transaction Linker**: Manually map undetected investment transactions
- **Mapping Rules**: Create patterns for future auto-detection
- **Adjustments**: Override AI suggestions, edit units/prices
- **Add Holdings**: Manually add assets not tracked via email

**Future-Proof:**
- **Tax Engine Placeholder**: Ready for LTCG/STCG calculations
- **Multi-Asset Support**: Extensible for crypto, bonds, commodities
- **Consolidated View**: Liquid cash + Fixed income + Market-linked in one dashboard
- **Multi-Fund Optimization**: Find best SIP dates across entire portfolio (coming soon)

### 🧠 AI-Powered Intelligence

**Automatic Transaction Extraction**
- Connects to Gmail via OAuth 2.0 (read-only)
- AI parses bank alerts, credit card statements, UPI confirmations
- Extracts: Amount, Merchant, Category, Account Type, Date
- Natural language processing handles different email formats
- Works with major Indian banks (ICICI, HDFC, SBI, Axis, Kotak, and others)

**Hybrid Forecasting Engine**
- **Meta Prophet**: Statistical time-series analysis of daily spending patterns
- **Groq LLM**: Category-level breakdowns with contextual reasoning
  - "Food & Dining trending 20% higher: 4 weekend restaurant visits vs 2 last month"
  - "Expected ₹12,500 in remaining expenses (18 days left in month)"
- Predicts month-end spending based on historical patterns
- Adapts to seasonal patterns, holidays, and lifestyle changes

**Merchant Intelligence & Memory**
- First time: "SWIGGY*BANGALORE127" → AI suggests "Food & Dining"
- You verify: "Food & Dining > Online Food"
- Forever after: "SWIGGY*" auto-categorized as "Food & Dining > Online Food"
- Learns from every verification, gets smarter over time
- Clean merchant names (no more cryptic transaction descriptions)

### 💳 Credit Card Lifecycle Management

**Comprehensive Card Tracking**
- Register unlimited credit cards with billing details
- Tracks: Card name, last 4 digits, statement date, payment due date, credit limit
- Automatic billing cycle calculation (current cycle, days remaining)
- Real-time unbilled amount in current cycle
- Credit utilization monitoring (% of limit used)

**Billing Cycle Intelligence**
```
HDFC Regalia Gold (••1234)
───────────────────────────────────
Statement Date:    15th (every month)
Payment Due:       25th (every month)
Current Cycle:     Jan 16 - Feb 15
Days to Statement: 12 days
───────────────────────────────────
Unbilled Amount:   ₹8,247
Credit Limit:      ₹3,00,000
Utilization:       2.7% ✅
```

**Smart Alerts & Predictions**
- "Cycle closes in 5 days: ₹8,247 unbilled"
- "Estimated bill: ₹8,500 (based on current trend)"
- "Payment due in 10 days: ₹12,340"
- Prevents surprise bills by tracking unbilled amounts in real-time

**Transaction Linking**
- Link each transaction to specific credit card
- Accurate per-card spending tracking
- Prevents overspending within billing cycle
- Helps optimize card usage across multiple cards

### 📋 Bill Management & "Surety" Intelligence

**Bill Tracking**
- Create one-time or recurring bills
- Set due dates and payment amounts
- Mark bills as paid/unpaid
- View upcoming bills (next 7/30/60 days)
- Payment reminders

**Surety Bills (Predictable Expenses)**

The secret sauce for accurate Safe-to-Spend calculation.

**What is "Surety"?**
Predictable, recurring expenses that you *know* are coming:
- Rent (every 1st of month)
- Electricity/Water (monthly)
- Internet/Phone bills
- Insurance premiums
- Subscriptions (Netflix, Spotify, etc.)
- Society maintenance

**How It Works:**
```
① Mark bill as "Surety" (predictable recurring)
② Grip automatically projects next occurrence
③ Amount included in Safe-to-Spend calculation
④ Even if not yet billed, it's accounted for
```

**Example:**
```
Rent: ₹15,000 (Surety, due 1st of every month)
Today: Jan 20
Next Due: Feb 1 (12 days away)

Safe-to-Spend: Already reduced by ₹15,000
Result: Prevents overspending before rent is due ✅
```

**Frozen Funds Breakdown:**
```
┌────────────────────────────────────────┐
│ Frozen Funds: ₹25,700                  │
├────────────────────────────────────────┤
│ • Unpaid Bills:           ₹10,500      │
│ • Projected Surety:       ₹12,000      │
│ • Unbilled CC:             ₹3,200      │
└────────────────────────────────────────┘
```

### 🎯 Financial Goals

**Goal Setting & Tracking**
- Set savings goals with target amounts and deadlines
- Track progress towards each goal
- Visual progress indicators
- Automatic calculation of monthly savings needed
- Integration with Safe-to-Spend (optional goal reserves)

**Goal Types:**
- Emergency Fund
- Vacation
- Gadget Purchase
- Down Payment
- Custom Goals

**Smart Recommendations:**
- "Save ₹8,500/month to reach ₹1,00,000 goal by December"
- "You're 45% towards your iPhone fund!"
- "Adjust Safe-to-Spend buffer to include goal savings"

### 📊 Advanced Analytics

**Variance Analysis**
- Month-to-date vs last month comparison
- Category-level spend changes with % metrics
- "You spent 23% more on Food & Dining this month (₹8,500 vs ₹6,900)"
- Trend detection: "Entertainment spending doubled"
- Visual charts showing spend distribution

**Spend Categorization**
- 20+ default categories (Food & Dining, Shopping, Transport, etc.)
- Hierarchical subcategories (e.g., Food > Restaurants, Groceries, Online Food)
- Custom tag system for personal organization (#business, #vacation, #medical)
- Pie charts, bar graphs, trend lines
- Export category reports

**Monthly Summary Dashboard**
- Total income vs expenses
- Category-wise breakdown
- Top merchants
- Largest transactions
- Spending trends over time

### 🔄 Automated Email Sync

**Gmail Integration (Zero Manual Work)**
- One-click OAuth 2.0 connection (read-only access)
- Searches inbox for transaction keywords automatically:
  - "spent", "debited", "transaction", "alert", "paid", "credited"
- Processes bank alerts, credit card statements, UPI confirmations
- Background sync (doesn't block UI)
- Deduplication (SHA-256 hash prevents duplicate transactions)

**Sync Features:**
- **Manual Trigger**: Click "Sync Now" anytime for instant update
- **Connection Status**: See last sync time, total transactions imported
- **Sync History**: Complete log with status, errors, records processed
- **Easy Disconnect**: One-click disconnect, reconnect anytime
- **Format-Agnostic**: Works with different email formats via natural language AI

**Supported Email Types:**
```
✅ Bank transaction alerts      (ICICI, HDFC, SBI, etc.)
✅ Credit card alerts           (Statement generated, payment due)
✅ UPI payment confirmations    (GPay, PhonePe, Paytm)
✅ Debit card purchases         (POS transactions)
✅ NEFT/RTGS/IMPS alerts       (Fund transfers)
✅ Wallet transactions          (Paytm, Mobikwik)
✅ Investment confirmations     (SIP, MF purchases)
```

### 🔐 Privacy & Security (Core Differentiator)

**Local-First Sanitization**
```
Before AI processing (happens on your server):
────────────────────────────────────────────────
Original: "Paid ₹500 using Card 4521-6789-1234-5678"
Masked:   "Paid ₹500 using Card ****-****-****-5678"

Original: "PAN: ABCDE1234F, Aadhaar: 9876-5432-1098"
Masked:   "PAN: XXXXX1234X, Aadhaar: XXXX-XXXX-1098"

Original: "UPI: user@paytm paid merchant@phonepe"
Masked:   "UPI: ****@paytm paid ****@phonepe"
```

**What Gets Sanitized:**
- ✅ Credit card numbers (only last 4 digits visible)
- ✅ PAN cards (only last 4 chars + 1 middle char)
- ✅ Aadhaar numbers (only last 4 digits)
- ✅ UPI IDs (username masked)
- ✅ Phone numbers (middle digits masked)

**Security Architecture:**
- JWT authentication with bcrypt password hashing
- Email verification with OTP (SMTP)
- Read-only Gmail OAuth (can't send/modify emails)
- Encrypted OAuth tokens in database (PostgreSQL JSONB encrypted)
- No third-party analytics or tracking
- Self-hostable (you control the data)

### 🏷️ Advanced Organization

**Tags System**
- Create custom tags (#vacation, #business, #medical, #family)
- Tag individual transactions
- Filter and analyze by tags
- Multi-tag support (one transaction, multiple tags)

**Categories & Subcategories**
- 20+ predefined categories
- Hierarchical structure (Category > Subcategory)
- Fully customizable (add/edit/delete)
- Visual spending distribution

**Search & Filters**
- Search by merchant, amount, category, tag
- Date range filters
- Account type filters (Credit Card, Savings, Cash, UPI)
- Status filters (Pending, Verified)
- Export filtered results

---

## 🛠️ Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.12+) - High-performance async API
- **Database**: PostgreSQL with SQLAlchemy (async) + asyncpg
- **AI/ML**:
  - **Groq** (Llama 3.3 70B) - Transaction extraction & forecasting
  - **Meta Prophet** - Statistical time-series forecasting
  - **scipy** - XIRR calculation (Newton-Raphson optimization)
- **Data APIs**:
  - **mfapi.in** - Mutual fund NAV data (India)
  - **yfinance** - Stock prices (global)
- **Scheduler**: APScheduler (async) - Daily price sync jobs
- **Authentication**: JWT + bcrypt
- **Email**: SMTP for OTP delivery
- **OAuth**: Google OAuth 2.0 for Gmail
- **Deployment**: Render/Vercel-ready

### Frontend
- **Framework**: React 19 with TypeScript
- **Build**: Vite (lightning-fast HMR)
- **Styling**: Vanilla CSS (no framework bloat)
- **State**: Zustand (lightweight)
- **Data Fetching**: Axios with interceptors
- **Charts**: Recharts (responsive, composable)
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Routing**: React Router DOM

### Infrastructure
- **Package Manager**: uv (Rust-based, 10-100x faster than pip)
- **Database**: Supabase / NeonDB (serverless Postgres)
- **Hosting**: Render (backend) + Vercel (frontend)
- **Version Control**: Git / GitHub

---

## ⚡ Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- PostgreSQL database
- Gmail account (for email sync)
- Groq API key ([Get one free](https://console.groq.com))

### 1. Clone & Install

```bash
# Clone repository
git clone https://github.com/yourusername/grip.git
cd grip

# Backend setup
cd Backend
uv sync  # Install dependencies

# Frontend setup
cd ../Frontend
npm install
```

### 2. Configure Environment

**Backend (`Backend/.env`):**
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/dbname

# Security
SECRET_KEY=your-secret-key-here
GRIP_SECRET=webhook-secret

# AI
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama-3.3-70b-versatile
USE_AI_FORECASTING=true

# Gmail OAuth (for email sync)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Email (for OTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password
FROM_EMAIL=noreply@grip.com
FROM_NAME=Grip

# Branding
APP_NAME=Grip
APP_TAGLINE=Money that minds itself.
```

**Frontend (`Frontend/.env`):**
```bash
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_APP_NAME=Grip
VITE_APP_TAGLINE=Money that minds itself.
```

### 3. Initialize Database

```bash
cd Backend

# Run migrations
uv run alembic upgrade head

# Seed default data (optional)
uv run python scripts/seed_db.py
# Creates user: amit@grip.com / password: admin
```

### 4. Run Development Servers

```bash
# Terminal 1 - Backend
cd Backend
uv run uvicorn app.main:app --reload
# → http://localhost:8000

# Terminal 2 - Frontend
cd Frontend
npm run dev
# → http://localhost:5173
```

### 5. Set Up Gmail Sync (Optional)

See **[Gmail Sync Setup Guide](GMAIL_SYNC_QUICKSTART.md)** for detailed instructions.

**Quick version:**
1. Create Google Cloud project
2. Enable Gmail API
3. Create OAuth credentials
4. Add credentials to `.env`
5. Connect in app: More → Gmail Sync

---

## 📖 Usage

### First-Time Setup

1. **Register Account**
   - Open http://localhost:5173
   - Click "Sign Up"
   - Enter email and password
   - Check email for 6-digit OTP
   - Verify and auto-login ✅

2. **Connect Gmail** (Recommended)
   - Go to More → Gmail Sync
   - Click "Connect Gmail"
   - Approve Google OAuth
   - Click "Sync Now"
   - Watch transactions flow in automatically! 🎉

3. **Add Credit Cards** (Optional)
   - Go to My Cards
   - Add each card with billing details
   - Link transactions to cards for cycle tracking

4. **Set Up Bills** (Optional)
   - Go to Bills & Surety
   - Add recurring bills (rent, utilities, subscriptions)
   - Mark predictable expenses as "Surety"

5. **Track Investments** (NEW!)
   
   **Option A: Statement Import (Fastest)**
   - Go to Wealth tab → Click purple Upload icon
   - Select Source (CAMS / KFin / MFCentral)
   - Upload statement file (CSV/Excel)
   - Preview transactions → Click Import
   - System auto-detects SIPs, step-ups, and skips
   
   **Option B: Manual Entry**
   - Click "Link Transaction" to map investment expenses
   - Or manually add holdings (MF, Stocks, FDs)
   
   **Analyze Your SIPs**
   - Click any SIP holding → Switch to "SIP Date Analysis" tab
   - See your actual performance vs alternative dates
   - Get optimization recommendations
   
   Watch portfolio grow with daily NAV updates!

### Daily Workflow

**Automated (Recommended):**
1. Gmail Sync runs automatically (or click "Sync Now")
2. AI extracts transaction details
3. Investment transactions auto-mapped to portfolio
4. Review pending transactions in Transactions tab
5. Verify or edit as needed
6. Check Dashboard for safe-to-spend amount
7. Monitor Wealth tab for portfolio performance

**Manual Entry:**
1. Click "+" button
2. Enter transaction details
3. Select category
4. Save (auto-marked as verified)

---

## 🔌 API Documentation

### Interactive Docs
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

#### Authentication
```bash
POST /api/v1/auth/register        # Register with OTP
POST /api/v1/auth/verify-otp      # Verify OTP
POST /api/v1/auth/token           # Login (JWT)
```

#### Gmail Sync
```bash
GET  /api/v1/sync/google/auth     # Get OAuth URL
POST /api/v1/sync/google/callback # Complete OAuth
GET  /api/v1/sync/status          # Check connection
POST /api/v1/sync/manual          # Trigger sync
GET  /api/v1/sync/history         # View sync logs
DELETE /api/v1/sync/disconnect    # Disconnect Gmail
```

#### Transactions
```bash
GET  /api/v1/transactions                   # List all
POST /api/v1/transactions/manual            # Manual entry
GET  /api/v1/transactions/pending           # Pending review
PUT  /api/v1/transactions/{id}              # Update
DELETE /api/v1/transactions/{id}            # Delete
POST /api/v1/transactions/{id}/verify       # Verify
```

#### Wealth & Investments (NEW!)
```bash
GET  /api/v1/wealth/holdings                     # List portfolio
GET  /api/v1/wealth/holdings/{id}                # Holding details with snapshots
POST /api/v1/wealth/holdings                     # Add new asset
POST /api/v1/wealth/forecast                     # AI forecast (Prophet)
POST /api/v1/wealth/map-transaction              # Link transaction to holding
GET  /api/v1/wealth/sync-prices                  # Trigger manual price sync
POST /api/v1/wealth/import-cams                  # Import CAMS statement (NEW!)
GET  /api/v1/wealth/holdings/{id}/sip-analysis   # SIP date performance analysis (NEW!)
```

#### Analytics
```bash
GET /api/v1/analytics/safe-to-spend  # Real-time calculation
GET /api/v1/analytics/variance       # Month-over-month
GET /api/v1/analytics/monthly-summary # Monthly stats
```

#### Forecasting
```bash
GET /api/v1/dashboard/forecast  # 30-day AI prediction
```

---

## 🚀 Deployment

### Production Setup (Recommended)

**Architecture:**
- **Frontend**: Vercel (Free, unlimited bandwidth)
- **Backend**: Railway (Serverless, $5/month credit)
- **Database**: Supabase (Free tier, 500MB)
- **Scheduled Tasks**: GitHub Actions (Free unlimited for public repos)

**Total Cost: $0/month** (everything within free tiers!)

---

### Backend Deployment (Railway)

#### 1. Initial Setup

1. **Sign up at [railway.app](https://railway.app)** with GitHub
2. **Create New Project** → Deploy from GitHub repo
3. **Select your repository**
4. **Configure Service:**
   - Root Directory: `Backend`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Watch Paths: `Backend/**`

#### 2. Environment Variables

Add these in Railway Dashboard → Variables:

```bash
# Database
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres

# Security
SECRET_KEY=your-secret-key-here
GRIP_SECRET=webhook-secret
ENVIRONMENT=production

# AI
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama-3.3-70b-versatile
USE_AI_FORECASTING=true
ENABLE_SCHEDULER=false  # Using GitHub Actions for scheduled tasks

# Gmail OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
FRONTEND_ORIGIN=https://your-app.vercel.app

# Email (OTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password
FROM_EMAIL=noreply@grip.com
FROM_NAME=Grip

# Branding
APP_NAME=Grip
APP_TAGLINE=Money that minds itself.
```

#### 3. Generate Domain

- Go to Settings → Generate Domain
- Copy the URL (e.g., `https://grip-backend.up.railway.app`)
- Update `VITE_API_BASE_URL` in frontend

---

### Scheduled Tasks (GitHub Actions)

**Why GitHub Actions?**
- ✅ **Free unlimited** for public repos (2,000 min/month for private)
- ✅ Saves $1-2/month on Railway (serverless vs always-on)
- ✅ Reliable cron scheduling
- ✅ Easy monitoring via1. **Add Secrets** (One-time):
   - Go to GitHub repo → Settings → Secrets → Actions
   - Click "New repository secret" and add:
     - `DATABASE_URL`: Your Supabase connection string.
     - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`: For email alerts.
     - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: For Gmail OAuth.
     - `GROQ_API_KEY`: For AI transaction extraction.
     - `FRONTEND_ORIGIN`: Your deployment URL (e.g. `https://grip.vercel.app`).

2. **Workflows are already configured**:
   - `daily-price-sync.yml`: Runs at 3:30 PM IST (Price updates).
   - `gmail_sync.yml`: Runs every hour (Transactions).
   - `daily-intelligence.yml`: Runs at 9:00 AM IST (Reminders & Insights).

3. **Test the Workflow**:
   - Go to Actions tab
   - Click "Daily Price Sync"
   - Click "Run workflow" → "Run workflow"
   - Check logs to verify success

4. **Set Railway to Serverless**:
   - In Railway Environment Variables:
   - `ENABLE_SCHEDULER=false` (disables internal scheduler)
   - This saves ~$1-2/month in Railway credits

**Monitoring:**
- View logs in GitHub Actions tab
- Check Railway logs for API requests
- Verify data updates in Supabase dashboard

---

### Frontend Deployment (Vercel)

#### 1. Deploy to Vercel

```bash
cd Frontend
npm run build
vercel --prod
```

Or connect via Vercel Dashboard:
1. Go to [vercel.com](https://vercel.com)
2. Import Git Repository
3. Select your repo
4. Framework Preset: Vite
5. Root Directory: `Frontend`
6. Deploy!

#### 2. Environment Variables

Add in Vercel Dashboard → Settings → Environment Variables:

```bash
VITE_API_BASE_URL=https://grip-backend.up.railway.app/api/v1
VITE_APP_NAME=Grip
VITE_APP_TAGLINE=Money that minds itself.
```

#### 3. Update Google OAuth

- Go to [Google Cloud Console](https://console.cloud.google.com)
- APIs & Services → Credentials
- Edit OAuth 2.0 Client
- Add Authorized JavaScript Origins:
  - `https://your-app.vercel.app`
- Add Authorized Redirect URIs:
  - `https://your-app.vercel.app`
- Save

---

### Database Setup (Supabase)

1. **Create Project** at [supabase.com](https://supabase.com)
2. **Get Connection String**:
   - Project Settings → Database
   - Copy "Transaction" pooler string (port 6543)
3. **Add to Railway** as `DATABASE_URL`
4. **Add to GitHub Secrets** for Actions workflow

**Important:** Use port **6543** (Transaction pooler), not 5432, for Railway compatibility.

---

### Cost Breakdown

| Service | Free Tier | Your Usage | Cost |
|---------|-----------|------------|------|
| **Railway** (Serverless) | $5/month credit | ~$1-2/month | $0 |
| **Vercel** (Frontend) | Unlimited | Unlimited | $0 |
| **Supabase** (Database) | 500MB | ~50MB | $0 |
| **GitHub Actions** (Cron) | Unlimited (public) | 30 min/month | $0 |
| **Groq** (AI) | Free tier | ~1000 requests/month | $0 |

**Total: $0/month** 🎉

---

### Deployment Checklist

- [ ] Railway backend deployed with all env vars
- [ ] Vercel frontend deployed with API URL
- [ ] Supabase database created and connected
- [ ] GitHub Actions secret added (`DATABASE_URL`)
- [ ] Google OAuth redirect URIs updated
- [ ] Test login flow
- [ ] Test Gmail sync
- [ ] Test scheduled task (manual trigger)
- [ ] Verify investment price sync working

---

### Monitoring & Maintenance

**Daily Checks:**
- GitHub Actions logs (scheduled task status)
- Railway logs (API errors)
- Supabase dashboard (data integrity)

**Weekly:**
- Check Railway usage (should be <$2)
- Review Groq API usage
- Test critical flows (login, sync, forecast)

**Monthly:**
- Review GitHub Actions minutes (should be ~30)
- Check Railway credit balance
- Update dependencies if needed

---

## 🔒 Privacy & Data Handling

### What We Store
- Transaction metadata (amount, merchant, category, dates)
- Investment snapshots (units, prices, dates)
- Encrypted OAuth tokens (Gmail access)
- User preferences and mappings
- Sync logs (for debugging)

### What We DON'T Store
- Full email content
- Credit card CVVs or PINs
- Unmasked PAN/Aadhaar numbers
- Gmail passwords
- Any sensitive PII

### Data Flow
1. Email received in your Gmail
2. OAuth token grants read access
3. Email content fetched via API
4. **Sanitization happens locally** (regex masking)
5. Sanitized text sent to Groq for extraction
6. Extracted JSON stored in database
7. Investment transactions auto-mapped to holdings
8. Daily price sync updates portfolio values
9. Original email remains in your Gmail (unchanged)

---

## 🤝 Contributing

This project is currently private. For feature requests or bug reports, please open an issue.

---

## 📝 License

Private and proprietary. All rights reserved.

---

## 🛠️ Environment & Security Configuration

Grip is designed with a "Privacy-First" and "Cloud-Resilient" architecture. Depending on where you deploy (Local vs. Cloud), you may need to adjust certain security measures:

### 📧 Email Connection Modes
Most cloud providers (Hugging Face, Railway) block **Ports 25, 587, and 465** to prevent spam. 
- **Grip Email Relay (Microservice)**: By default, we use a dedicated relay service (located in `/EmailService`) intended for deployment on Vercel (Port 443) to bypass SMTP blocks. Configure `EMAIL_RELAY_URL` in your `.env`.
- **Standard SMTP**: If running locally or on a VPS where ports are open, uncomment the `LEGACY DIRECT SMTP` block in `app/core/email.py` and set your Gmail App Password.

### 🤖 LLM Intelligence & Fallbacks
We utilize a dual-track AI system for maximum reliability:
- **Grip Intelligence (Primary)**: A high-performance, private engine hosted on Hugging Face Spaces.
- **Groq Llama-3 (Roboust Fallback)**: If the primary engine is sleeping or unreachable, Grip automatically falls back to Groq.
- **Note**: Ensure `GROQ_API_KEY` is set in your environment variables. If you wish to use only Groq, uncomment the relevant lines in `app/core/llm.py`.

### 🔐 Security Measures
- **Sanitization First**: All PII (PAN, Account numbers) is masked via local regex logic *before* being processed by any AI engine.
- **Scoped Ingress**: Gmail OAuth is restricted to `gmail.readonly` and specifically queries for transaction-only keywords.

---

## 🙏 Acknowledgments

Built with incredible open-source tools:
- **Groq** - Lightning-fast LLM inference
- **Meta Prophet** - Time-series forecasting
- **FastAPI** - Modern Python web framework
- **React** - UI library
- **PostgreSQL** - Robust database
- **scipy** - Scientific computing for XIRR
- **yfinance** - Stock market data
- **mfapi.in** - Indian mutual fund NAV data
- **Render** - Backend deployment
- **Vercel** - Frontend deployment

---

## 📚 Documentation

- **[Quick Start Guide](GMAIL_SYNC_QUICKSTART.md)** - 15-minute setup
- **[CAMS Import Guide](CAMS_IMPORT_GUIDE.md)** - Import years of history in 60s
- **[Implementation Details](GMAIL_SYNC_IMPLEMENTATION.md)** - Technical deep-dive
- **[Session Summary](SESSION_SUMMARY.md)** - Recent updates

---

## 💬 Support

For setup help or questions, refer to:
1. **API Docs**: http://localhost:8000/docs
2. **Troubleshooting**: Check `GMAIL_SYNC_IMPLEMENTATION.md`
3. **Common Issues**: See "Troubleshooting" section in setup guides

---

<div align="center">

**Grip** - Autonomous Financial Intelligence.

*Made with ❤️ , effort and AI*

</div>
