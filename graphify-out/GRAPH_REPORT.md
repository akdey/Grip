# Graph Report - Grip  (2026-11-21)

## Corpus Check
- 208 files · ~169,546 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 31 file(s) not represented in the graph (top: (none) 10, .xml 10, .example 3)

## Summary
- 1967 nodes · 5415 edges · 120 communities (78 shown, 42 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 397 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6245040b`
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
- app/main.py
- App.tsx
- More.tsx
- wealth/schemas.py
- NotificationService
- GoalService
- BaseModel
- bills/router.py
- SyncService
- portfolio_statement.py
- BillsPage.tsx
- email.py
- TransactionService
- get_spend_trends
- BaseLLMCacheAdapter
- generate_portfolio_statement_excel
- wealth/service.py
- WealthService
- Loader
- .simulate_historical_investment
- scheduler.py
- webauthn_service.py
- get_current_user
- SettleUp.tsx
- Apple Design
- Transaction
- dependencies
- Sync.tsx
- compilerOptions
- InvestmentSnapshot
- compilerOptions
- get_sync_history
- wealth/router.py
- .get_asset_price
- post
- get_financial_forecast
- transactions/schemas.py
- CategoryService
- .train_and_forecast_next_month
- generate_transactions_excel
- ✨ Key Features
- devDependencies
- llm_cache_adapter.py
- TaskAwarePrefixCache
- User
- GripRadar.tsx
- Colors
- eslint.config.js
- manifest.json
- Key Endpoints
- ExampleInstrumentedTest.java
- Any
- sync/service.py
- auth/schemas.py
- categories/schemas.py
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
- Color usage
- Palette generation
- vite.config.ts
- ⚡ Quick Start
- 🌟 What Makes Grip Different
- Contrast
- Palette structure
- Token naming
- Grip UI Design System
- TransientTaskPrefixAdapter
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
1. `User` - 145 edges
2. `get_current_user()` - 98 edges
3. `WealthService` - 76 edges
4. `get_db()` - 73 edges
5. `react` - 70 edges
6. `Transaction` - 63 edges
7. `lucide-react` - 58 edges
8. `TransactionService` - 50 edges
9. `AnalyticsService` - 49 edges
10. `BillService` - 42 edges

## Surprising Connections (you probably didn't know these)
- `🤖 Hybrid Intelligence — Fast, Private, Reliable` --references--> `TransientTaskPrefixAdapter`  [INFERRED]
  README.md → Backend/app/core/llm_cache_adapter.py
- `🔐 Security Measures` --references--> `PIISanitizingFormatter`  [INFERRED]
  README.md → Backend/app/core/logging_config.py
- `lifespan()` --uses--> `Base`  [INFERRED]
  Backend/app/main.py → Backend/app/core/database.py
- `test_emergency_contact()` --indirect_call--> `send_email()`  [INFERRED]
  Backend/app/features/auth/router.py → Backend/app/core/email.py
- `ForecastingService` --uses--> `LLMService`  [INFERRED]
  Backend/app/features/forecasting/service.py → Backend/app/core/llm.py

## Import Cycles
- None detected.

## Communities (120 total, 42 thin omitted)

### Community 0 - "analytics/service.py"
Cohesion: 0.08
Nodes (29): run_monthly_report(), AccrualBurnSummary, AssetMovement, CategoryTrendMonth, CategoryTrendsResponse, CategoryVariance, FrozenFundsBreakdown, IdentifiedObligation (+21 more)

### Community 1 - "AnomalyService"
Cohesion: 0.09
Nodes (9): AnomalyFlag, dismiss_all_flags(), dismiss_flag(), get_anomaly_flags(), scan_anomalies(), AnomalyFlagResponse, AnomalyListResponse, AnomalyScanResponse (+1 more)

### Community 2 - "CreditCardService"
Cohesion: 0.07
Nodes (21): CardExposureItem, CardExposureSummary, create_credit_card(), deactivate_credit_card(), get_billing_cycle_info(), get_card_exposure(), get_credit_card(), get_grace_period_optimizer() (+13 more)

### Community 3 - "Dashboard.tsx"
Cohesion: 0.06
Nodes (58): recharts@^3.6.0, CategoryTrendEvolution(), CategoryTrendEvolutionProps, PALETTE, MonthlyExpenseCalendar(), MonthlyExpenseCalendarProps, SpendTrendChart(), SpendTrendChartProps (+50 more)

### Community 4 - "typing"
Cohesion: 0.22
Nodes (7): Base, Category, SubCategory, SettleUpEntry, MerchantMapping, TransactionStatus, InvestmentMappingRule

### Community 5 - "User"
Cohesion: 0.11
Nodes (27): get_db(), send_otp_email(), create_access_token(), get_password_hash(), verify_password(), BiometricsAssertionPayload, BiometricsLoginOptionsPayload, BiometricsLoginVerifyPayload (+19 more)

### Community 6 - "SettleUpService"
Cohesion: 0.13
Nodes (4): run_settle_up_email_reminders(), SettleUpPeerContact, SendEmailReminderResponse, SettleUpService

### Community 7 - "lucide-react"
Cohesion: 0.08
Nodes (42): AddHoldingModal(), AddHoldingModalProps, HoldingDetailsModal(), HoldingDetailsModalProps, InvestmentSimulatorModal(), InvestmentSimulatorModalProps, SimulationResult, SIPAnalysisData (+34 more)

### Community 8 - "Transactions.tsx"
Cohesion: 0.12
Nodes (40): SliceState, SplitTransactionModal(), SplitTransactionModalProps, CalculatorDrawer(), CalculatorDrawerProps, evaluateExpression(), CATEGORIZED_LUCIDE_ICONS, CategoryIcon() (+32 more)

### Community 9 - "react"
Cohesion: 0.07
Nodes (32): zustand@^5.0.10, Footer(), FooterProps, Layout(), DockItem(), NAV_ITEMS, Navbar(), NavItem (+24 more)

### Community 10 - "app/main.py"
Cohesion: 0.08
Nodes (9): get_settings(), Settings, PIISanitizingFormatter, setup_logging(), AuthenticationMiddleware, privacy_policy(), root(), terms_of_service() (+1 more)

### Community 11 - "App.tsx"
Cohesion: 0.08
Nodes (37): AddEntry, Analytics, AnomalyRadar, App(), Bills, CardOptimizer, Categories, CreditCardDetails (+29 more)

### Community 12 - "More.tsx"
Cohesion: 0.11
Nodes (31): Sidebar(), SyncTrendChart(), Button(), ButtonProps, Card(), CardProps, ColorSelectorProps, PRESET_COLORS (+23 more)

### Community 13 - "wealth/schemas.py"
Cohesion: 0.09
Nodes (32): batch_map_recurring(), AssetType, AutoDetectResponse, BatchMapRecurringRequest, BatchMapResponse, CAMSImportRequest, CAMSImportResponse, CAMSTransaction (+24 more)

### Community 14 - "NotificationService"
Cohesion: 0.14
Nodes (3): send_email(), run_lifestyle_insights(), NotificationService

### Community 15 - "GoalService"
Cohesion: 0.12
Nodes (12): Goal, check_goal_feasibility(), create_goal(), delete_goal(), get_my_goals(), FeasibilityCheck, GoalBase, GoalCreate (+4 more)

### Community 16 - "BaseModel"
Cohesion: 0.11
Nodes (14): PeerBalance, Config, PeerContactOut, Config, PeerContactUpdate, Config, SendEmailReminderRequest, SettleUpEntryBase (+6 more)

### Community 17 - "bills/router.py"
Cohesion: 0.08
Nodes (20): Bill, BillExclusion, create_bill(), create_exclusion(), delete_bill(), get_bill(), get_upcoming_bills(), list_bills() (+12 more)

### Community 19 - "portfolio_statement.py"
Cohesion: 0.10
Nodes (9): CreditCard, auto_fit_columns(), build_banner(), generate_portfolio_statement_workbook(), get_type_str(), generate_csv_export(), check_upcoming_billing_cycles(), check_upcoming_bills() (+1 more)

### Community 20 - "BillsPage.tsx"
Cohesion: 0.12
Nodes (25): BILL_CATEGORIES, BillsPage(), getCategoryMeta(), TabFilter, Bill, Surety, suretyQueryKey, useAddBill() (+17 more)

### Community 21 - "email.py"
Cohesion: 0.20
Nodes (4): EmailAttachment, EmailRequest, read_root(), send_email()

### Community 23 - "get_spend_trends"
Cohesion: 0.23
Nodes (6): get_burden_calculation(), get_category_trends(), get_monthly_summary(), get_safe_to_spend(), get_spend_trends(), get_variance_analysis()

### Community 25 - "generate_portfolio_statement_excel"
Cohesion: 0.28
Nodes (3): export_portfolio_statement(), export_transactions_csv(), generate_portfolio_statement_excel()

### Community 28 - "Loader"
Cohesion: 0.18
Nodes (19): GripFistMark(), Loader(), LoaderProps, CreditCardDetailsPage(), CreditCardsPage(), CycleInfoCard(), Props, GraceOptimizerView() (+11 more)

### Community 30 - "scheduler.py"
Cohesion: 0.13
Nodes (8): run_daily_anomaly_scan(), run_daily_price_sync(), run_db_maintenance(), run_gmail_sync(), run_inactivity_contingency_check(), run_surety_reminders(), run_weekly_insights(), start_scheduler()

### Community 31 - "webauthn_service.py"
Cohesion: 0.19
Nodes (8): PasskeyCredential, _cleanup_challenges(), get_rp_info(), _is_localhost_allowed(), _is_trusted_origin(), pop_challenge(), store_challenge(), WebAuthnService

### Community 32 - "get_current_user"
Cohesion: 0.22
Nodes (12): create_manual_transaction(), delete_transaction(), get_all_transactions(), get_categories(), get_pending_transactions(), get_split_group(), get_tags_summary(), get_transaction() (+4 more)

### Community 33 - "SettleUp.tsx"
Cohesion: 0.20
Nodes (22): LedgerEntry, LedgerEntryCreate, PeerBalance, PeerContactUpdate, useAddLedgerEntry(), useDeleteSettleUpEntry(), usePeerBalances(), usePeerHistory() (+14 more)

### Community 34 - "Apple Design"
Cohesion: 0.09
Nodes (21): 10. Gesture design details (the "feel" checklist), 11. Frame-level smoothness, 12. Materials & depth — translucency conveys hierarchy, 13. Multimodal feedback — motion + sound + haptics, 14. Reduced motion & accessibility, 15. Typography — optical sizing, tracking, leading, 16. Design foundations — the eight principles, 17. Process (+13 more)

### Community 35 - "Transaction"
Cohesion: 0.23
Nodes (6): get_category_daily_expenses(), get_category_expenses_history(), get_daily_expenses(), get_discretionary_daily_expenses(), get_monthly_category_breakdown(), get_raw_transactions_for_forecasting()

### Community 36 - "dependencies"
Cohesion: 0.10
Nodes (21): dependencies, @aparajita/capacitor-biometric-auth@^10.0.0, @capacitor/android@^8.6.2, @capacitor/core@^8.6.2, @capacitor/network@^8.0.1, date-fns@^4.1.0, framer-motion@^12.26.2, lucide-react@^0.562.0 (+13 more)

### Community 37 - "Sync.tsx"
Cohesion: 0.19
Nodes (19): SyncTrendChartProps, useAutoSync(), useConnectGmail(), useDisconnectGmail(), useGmailStatus(), useManualSync(), useSyncHistory(), GmailStatus (+11 more)

### Community 38 - "compilerOptions"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+13 more)

### Community 39 - "InvestmentSnapshot"
Cohesion: 0.11
Nodes (3): InvestmentSnapshot, xnpv(), xnpv_prime()

### Community 40 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+11 more)

### Community 41 - "get_sync_history"
Cohesion: 0.19
Nodes (9): disconnect_gmail(), get_google_flow(), get_sync_history(), get_sync_status(), get_sync_trends(), google_auth(), google_callback(), manual_sync() (+1 more)

### Community 42 - "wealth/router.py"
Cohesion: 0.13
Nodes (10): analyze_sip_date_performance(), delete_holding(), get_holding_details(), get_holding_investment_history(), get_holdings(), get_unassigned_transactions(), search_mutual_funds(), trigger_price_sync() (+2 more)

### Community 43 - ".get_asset_price"
Cohesion: 0.15
Nodes (4): InvestmentHolding, create_holding(), InvestmentHoldingCreate, TaxEngine

### Community 44 - "post"
Cohesion: 0.29
Nodes (4): auto_detect_portfolio(), get_forecast(), map_transaction(), unmap_transaction()

### Community 45 - "get_financial_forecast"
Cohesion: 0.60
Nodes (3): get_financial_forecast(), get_investments_dashboard(), get_liquidity_dashboard()

### Community 47 - "transactions/schemas.py"
Cohesion: 0.18
Nodes (15): CategoriesResponse, ManualTransactionCreate, Config, TagSummary, TransactionBase, Config, TransactionCreate, TransactionResponse (+7 more)

### Community 49 - ".train_and_forecast_next_month"
Cohesion: 0.13
Nodes (5): CategoryForecast, ForecastResponse, ForecastingService, is_recurring(), LightGBMForecaster

### Community 51 - "✨ Key Features"
Cohesion: 0.12
Nodes (16): 📊 Advanced Analytics, 🏷️ Advanced Organization & Metadata, 🧠 AI-Powered Intelligence, 🔄 Automated Email Sync, 📋 Bill Management & "Surety" Intelligence, 💳 Credit Card Lifecycle Management, 🎨 Design & Theme Parity, 🧪 Experimental Intelligence Hub (+8 more)

### Community 52 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, autoprefixer@^10.4.23, postcss@^8.5.6, tailwindcss@^4.1.18, @types/node@^24.10.1, @types/react@^19.2.5, @types/react-dom@^19.2.3, typescript@~5.9.3 (+7 more)

### Community 55 - "User"
Cohesion: 0.16
Nodes (18): get_current_user(), User, create_category(), create_sub_category(), delete_category(), delete_sub_category(), get_categories(), update_category() (+10 more)

### Community 57 - "GripRadar.tsx"
Cohesion: 0.27
Nodes (11): getAnomalyMeta(), GripRadar, GripRadarProps, AnomalyFlag, AnomalyListResponse, AnomalyScanResponse, useAnomalyFlags(), useDismissAllAnomalies() (+3 more)

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

### Community 64 - "sync/service.py"
Cohesion: 0.08
Nodes (9): get_llm_service(), LLMService, generate(), GenerateRequest, GenerateResponse, get_sanitizer_service(), SanitizerService, lifespan() (+1 more)

### Community 65 - "auth/schemas.py"
Cohesion: 0.29
Nodes (10): EmergencyContactResponse, EmergencyContactUpdate, PasswordVerification, Token, TokenData, UserBase, UserCreate, UserResponse (+2 more)

### Community 66 - "categories/schemas.py"
Cohesion: 0.27
Nodes (10): CategoryBase, CategoryCreate, CategoryResponse, Config, CategoryUpdate, SubCategoryBase, SubCategoryCreate, SubCategoryResponse (+2 more)

### Community 67 - "GRIP"
Cohesion: 0.17
Nodes (11): 🙏 Acknowledgments, 🤝 Contributing, Daily Workflow, 📚 Documentation, First-Time Setup, GRIP, 🚀 How It Works, 📝 License (+3 more)

### Community 68 - "Improve UI"
Cohesion: 0.18
Nodes (9): Design plan template, 1. Select the surface, 2. Reconstruct the local system, 3. Prove findings, 4. Vet findings, 5. Report, 6. Specify selected changes, Boundaries (+1 more)

### Community 69 - "package.json"
Cohesion: 0.18
Nodes (10): axios@^1.13.2, react-dom@^19.2.0, @resvg/resvg-js@^2.6.2, name, private, type, version, axios (+2 more)

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
Cohesion: 0.33
Nodes (6): 🛡️ Frictionless, Private Onboarding, 💰 Know Your True Spending Power, 🔒 Privacy Built-In, Not Bolted-On, 📊 Professional-Grade Portfolio Simulation, 🎯 Timing Alpha: The Only Platform for Precision Wealth Analytics, 🌟 What Makes Grip Different

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
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 726 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **42 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `User` to `analytics/service.py`, `AnomalyService`, `CreditCardService`, `typing`, `User`, `SettleUpService`, `wealth/schemas.py`, `NotificationService`, `GoalService`, `bills/router.py`, `SyncService`, `portfolio_statement.py`, `get_spend_trends`, `generate_portfolio_statement_excel`, `.simulate_historical_investment`, `scheduler.py`, `webauthn_service.py`, `get_current_user`, `Transaction`, `get_sync_history`, `wealth/router.py`, `.get_asset_price`, `post`, `get_financial_forecast`, `sync/service.py`, `.import_cams_statement`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Are the 113 inferred relationships involving `User` (e.g. with `run_daily_anomaly_scan()` and `run_gmail_sync()`) actually correct?**
  _`User` has 113 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Grip` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `analytics/service.py` be split into smaller, more focused modules?**
  _Cohesion score 0.07668231611893583 - nodes in this community are weakly interconnected._
- **Why does `WealthService` connect `WealthService` to `sync/service.py`, `analytics/service.py`, `typing`, `InvestmentSnapshot`, `wealth/router.py`, `.get_asset_price`, `post`, `wealth/schemas.py`, `.import_cams_statement`, `CategoryService`, `SyncService`, `TransactionService`, `wealth/service.py`, `.simulate_historical_investment`, `scheduler.py`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Are the 26 inferred relationships involving `WealthService` (e.g. with `SyncService` and `TransactionService`) actually correct?**
  _`WealthService` has 26 INFERRED edges - model-reasoned connections that need verification._
- **Should `AnomalyService` be split into smaller, more focused modules?**
  _Cohesion score 0.08843537414965986 - nodes in this community are weakly interconnected._