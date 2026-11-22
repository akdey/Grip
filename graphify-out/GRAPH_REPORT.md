# Graph Report - Grip  (2026-11-22)

## Corpus Check
- 208 files · ~169,102 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 30 file(s) not represented in the graph (top: .xml 10, (none) 9, .example 3)

## Summary
- 1973 nodes · 5411 edges · 128 communities (83 shown, 45 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 388 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bd64450a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- analytics/service.py
- AnomalyService
- CreditCardService
- Dashboard.tsx
- typing
- User
- SettleUpService
- lucide-react
- Transactions.tsx
- react
- sync/service.py
- App.tsx
- More.tsx
- wealth/schemas.py
- NotificationService
- check_goal_feasibility
- bills/service.py
- BillService
- SyncService
- generate_portfolio_statement_excel
- BillsPage.tsx
- email.py
- Transaction
- update_credit_card
- mark_bill_paid
- generate_portfolio_statement_excel
- dismiss_flag
- WealthService
- Loader
- .simulate_historical_investment
- scheduler.py
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
- credit_cards/router.py
- get_financial_forecast
- toast.ts
- CategoryService
- .train_and_forecast_next_month
- get_billing_cycle_dates
- ✨ Key Features
- devDependencies
- llm_cache_adapter.py
- TaskAwarePrefixCache
- User
- .__init__
- GripRadar.tsx
- Colors
- eslint.config.js
- manifest.json
- Key Endpoints
- ExampleInstrumentedTest.java
- Any
- get_llm_service
- auth/schemas.py
- anomaly/router.py
- GRIP
- Improve UI
- package.json
- 🚀 Deployment
- Antigravity UI & Motion Design Expert
- 2. Sections in `README.md` to Check & Update
- MainActivity.java
- LocalLLMEngine
- .import_cams_statement
- interface
- AuthenticationMiddleware
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
- TransientTaskPrefixAdapter
- Frontend Deployment (Vercel)
- global_exception_handler
- anomaly/types.ts
- Color formats
- scripts
- Skeleton.tsx
- interface
- EmailService/vercel.json
- @capacitor/cli
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
1. `User` - 144 edges
2. `get_current_user()` - 98 edges
3. `WealthService` - 75 edges
4. `get_db()` - 73 edges
5. `react` - 70 edges
6. `Transaction` - 62 edges
7. `lucide-react` - 58 edges
8. `TransactionService` - 49 edges
9. `AnalyticsService` - 48 edges
10. `BillService` - 42 edges

## Surprising Connections (you probably didn't know these)
- `🤖 Hybrid Intelligence — Fast, Private, Reliable` --references--> `TransientTaskPrefixAdapter`  [INFERRED]
  README.md → Backend/app/core/llm_cache_adapter.py
- `🔐 Security Measures` --references--> `PIISanitizingFormatter`  [INFERRED]
  README.md → Backend/app/core/logging_config.py
- `ForecastingService` --uses--> `LLMService`  [INFERRED]
  Backend/app/features/forecasting/service.py → Backend/app/core/llm.py
- `NotificationService` --uses--> `LLMService`  [INFERRED]
  Backend/app/features/notifications/service.py → Backend/app/core/llm.py
- `SyncService` --uses--> `LLMService`  [INFERRED]
  Backend/app/features/sync/service.py → Backend/app/core/llm.py

## Import Cycles
- None detected.

## Communities (128 total, 45 thin omitted)

### Community 0 - "analytics/service.py"
Cohesion: 0.06
Nodes (35): get_burden_calculation(), get_category_trends(), get_monthly_summary(), get_safe_to_spend(), get_spend_trends(), get_variance_analysis(), AccrualBurnSummary, AssetMovement (+27 more)

### Community 3 - "Dashboard.tsx"
Cohesion: 0.07
Nodes (53): CategoryTrendEvolution(), CategoryTrendEvolutionProps, PALETTE, MonthlyExpenseCalendar(), MonthlyExpenseCalendarProps, SpendTrendChart(), SpendTrendChartProps, AIForecast (+45 more)

### Community 4 - "typing"
Cohesion: 0.16
Nodes (9): Base, AnomalyFlag, SubCategory, SettleUpEntry, SettleUpPeerContact, MerchantMapping, TransactionStatus, AssetType (+1 more)

### Community 5 - "User"
Cohesion: 0.12
Nodes (27): get_db(), send_otp_email(), create_access_token(), get_password_hash(), verify_password(), BiometricsAssertionPayload, BiometricsLoginOptionsPayload, BiometricsLoginVerifyPayload (+19 more)

### Community 6 - "SettleUpService"
Cohesion: 0.06
Nodes (15): PeerBalance, Config, PeerContactOut, Config, PeerContactUpdate, Config, SendEmailReminderRequest, SendEmailReminderResponse (+7 more)

### Community 7 - "lucide-react"
Cohesion: 0.07
Nodes (53): SyncTrendChart(), PasswordVerifyModal(), PasswordVerifyModalProps, AddHoldingModal(), AddHoldingModalProps, HoldingDetailsModal(), HoldingDetailsModalProps, InvestmentSimulatorModal() (+45 more)

### Community 8 - "Transactions.tsx"
Cohesion: 0.11
Nodes (42): SliceState, SplitTransactionModal(), SplitTransactionModalProps, CalculatorDrawer(), CalculatorDrawerProps, evaluateExpression(), CATEGORIZED_LUCIDE_ICONS, CategoryIcon() (+34 more)

### Community 9 - "react"
Cohesion: 0.07
Nodes (29): Footer(), FooterProps, Layout(), DockItem(), NAV_ITEMS, Navbar(), NavItem, ErrorBoundary (+21 more)

### Community 10 - "sync/service.py"
Cohesion: 0.08
Nodes (4): get_settings(), Settings, PIISanitizingFormatter, setup_logging()

### Community 11 - "App.tsx"
Cohesion: 0.10
Nodes (31): AddEntry, Analytics, AnomalyRadar, App(), Bills, CardOptimizer, Categories, CreditCardDetails (+23 more)

### Community 12 - "More.tsx"
Cohesion: 0.15
Nodes (21): Sidebar(), Button(), ButtonProps, Card(), CardProps, ColorSelectorProps, PRESET_COLORS, Input (+13 more)

### Community 13 - "wealth/schemas.py"
Cohesion: 0.08
Nodes (29): batch_map_recurring(), get_forecast(), map_transaction(), simulate_investment(), unmap_transaction(), AssetType, AutoDetectResponse, BatchMapRecurringRequest (+21 more)

### Community 14 - "NotificationService"
Cohesion: 0.12
Nodes (4): send_email(), run_lifestyle_insights(), run_monthly_report(), NotificationService

### Community 15 - "check_goal_feasibility"
Cohesion: 0.29
Nodes (4): check_goal_feasibility(), create_goal(), delete_goal(), get_my_goals()

### Community 16 - "bills/service.py"
Cohesion: 0.16
Nodes (14): BillBase, BillCreate, BillResponse, Config, BillUpdate, MarkPaidRequest, SuretyExclusionCreate, UpcomingBillsResponse (+6 more)

### Community 17 - "BillService"
Cohesion: 0.09
Nodes (6): Bill, BillExclusion, BillService, Goal, GoalCreate, GoalService

### Community 19 - "generate_portfolio_statement_excel"
Cohesion: 0.11
Nodes (7): auto_fit_columns(), build_banner(), generate_portfolio_statement_workbook(), get_type_str(), generate_csv_export(), generate_portfolio_statement_excel(), generate_transactions_excel()

### Community 20 - "BillsPage.tsx"
Cohesion: 0.20
Nodes (15): BILL_CATEGORIES, BillsPage(), getCategoryMeta(), TabFilter, Bill, Surety, suretyQueryKey, useAddBill() (+7 more)

### Community 21 - "email.py"
Cohesion: 0.13
Nodes (5): clean_pycache(), EmailAttachment, EmailRequest, read_root(), send_email()

### Community 22 - "Transaction"
Cohesion: 0.07
Nodes (23): get_category_daily_expenses(), get_category_expenses_history(), get_daily_expenses(), get_discretionary_daily_expenses(), get_monthly_category_breakdown(), get_raw_transactions_for_forecasting(), Transaction, CategoriesResponse (+15 more)

### Community 23 - "update_credit_card"
Cohesion: 0.13
Nodes (8): create_credit_card(), deactivate_credit_card(), get_billing_cycle_info(), get_card_exposure(), get_credit_card(), get_grace_period_optimizer(), list_credit_cards(), update_credit_card()

### Community 24 - "mark_bill_paid"
Cohesion: 0.15
Nodes (9): create_bill(), create_exclusion(), delete_bill(), get_bill(), get_upcoming_bills(), list_bills(), list_sureties(), mark_bill_paid() (+1 more)

### Community 26 - "dismiss_flag"
Cohesion: 0.22
Nodes (4): dismiss_all_flags(), dismiss_flag(), get_anomaly_flags(), scan_anomalies()

### Community 27 - "WealthService"
Cohesion: 0.13
Nodes (3): InvestmentTransactionMapping, auto_detect_portfolio(), WealthService

### Community 28 - "Loader"
Cohesion: 0.18
Nodes (19): GripFistMark(), Loader(), LoaderProps, CreditCardDetailsPage(), CreditCardsPage(), CycleInfoCard(), Props, GraceOptimizerView() (+11 more)

### Community 30 - "scheduler.py"
Cohesion: 0.13
Nodes (8): run_daily_anomaly_scan(), run_db_maintenance(), run_gmail_sync(), run_inactivity_contingency_check(), run_settle_up_email_reminders(), run_surety_reminders(), run_weekly_insights(), start_scheduler()

### Community 31 - "webauthn_service.py"
Cohesion: 0.25
Nodes (8): PasskeyCredential, _cleanup_challenges(), get_rp_info(), _is_localhost_allowed(), _is_trusted_origin(), pop_challenge(), store_challenge(), WebAuthnService

### Community 32 - "get_current_user"
Cohesion: 0.26
Nodes (13): User, create_manual_transaction(), delete_transaction(), get_all_transactions(), get_categories(), get_pending_transactions(), get_split_group(), get_tags_summary() (+5 more)

### Community 33 - "SettleUp.tsx"
Cohesion: 0.18
Nodes (22): LedgerEntry, LedgerEntryCreate, PeerBalance, PeerContactUpdate, useAddLedgerEntry(), useDeleteSettleUpEntry(), usePeerBalances(), usePeerHistory() (+14 more)

### Community 34 - "Apple Design"
Cohesion: 0.09
Nodes (21): 10. Gesture design details (the "feel" checklist), 11. Frame-level smoothness, 12. Materials & depth — translucency conveys hierarchy, 13. Multimodal feedback — motion + sound + haptics, 14. Reduced motion & accessibility, 15. Typography — optical sizing, tracking, leading, 16. Design foundations — the eight principles, 17. Process (+13 more)

### Community 35 - "app/main.py"
Cohesion: 0.19
Nodes (5): SyncLog, lifespan(), privacy_policy(), root(), terms_of_service()

### Community 36 - "dependencies"
Cohesion: 0.10
Nodes (21): dependencies, axios@^1.13.2, @capacitor/core@^8.6.2, @capacitor/network@^8.0.1, date-fns@^4.1.0, framer-motion@^12.26.2, lucide-react@^0.562.0, react@^19.2.0 (+13 more)

### Community 37 - "Sync.tsx"
Cohesion: 0.20
Nodes (19): SyncTrendChartProps, useAutoSync(), useConnectGmail(), useDisconnectGmail(), useGmailStatus(), useManualSync(), useSyncHistory(), GmailStatus (+11 more)

### Community 38 - "compilerOptions"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+13 more)

### Community 39 - "InvestmentSnapshot"
Cohesion: 0.11
Nodes (5): InvestmentSnapshot, SIPDateAnalysisResponse, SIPDatePerformance, xnpv(), xnpv_prime()

### Community 40 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+11 more)

### Community 41 - "get_sync_history"
Cohesion: 0.17
Nodes (9): disconnect_gmail(), get_google_flow(), get_sync_history(), get_sync_status(), get_sync_trends(), google_auth(), google_callback(), manual_sync() (+1 more)

### Community 42 - "wealth/router.py"
Cohesion: 0.13
Nodes (10): analyze_sip_date_performance(), delete_holding(), get_holding_details(), get_holding_investment_history(), get_holdings(), get_unassigned_transactions(), search_mutual_funds(), trigger_price_sync() (+2 more)

### Community 43 - ".get_asset_price"
Cohesion: 0.15
Nodes (4): InvestmentHolding, create_holding(), InvestmentHoldingCreate, TaxEngine

### Community 44 - "credit_cards/router.py"
Cohesion: 0.38
Nodes (9): CardGraceEvaluation, CreditCardBase, CreditCardCreate, CreditCardCycleInfo, CreditCardResponse, Config, CreditCardUpdate, CreditCardWithCycleInfo (+1 more)

### Community 45 - "get_financial_forecast"
Cohesion: 0.60
Nodes (3): get_financial_forecast(), get_investments_dashboard(), get_liquidity_dashboard()

### Community 47 - "toast.ts"
Cohesion: 0.24
Nodes (9): badgeClasses, iconColors, icons, ToastContainer(), DEFAULT_DURATIONS, ToastItem, ToastStore, ToastType (+1 more)

### Community 48 - "CategoryService"
Cohesion: 0.11
Nodes (19): Category, create_category(), create_sub_category(), delete_category(), delete_sub_category(), get_categories(), update_category(), update_sub_category() (+11 more)

### Community 49 - ".train_and_forecast_next_month"
Cohesion: 0.13
Nodes (5): CategoryForecast, ForecastResponse, ForecastingService, is_recurring(), LightGBMForecaster

### Community 50 - "get_billing_cycle_dates"
Cohesion: 0.29
Nodes (4): get_billing_cycle_dates(), check_upcoming_billing_cycles(), check_upcoming_bills(), get_notification_summary()

### Community 51 - "✨ Key Features"
Cohesion: 0.12
Nodes (16): 📊 Advanced Analytics, 🏷️ Advanced Organization & Metadata, 🧠 AI-Powered Intelligence, 🔄 Automated Email Sync, 📋 Bill Management & "Surety" Intelligence, 💳 Credit Card Lifecycle Management, 🎨 Design & Theme Parity, 🧪 Experimental Intelligence Hub (+8 more)

### Community 52 - "devDependencies"
Cohesion: 0.12
Nodes (17): devDependencies, autoprefixer@^10.4.23, postcss@^8.5.6, @resvg/resvg-js@^2.6.2, tailwindcss@^4.1.18, @types/node@^24.10.1, @types/react@^19.2.5, @types/react-dom@^19.2.3 (+9 more)

### Community 55 - "User"
Cohesion: 0.22
Nodes (11): get_current_user(), create_ledger_entry(), delete_settle_up_entry(), get_all_contacts(), get_peer_balances(), get_peer_contact(), get_peer_history(), send_email_reminder() (+3 more)

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

### Community 64 - "get_llm_service"
Cohesion: 0.14
Nodes (6): get_llm_service(), LLMService, generate(), GenerateRequest, GenerateResponse, _warmup_llm()

### Community 65 - "auth/schemas.py"
Cohesion: 0.29
Nodes (10): EmergencyContactResponse, EmergencyContactUpdate, PasswordVerification, Token, TokenData, UserBase, UserCreate, UserResponse (+2 more)

### Community 66 - "anomaly/router.py"
Cohesion: 0.67
Nodes (3): AnomalyFlagResponse, AnomalyListResponse, AnomalyScanResponse

### Community 67 - "GRIP"
Cohesion: 0.17
Nodes (11): 🙏 Acknowledgments, 🤝 Contributing, Daily Workflow, 📚 Documentation, First-Time Setup, GRIP, 🚀 How It Works, 📝 License (+3 more)

### Community 68 - "Improve UI"
Cohesion: 0.18
Nodes (9): Design plan template, 1. Select the surface, 2. Reconstruct the local system, 3. Prove findings, 4. Vet findings, 5. Report, 6. Specify selected changes, Boundaries (+1 more)

### Community 69 - "package.json"
Cohesion: 0.18
Nodes (10): @aparajita/capacitor-biometric-auth@^10.0.0, @capacitor/android@^8.6.2, @simplewebauthn/browser@^14.0.0, name, private, type, version, @aparajita/capacitor-biometric-auth (+2 more)

### Community 70 - "🚀 Deployment"
Cohesion: 0.18
Nodes (11): 1. Initial Setup, 2. Environment Variables, 3. Generate Domain, Backend Deployment (Railway), Cost Breakdown, Database Setup (Supabase), 🚀 Deployment, Deployment Checklist (+3 more)

### Community 71 - "Antigravity UI & Motion Design Expert"
Cohesion: 0.20
Nodes (9): Antigravity UI & Motion Design Expert, 📐 Design Principles (The "Antigravity" Vibe), Example, 🚧 Execution Constraints, Limitations, 🎬 Motion & Animation Rules, 🛠️ Preferred Tech Stack, 🎯 Role Overview (+1 more)

### Community 72 - "2. Sections in `README.md` to Check & Update"
Cohesion: 0.22
Nodes (8): 1. Trigger Conditions, 2. Sections in `README.md` to Check & Update, 3. Strict Rules & Anti-Patterns, A. Key USPs & Feature Highlights (`## 🌟 What Makes Grip Different` / `## ✨ Key Features`), B. Pipeline Diagrams (`## 🚀 How It Works`), C. Technology Stack (`## 🛠️ Technology Stack`), D. Environment Configuration (`## ⚡ Quick Start` -> `Backend/.env`), README Updater & Documentation Sync Rule

### Community 75 - ".import_cams_statement"
Cohesion: 0.25
Nodes (4): import_cams_statement(), CAMSImportRequest, CAMSImportResponse, CAMSTransaction

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

### Community 90 - "Frontend Deployment (Vercel)"
Cohesion: 0.50
Nodes (4): 1. Deploy to Vercel, 2. Environment Variables, 3. Update Google OAuth, Frontend Deployment (Vercel)

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

### Community 100 - "@capacitor/cli"
Cohesion: 0.50
Nodes (3): config, @capacitor/cli@^8.6.2, @capacitor/cli

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
- **45 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `get_current_user` to `analytics/service.py`, `typing`, `User`, `sync/service.py`, `wealth/schemas.py`, `NotificationService`, `check_goal_feasibility`, `bills/service.py`, `generate_portfolio_statement_excel`, `update_credit_card`, `mark_bill_paid`, `generate_portfolio_statement_excel`, `dismiss_flag`, `WealthService`, `scheduler.py`, `webauthn_service.py`, `app/main.py`, `get_sync_history`, `wealth/router.py`, `.get_asset_price`, `credit_cards/router.py`, `get_financial_forecast`, `CategoryService`, `User`, `anomaly/router.py`, `.import_cams_statement`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Are the 112 inferred relationships involving `User` (e.g. with `run_daily_anomaly_scan()` and `run_gmail_sync()`) actually correct?**
  _`User` has 112 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Grip` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `analytics/service.py` be split into smaller, more focused modules?**
  _Cohesion score 0.06347469220246238 - nodes in this community are weakly interconnected._
- **Why does `WealthService` connect `WealthService` to `analytics/service.py`, `typing`, `InvestmentSnapshot`, `sync/service.py`, `wealth/router.py`, `.get_asset_price`, `wealth/schemas.py`, `.import_cams_statement`, `.sync_all_holdings_prices`, `Transaction`, `.__init__`, `.simulate_historical_investment`, `scheduler.py`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Are the 25 inferred relationships involving `WealthService` (e.g. with `TransactionService` and `analyze_sip_date_performance()`) actually correct?**
  _`WealthService` has 25 INFERRED edges - model-reasoned connections that need verification._
- **Should `AnomalyService` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._