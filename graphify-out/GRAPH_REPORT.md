# Graph Report - Grip  (2026-11-22)

## Corpus Check
- 214 files · ~171,691 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 30 file(s) not represented in the graph (top: .xml 10, (none) 9, .example 3)

## Summary
- 1975 nodes · 5444 edges · 123 communities (74 shown, 49 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 388 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `77df95a9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- analytics/service.py
- portfolio_statement.py
- CreditCardService
- Dashboard.tsx
- typing
- User
- SettleUpService
- lucide-react
- Transactions.tsx
- OfflineGame.tsx
- wealth/service.py
- App.tsx
- More.tsx
- wealth/schemas.py
- NotificationService
- GoalService
- bills/router.py
- BillService
- SyncService
- deps.py
- BillsPage.tsx
- dashboard/router.py
- Transaction
- haptics.ts
- AnomalyService
- generate_portfolio_statement_excel
- SettleUpService
- WealthService
- Loader
- .calculate_xirr
- AssistantService
- webauthn_service.py
- get_current_user
- SettleUp.tsx
- Apple Design
- app/main.py
- dependencies
- Sync.tsx
- compilerOptions
- InvestmentSnapshot
- compilerOptions
- get_sync_history
- wealth/router.py
- .get_asset_price
- .get_holding_investment_history
- FastAPI
- .train_and_forecast_next_month
- get_spend_trends
- ✨ Key Features
- devDependencies
- User
- GripRadar.tsx
- Colors
- eslint.config.js
- manifest.json
- Key Endpoints
- ExampleInstrumentedTest.java
- Assistant.tsx
- auth/schemas.py
- sync/service.py
- GRIP
- Improve UI
- package.json
- 🚀 Deployment
- Antigravity UI & Motion Design Expert
- 2. Sections in `README.md` to Check & Update
- MainActivity.java
- LocalLLMEngine
- interface
- Color usage
- Palette generation
- .sync_all_holdings_prices
- vite.config.ts
- ⚡ Quick Start
- 🌟 What Makes Grip Different
- Contrast
- Palette structure
- Token naming
- Grip UI Design System
- global_exception_handler
- anomaly/types.ts
- Color formats
- scripts
- Skeleton.tsx
- interface
- EmailService/vercel.json
- 🛠️ Technology Stack
- 🔒 Privacy & Data Handling
- 🛠️ Environment & Security Configuration
- firebase.ts
- vite-env.d.ts
- tsconfig.json
- Frontend/vercel.json
- sw.js
- Grip

## God Nodes (most connected - your core abstractions)
1. `User` - 145 edges
2. `get_current_user()` - 100 edges
3. `WealthService` - 75 edges
4. `get_db()` - 74 edges
5. `react` - 71 edges
6. `Transaction` - 62 edges
7. `lucide-react` - 59 edges
8. `TransactionService` - 49 edges
9. `AnalyticsService` - 48 edges
10. `BillService` - 42 edges

## Surprising Connections (you probably didn't know these)
- `🔐 Security Measures` --references--> `PIISanitizingFormatter`  [INFERRED]
  README.md → Backend/app/core/logging_config.py
- `query_assistant()` --uses--> `AssistantQueryRequest`  [INFERRED]
  Backend/app/features/assistant/router.py → Backend/app/features/assistant/schemas.py
- `AssistantService` --uses--> `AssistantQueryResponse`  [INFERRED]
  Backend/app/features/assistant/service.py → Backend/app/features/assistant/schemas.py
- `CreditCardService` --uses--> `CardExposureItem`  [INFERRED]
  Backend/app/features/credit_cards/service.py → Backend/app/features/analytics/schemas.py
- `CreditCardService` --uses--> `CardExposureSummary`  [INFERRED]
  Backend/app/features/credit_cards/service.py → Backend/app/features/analytics/schemas.py

## Import Cycles
- None detected.

## Communities (123 total, 49 thin omitted)

### Community 0 - "analytics/service.py"
Cohesion: 0.07
Nodes (31): run_monthly_report(), AccrualBurnSummary, AssetMovement, CardExposureItem, CardExposureSummary, CategoryTrendMonth, CategoryTrendsResponse, CategoryVariance (+23 more)

### Community 1 - "portfolio_statement.py"
Cohesion: 0.09
Nodes (12): Bill, CreditCard, auto_fit_columns(), build_banner(), generate_portfolio_statement_workbook(), get_type_str(), generate_csv_export(), generate_portfolio_statement_excel() (+4 more)

### Community 2 - "CreditCardService"
Cohesion: 0.08
Nodes (18): create_credit_card(), deactivate_credit_card(), get_billing_cycle_info(), get_card_exposure(), get_credit_card(), get_grace_period_optimizer(), list_credit_cards(), update_credit_card() (+10 more)

### Community 3 - "Dashboard.tsx"
Cohesion: 0.07
Nodes (57): CategoryTrendEvolution(), CategoryTrendEvolutionProps, PALETTE, MonthlyExpenseCalendar(), MonthlyExpenseCalendarProps, SpendTrendChart(), SpendTrendChartProps, AIForecast (+49 more)

### Community 4 - "typing"
Cohesion: 0.22
Nodes (8): Base, AnomalyFlag, SubCategory, SettleUpEntry, SettleUpPeerContact, AccountType, MerchantMapping, TransactionStatus

### Community 5 - "User"
Cohesion: 0.12
Nodes (27): get_db(), send_otp_email(), create_access_token(), get_password_hash(), verify_password(), BiometricsAssertionPayload, BiometricsLoginOptionsPayload, BiometricsLoginVerifyPayload (+19 more)

### Community 6 - "SettleUpService"
Cohesion: 0.07
Nodes (15): PeerBalance, Config, PeerContactOut, Config, PeerContactUpdate, Config, SendEmailReminderRequest, SendEmailReminderResponse (+7 more)

### Community 7 - "lucide-react"
Cohesion: 0.14
Nodes (23): PasswordVerifyModal(), PasswordVerifyModalProps, InvestmentSimulatorModal(), ImportSource, StatementImportModal(), StatementImportModalProps, Transaction, Holding (+15 more)

### Community 8 - "Transactions.tsx"
Cohesion: 0.12
Nodes (38): SliceState, SplitTransactionModal(), SplitTransactionModalProps, CalculatorDrawer(), CalculatorDrawerProps, evaluateExpression(), CATEGORIZED_LUCIDE_ICONS, CategoryIcon() (+30 more)

### Community 9 - "OfflineGame.tsx"
Cohesion: 0.08
Nodes (28): Footer(), FooterProps, Layout(), DockItem(), NAV_ITEMS, Navbar(), NavItem, Sidebar() (+20 more)

### Community 11 - "App.tsx"
Cohesion: 0.10
Nodes (31): AddEntry, Analytics, AnomalyRadar, App(), Assistant, Bills, CardOptimizer, Categories (+23 more)

### Community 12 - "More.tsx"
Cohesion: 0.12
Nodes (27): ProtectedRoute(), SyncTrendChart(), Button(), ButtonProps, Card(), CardProps, ColorSelectorProps, PRESET_COLORS (+19 more)

### Community 13 - "wealth/schemas.py"
Cohesion: 0.09
Nodes (32): batch_map_recurring(), AssetType, AutoDetectResponse, BatchMapRecurringRequest, BatchMapResponse, CAMSImportRequest, CAMSImportResponse, CAMSTransaction (+24 more)

### Community 14 - "NotificationService"
Cohesion: 0.08
Nodes (8): send_email(), run_lifestyle_insights(), run_surety_reminders(), NotificationService, EmailAttachment, EmailRequest, read_root(), send_email()

### Community 15 - "GoalService"
Cohesion: 0.18
Nodes (8): Goal, FeasibilityCheck, GoalBase, GoalCreate, GoalResponse, Config, GoalUpdate, GoalService

### Community 16 - "bills/router.py"
Cohesion: 0.17
Nodes (9): create_bill(), create_exclusion(), delete_bill(), get_bill(), get_upcoming_bills(), list_bills(), list_sureties(), mark_bill_paid() (+1 more)

### Community 17 - "BillService"
Cohesion: 0.11
Nodes (10): BillExclusion, BillBase, BillCreate, BillResponse, Config, BillUpdate, MarkPaidRequest, SuretyExclusionCreate (+2 more)

### Community 18 - "SyncService"
Cohesion: 0.08
Nodes (9): run_daily_anomaly_scan(), run_db_maintenance(), run_gmail_sync(), run_inactivity_contingency_check(), run_settle_up_email_reminders(), run_weekly_insights(), start_scheduler(), SyncLog (+1 more)

### Community 19 - "deps.py"
Cohesion: 0.29
Nodes (4): check_goal_feasibility(), create_goal(), delete_goal(), get_my_goals()

### Community 20 - "BillsPage.tsx"
Cohesion: 0.20
Nodes (15): BILL_CATEGORIES, BillsPage(), getCategoryMeta(), TabFilter, Bill, Surety, suretyQueryKey, useAddBill() (+7 more)

### Community 21 - "dashboard/router.py"
Cohesion: 0.18
Nodes (9): get_financial_forecast(), get_investments_dashboard(), get_liquidity_dashboard(), get_category_daily_expenses(), get_category_expenses_history(), get_daily_expenses(), get_discretionary_daily_expenses(), get_monthly_category_breakdown() (+1 more)

### Community 22 - "Transaction"
Cohesion: 0.06
Nodes (29): Category, CategoryBase, CategoryCreate, CategoryResponse, Config, CategoryUpdate, SubCategoryBase, SubCategoryCreate (+21 more)

### Community 23 - "haptics.ts"
Cohesion: 0.09
Nodes (32): badgeClasses, iconColors, icons, ToastContainer(), AddHoldingModal(), AddHoldingModalProps, HoldingDetailsModal(), HoldingDetailsModalProps (+24 more)

### Community 24 - "AnomalyService"
Cohesion: 0.09
Nodes (7): dismiss_all_flags(), dismiss_flag(), get_anomaly_flags(), AnomalyFlagResponse, AnomalyListResponse, AnomalyScanResponse, AnomalyService

### Community 26 - "SettleUpService"
Cohesion: 0.23
Nodes (10): create_ledger_entry(), delete_settle_up_entry(), get_all_contacts(), get_peer_balances(), get_peer_contact(), get_peer_history(), send_email_reminder(), update_settle_up_entry() (+2 more)

### Community 28 - "Loader"
Cohesion: 0.18
Nodes (20): GripFistMark(), Loader(), LoaderProps, CreditCardDetailsPage(), CreditCardsPage(), CycleInfoCard(), Props, GraceOptimizerView() (+12 more)

### Community 31 - "webauthn_service.py"
Cohesion: 0.19
Nodes (8): PasskeyCredential, _cleanup_challenges(), get_rp_info(), _is_localhost_allowed(), _is_trusted_origin(), pop_challenge(), store_challenge(), WebAuthnService

### Community 32 - "get_current_user"
Cohesion: 0.19
Nodes (14): scan_anomalies(), get_current_user(), create_manual_transaction(), delete_transaction(), get_all_transactions(), get_categories(), get_pending_transactions(), get_split_group() (+6 more)

### Community 33 - "SettleUp.tsx"
Cohesion: 0.18
Nodes (22): LedgerEntry, LedgerEntryCreate, PeerBalance, PeerContactUpdate, useAddLedgerEntry(), useDeleteSettleUpEntry(), usePeerBalances(), usePeerHistory() (+14 more)

### Community 34 - "Apple Design"
Cohesion: 0.09
Nodes (21): 10. Gesture design details (the "feel" checklist), 11. Frame-level smoothness, 12. Materials & depth — translucency conveys hierarchy, 13. Multimodal feedback — motion + sound + haptics, 14. Reduced motion & accessibility, 15. Typography — optical sizing, tracking, leading, 16. Design foundations — the eight principles, 17. Process (+13 more)

### Community 35 - "app/main.py"
Cohesion: 0.07
Nodes (9): get_settings(), Settings, PIISanitizingFormatter, setup_logging(), AuthenticationMiddleware, privacy_policy(), root(), terms_of_service() (+1 more)

### Community 36 - "dependencies"
Cohesion: 0.08
Nodes (24): dependencies, @aparajita/capacitor-biometric-auth@^10.0.0, axios@^1.13.2, @capacitor/android@^8.6.2, @capacitor/network@^8.0.1, date-fns@^4.1.0, framer-motion@^12.26.2, lucide-react@^0.562.0 (+16 more)

### Community 37 - "Sync.tsx"
Cohesion: 0.18
Nodes (21): SyncTrendChartProps, useAutoSync(), useConnectGmail(), useDisconnectGmail(), useGmailStatus(), useManualSync(), useSyncHistory(), useSyncTrends() (+13 more)

### Community 38 - "compilerOptions"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+13 more)

### Community 40 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+11 more)

### Community 41 - "get_sync_history"
Cohesion: 0.17
Nodes (9): disconnect_gmail(), get_google_flow(), get_sync_history(), get_sync_status(), get_sync_trends(), google_auth(), google_callback(), manual_sync() (+1 more)

### Community 42 - "wealth/router.py"
Cohesion: 0.14
Nodes (17): User, analyze_sip_date_performance(), auto_detect_portfolio(), create_holding(), delete_holding(), get_forecast(), get_holding_details(), get_holding_investment_history() (+9 more)

### Community 47 - "FastAPI"
Cohesion: 0.07
Nodes (9): get_llm_service(), LLMService, AssistantQueryRequest, AssistantQueryResponse, generate(), GenerateRequest, GenerateResponse, lifespan() (+1 more)

### Community 49 - ".train_and_forecast_next_month"
Cohesion: 0.13
Nodes (5): CategoryForecast, ForecastResponse, ForecastingService, is_recurring(), LightGBMForecaster

### Community 50 - "get_spend_trends"
Cohesion: 0.23
Nodes (6): get_burden_calculation(), get_category_trends(), get_monthly_summary(), get_safe_to_spend(), get_spend_trends(), get_variance_analysis()

### Community 51 - "✨ Key Features"
Cohesion: 0.12
Nodes (16): 📊 Advanced Analytics, 🏷️ Advanced Organization & Metadata, 🧠 AI-Powered Intelligence, 🔄 Automated Email Sync, 📋 Bill Management & "Surety" Intelligence, 💳 Credit Card Lifecycle Management, 🎨 Design & Theme Parity, 🧪 Experimental Intelligence Hub (+8 more)

### Community 52 - "devDependencies"
Cohesion: 0.12
Nodes (16): config, devDependencies, autoprefixer@^10.4.23, @capacitor/cli@^8.6.2, postcss@^8.5.6, @resvg/resvg-js@^2.6.2, tailwindcss@^4.1.18, @types/node@^24.10.1 (+8 more)

### Community 55 - "User"
Cohesion: 0.29
Nodes (7): create_category(), create_sub_category(), delete_category(), delete_sub_category(), get_categories(), update_category(), update_sub_category()

### Community 57 - "GripRadar.tsx"
Cohesion: 0.14
Nodes (21): getAnomalyMeta(), GripRadar, GripRadarProps, AnomalyFlag, AnomalyListResponse, AnomalyScanResponse, useAnomalyFlags(), useDismissAllAnomalies() (+13 more)

### Community 58 - "Colors"
Cohesion: 0.15
Nodes (13): A system is ramps, not colors, Before you finish, Colors, Every step has a job, Fill exactly one action per view, Hold the hue across the ramp, Match the project's color system, Measure the rendered pair, then report (+5 more)

### Community 59 - "eslint.config.js"
Cohesion: 0.15
Nodes (12): eslint@^9.39.1, @eslint/js@^9.39.1, eslint-plugin-react-hooks@^7.0.1, eslint-plugin-react-refresh@^0.4.24, globals@^16.5.0, typescript-eslint@^8.46.4, eslint, @eslint/js (+4 more)

### Community 60 - "manifest.json"
Cohesion: 0.15
Nodes (12): background_color, description, display, display_override, icons, id, name, orientation (+4 more)

### Community 61 - "Key Endpoints"
Cohesion: 0.15
Nodes (13): Analytics, 🔌 API Documentation, Authentication, Export, Financial Goals & Targets, Forecasting, Gmail Sync, Interactive Docs (+5 more)

### Community 64 - "Assistant.tsx"
Cohesion: 0.30
Nodes (9): useAssistantQuery(), AssistantQueryRequest, AssistantQueryResponse, AssistantQueryResultItem, ChatMessage, Assistant(), formatTime(), SUGGESTIONS (+1 more)

### Community 65 - "auth/schemas.py"
Cohesion: 0.29
Nodes (10): EmergencyContactResponse, EmergencyContactUpdate, PasswordVerification, Token, TokenData, UserBase, UserCreate, UserResponse (+2 more)

### Community 67 - "GRIP"
Cohesion: 0.17
Nodes (11): 🙏 Acknowledgments, 🤝 Contributing, Daily Workflow, 📚 Documentation, First-Time Setup, GRIP, 🚀 How It Works, 📝 License (+3 more)

### Community 68 - "Improve UI"
Cohesion: 0.18
Nodes (9): Design plan template, 1. Select the surface, 2. Reconstruct the local system, 3. Prove findings, 4. Vet findings, 5. Report, 6. Specify selected changes, Boundaries (+1 more)

### Community 69 - "package.json"
Cohesion: 0.15
Nodes (12): @capacitor/core@^8.6.2, xlsx@^0.18.5, @types/react@^19.2.5, typescript@~5.9.3, name, private, type, version (+4 more)

### Community 70 - "🚀 Deployment"
Cohesion: 0.13
Nodes (15): 1. Deploy to Vercel, 1. Initial Setup, 2. Environment Variables, 2. Environment Variables, 3. Generate Domain, 3. Update Google OAuth, Backend Deployment (Railway), Cost Breakdown (+7 more)

### Community 71 - "Antigravity UI & Motion Design Expert"
Cohesion: 0.20
Nodes (9): Antigravity UI & Motion Design Expert, 📐 Design Principles (The "Antigravity" Vibe), Example, 🚧 Execution Constraints, Limitations, 🎬 Motion & Animation Rules, 🛠️ Preferred Tech Stack, 🎯 Role Overview (+1 more)

### Community 72 - "2. Sections in `README.md` to Check & Update"
Cohesion: 0.22
Nodes (8): 1. Trigger Conditions, 2. Sections in `README.md` to Check & Update, 3. Strict Rules & Anti-Patterns, A. Key USPs & Feature Highlights (`## 🌟 What Makes Grip Different` / `## ✨ Key Features`), B. Pipeline Diagrams (`## 🚀 How It Works`), C. Technology Stack (`## 🛠️ Technology Stack`), D. Environment Configuration (`## ⚡ Quick Start` -> `Backend/.env`), README Updater & Documentation Sync Rule

### Community 76 - "interface"
Cohesion: 0.25
Nodes (7): interface, default_prompt, display_name, short_description, policy, allow_implicit_invocation, products

### Community 79 - "Color usage"
Cohesion: 0.29
Nodes (7): Color across cultures, Color usage, Gradients, Light, dark and increased contrast, One color, one meaning, One colored action per view, Use tokens in their role

### Community 80 - "Palette generation"
Cohesion: 0.29
Nodes (7): Choosing the switching mechanism, Dark mode, Palette generation, Several hues at once, Start from the brand color, Use a color library, What a correct ramp looks like

### Community 82 - "vite.config.ts"
Cohesion: 0.29
Nodes (6): @tailwindcss/vite@^4.3.3, vite@^7.2.4, @vitejs/plugin-react@^5.1.1, @tailwindcss/vite, vite, @vitejs/plugin-react

### Community 83 - "⚡ Quick Start"
Cohesion: 0.29
Nodes (7): 1. Clone & Install, 2. Configure Environment, 3. Initialize Database, 4. Run Development Servers, 5. Set Up Gmail Sync (Optional), Prerequisites, ⚡ Quick Start

### Community 84 - "🌟 What Makes Grip Different"
Cohesion: 0.29
Nodes (7): 🛡️ Frictionless, Private Onboarding, 🤖 Hybrid Intelligence — Fast, Private, Reliable, 💰 Know Your True Spending Power, 🔒 Privacy Built-In, Not Bolted-On, 📊 Professional-Grade Portfolio Simulation, 🎯 Timing Alpha: The Only Platform for Precision Wealth Analytics, 🌟 What Makes Grip Different

### Community 85 - "Contrast"
Cohesion: 0.33
Nodes (6): APCA thresholds (recommended), Contrast, Fixing a failing pair (on request), Quick approximations, WCAG 2 thresholds (for legal compliance), What to check

### Community 86 - "Palette structure"
Cohesion: 0.33
Nodes (6): Auditing an existing palette, Every step has a job, Neutrals, Palette structure, Status colors, What a system needs

### Community 87 - "Token naming"
Cohesion: 0.33
Nodes (6): Anti-patterns, In Tailwind projects, Naming grammar, The role inventory, Token naming, Two tiers

### Community 88 - "Grip UI Design System"
Cohesion: 0.33
Nodes (5): 1. Tokens & Theme Parity (`Frontend/src/index.css`), 2. Color Semantics (Strict Financial Meaning), 3. Forbidden Anti-Patterns, 4. Icon & Typography Scale, Grip UI Design System

### Community 92 - "anomaly/types.ts"
Cohesion: 0.33
Nodes (5): AnomalyFlag, AnomalyListResponse, AnomalyScanResponse, AnomalySeverity, AnomalyType

### Community 93 - "Color formats"
Cohesion: 0.40
Nodes (5): Choosing a notation, Color formats, Converting, Gamut, Modern CSS worth knowing

### Community 94 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, preview

### Community 96 - "interface"
Cohesion: 0.50
Nodes (3): interface, display_name, short_description

### Community 98 - "EmailService/vercel.json"
Cohesion: 0.50
Nodes (3): builds, devCommand, routes

### Community 102 - "🛠️ Technology Stack"
Cohesion: 0.50
Nodes (4): Backend, Frontend, Infrastructure, 🛠️ Technology Stack

### Community 103 - "🔒 Privacy & Data Handling"
Cohesion: 0.50
Nodes (4): Data Flow, 🔒 Privacy & Data Handling, What We DON'T Store, What We Store

### Community 104 - "🛠️ Environment & Security Configuration"
Cohesion: 0.50
Nodes (4): 📧 Email Connection Modes, 🛠️ Environment & Security Configuration, 🤖 LLM Intelligence & Fallbacks, 🔐 Security Measures

## Knowledge Gaps
- **1 isolated node(s):** `Grip`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 732 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **49 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `wealth/router.py` to `analytics/service.py`, `portfolio_statement.py`, `CreditCardService`, `typing`, `User`, `wealth/schemas.py`, `NotificationService`, `bills/router.py`, `SyncService`, `deps.py`, `dashboard/router.py`, `AnomalyService`, `generate_portfolio_statement_excel`, `SettleUpService`, `webauthn_service.py`, `get_current_user`, `get_sync_history`, `FastAPI`, `get_spend_trends`, `User`, `sync/service.py`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Are the 112 inferred relationships involving `User` (e.g. with `run_daily_anomaly_scan()` and `run_gmail_sync()`) actually correct?**
  _`User` has 112 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Grip` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `analytics/service.py` be split into smaller, more focused modules?**
  _Cohesion score 0.07040328092959672 - nodes in this community are weakly interconnected._
- **Why does `PIISanitizingFormatter` connect `app/main.py` to `🛠️ Environment & Security Configuration`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Are the 25 inferred relationships involving `WealthService` (e.g. with `TransactionService` and `analyze_sip_date_performance()`) actually correct?**
  _`WealthService` has 25 INFERRED edges - model-reasoned connections that need verification._
- **Should `portfolio_statement.py` be split into smaller, more focused modules?**
  _Cohesion score 0.09365079365079365 - nodes in this community are weakly interconnected._