                                                                                                           
 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 Credit-Based Subscription System for Axel                                                                 
  
 Context                                                                                                   
                                                                                                
 Axel currently has no payment or usage gating — anyone with an account can generate unlimited videos at
 our cost. Google Veo 3.1 charges $1.20–$3.20 per 8-second video, making unlimited access financially
 unsustainable. This plan adds a credit-based subscription system using Polar.sh as the payment provider,
 with a Pro plan ($29/month) and Enterprise "Contact Sales" tier.

 ---
 Pricing & Credit Design

 Our API Costs (per operation)
 ┌───────────────────────────────────┬────────────────────┐
 │             Operation             │      Our Cost      │
 ├───────────────────────────────────┼────────────────────┤
 │ Video Gen (Fast, 8s, 720p)        │ ~$1.20             │
 ├───────────────────────────────────┼────────────────────┤
 │ Video Gen (Standard, 8s, 720p)    │ ~$3.20             │
 ├───────────────────────────────────┼────────────────────┤
 │ Video Extension                   │ Same as generation │
 ├───────────────────────────────────┼────────────────────┤
 │ Face Analysis (Gemini Flash)      │ ~$0.01             │
 ├───────────────────────────────────┼────────────────────┤
 │ Prompt Enhancement (Gemini Flash) │ ~$0.001            │
 └───────────────────────────────────┴────────────────────┘
 Credit Costs (per operation)
 ┌─────────────────────────────┬─────────┐
 │          Operation          │ Credits │
 ├─────────────────────────────┼─────────┤
 │ Video Generation (Standard) │ 25      │
 ├─────────────────────────────┼─────────┤
 │ Video Generation (Fast)     │ 10      │
 ├─────────────────────────────┼─────────┤
 │ Video Extension (Standard)  │ 25      │
 ├─────────────────────────────┼─────────┤
 │ Video Extension (Fast)      │ 10      │
 ├─────────────────────────────┼─────────┤
 │ Face Analysis               │ 5       │
 ├─────────────────────────────┼─────────┤
 │ Prompt Enhancement          │ Free    │
 └─────────────────────────────┴─────────┘
 Plans
 ┌─────────┬──────────────────────────────┬───────────────────────┐
 │         │             Pro              │      Enterprise       │
 ├─────────┼──────────────────────────────┼───────────────────────┤
 │ Price   │ $29/month                    │ Contact Sales         │
 ├─────────┼──────────────────────────────┼───────────────────────┤
 │ Credits │ 300/month                    │ Custom                │
 ├─────────┼──────────────────────────────┼───────────────────────┤
 │ Trial   │ 3-day free trial, 50 credits │ —                     │
 ├─────────┼──────────────────────────────┼───────────────────────┤
 │ Status  │ Build now                    │ "Contact" button only │
 └─────────┴──────────────────────────────┴───────────────────────┘
 Unit economics (Pro): 300 credits ≈ 12 standard videos ($38.40 cost) or 30 fast videos ($36 cost). At
 $29/month, margins are tight but the fast model keeps us viable. Most users will mix fast/standard.

 Trial: 50 credits = ~5 fast video generations or 2 standard — matches the "around 5 video generations"
 target.

 ---
 Implementation Plan

 Phase 1: Database Foundation

 New files:

 1. backend/app/core/exceptions.py — Custom InsufficientCreditsError(required, available)
 2. backend/app/models/subscription.py — Subscription model:
   - id, user_id (FK users, unique index), plan (enum: pro), status (enum:
 trialing/active/canceled/expired/revoked)
   - polar_subscription_id (unique), polar_customer_id, polar_product_id
   - credits_balance, credits_total (allocated this period)
   - is_trial, trial_started_at, trial_ends_at
   - current_period_start, current_period_end, canceled_at
   - Relationship: user, credit_transactions
 3. backend/app/models/credit_transaction.py — Append-only audit log:
   - id, subscription_id (FK), user_id (FK)
   - type (enum: allocation/trial_allocation/deduction/refund/expiration/adjustment)
   - amount (+/-), balance_after, operation_type, description
   - job_id (nullable), polar_order_id (nullable)
 4. backend/app/models/polar_event.py — Webhook idempotency:
   - id, polar_event_id (unique index), event_type, processed_at

 Modified files:

 5. backend/app/models/user.py — Add subscription = relationship("Subscription", back_populates="user",
 uselist=False)
 6. backend/app/models/__init__.py — Import & export new models
 7. backend/alembic/env.py — Import new models for autogenerate
 8. Generate migration: alembic revision --autogenerate -m "add_subscriptions_and_credits" then alembic
 upgrade head

 ---
 Phase 2: Backend Services & Config

 Modified files:

 9. backend/requirements.txt — Add polar-sdk
 10. backend/app/config.py — Add settings:
 POLAR_ACCESS_TOKEN: str = ""
 POLAR_WEBHOOK_SECRET: str = ""
 POLAR_PRO_PRODUCT_ID: str = ""
 POLAR_SANDBOX: bool = True
 POLAR_SUCCESS_URL: str = "http://localhost:3000/subscription/success"
 CREDITS_PRO_MONTHLY: int = 300
 CREDITS_TRIAL: int = 50
 TRIAL_DAYS: int = 3

 New files:

 11. backend/app/services/subscription_service.py — Core business logic:
   - get_active_subscription(db, user_id) → Subscription | None
   - create_trial(db, user_id) → Subscription (50 credits, 3-day expiry)
   - activate_subscription(db, user_id, polar_data) → allocate 300 credits
   - handle_renewal(db, polar_subscription_id, polar_order_id) → reset credits to 300
   - cancel_subscription(db, polar_subscription_id) → mark canceled
   - revoke_subscription(db, polar_subscription_id) → immediate termination
   - deduct_credits(db, user_id, amount, operation_type, job_id) — uses SELECT ... FOR UPDATE to prevent
 race conditions
   - refund_credits(db, user_id, amount, job_id, operation_type) — for failed jobs
   - refund_credits_sync(user_id, amount, job_id, operation_type) — sync version for Celery workers (uses
 sync_engine pattern from existing video_tasks.py:33)
 12. backend/app/services/polar_service.py — Polar SDK wrapper:
   - create_checkout(user_id, email) → {checkout_url, checkout_id}
   - verify_webhook(payload, headers) → parsed event
   - Init: Polar(access_token=..., server="sandbox" if POLAR_SANDBOX else "production")
 13. backend/app/schemas/subscription.py — Pydantic schemas:
   - SubscriptionStatusResponse (has_subscription, status, plan, credits_balance, credits_total, is_trial,
  trial_ends_at, current_period_end)
   - CheckoutResponse (checkout_url, checkout_id)
   - CreditTransactionResponse (id, type, amount, balance_after, operation_type, description, created_at)

 ---
 Phase 3: API Layer

 New files:

 14. backend/app/api/subscriptions.py — Mounted at /api/subscriptions:
   - GET /status — Returns subscription + credit balance (uses get_current_user)
   - POST /checkout — Creates Polar checkout, returns URL
   - POST /start-trial — Creates trial subscription (if none exists)
   - GET /portal — Returns Polar customer portal URL
   - GET /transactions — Paginated credit history
 15. backend/app/api/webhooks.py — Mounted at /api/webhooks (NO auth):
   - POST /polar — Verifies signature, checks idempotency, handles:
       - subscription.created → create Subscription record
     - subscription.active → activate + allocate credits
     - subscription.canceled → mark canceled
     - subscription.revoked → revoke immediately
     - order.created (billing_reason=subscription_cycle) → reset credits for new period

 Modified files:

 16. backend/app/api/deps.py — Add require_active_subscription dependency:
   - Depends on get_current_user + get_db
   - Checks for subscription with status in (active, trialing, canceled)
   - Validates trial hasn't expired, canceled period hasn't ended
   - Returns 402 if no valid subscription
 17. backend/app/api/ai.py — Add to each endpoint:
   - All endpoints: add subscription: Subscription = Depends(require_active_subscription)
   - generate_video: deduct 25 or 10 credits (based on use_fast_model) before dispatching task
   - extend_video: deduct 25 or 10 credits before dispatching
   - analyze_face: deduct 5 credits before dispatching
   - enhance_prompt: no credit deduction (free), but still requires subscription
   - On InsufficientCreditsError: return 402 with {detail, required, available}
 18. backend/app/main.py — Register new routers:
 from app.api import subscriptions, webhooks
 app.include_router(subscriptions.router, prefix="/api/subscriptions", tags=["Subscriptions"])
 app.include_router(webhooks.router, prefix="/api/webhooks", tags=["Webhooks"])
 18. Add InsufficientCreditsError exception handler returning 402.

 ---
 Phase 4: Celery Worker Credit Refunds

 Modified files:

 19. backend/app/tasks/video_tasks.py — In _execute_video_operation, when a job fails permanently (all
 retries exhausted), call refund_credits_sync(user_id, credit_cost, job_id, operation_type). The
 credit_cost and operation_type need to be passed through from the task kwargs. Use the existing
 sync_engine pattern (line 33).
 20. backend/app/tasks/face_tasks.py — Same pattern: refund 5 credits on permanent analyze_face failure.

 ---
 Phase 5: Frontend Types & API Client

 New files:

 21. frontend/lib/types/subscription.ts:
 interface SubscriptionStatus {
   has_subscription: boolean
   status: string | null  // trialing, active, canceled, expired, revoked
   plan: string | null
   credits_balance: number
   credits_total: number
   is_trial: boolean
   trial_ends_at: string | null
   current_period_end: string | null
 }

 Modified files:

 22. frontend/lib/api.ts — Add subscriptionApi:
   - getStatus() → GET /api/subscriptions/status
   - createCheckout() → POST /api/subscriptions/checkout
   - startTrial() → POST /api/subscriptions/start-trial
   - getPortalUrl() → GET /api/subscriptions/portal
   - getTransactions(page, limit) → GET /api/subscriptions/transactions
   - Update apiFetch to detect 402 status codes

 ---
 Phase 6: Frontend Context & Components

 New files:

 23. frontend/lib/contexts/SubscriptionContext.tsx — Provider + useSubscription() hook:
   - Fetches /api/subscriptions/status on mount (when authenticated)
   - Exposes creditsBalance, hasSubscription, isTrial, refreshSubscription()
 24. frontend/components/SubscriptionGate.tsx — Wraps protected areas:
   - No subscription → modal with "Start Free Trial" / "Subscribe" buttons
   - Trial expired → "Trial Expired — Subscribe Now" modal
   - Active → renders children
 25. frontend/components/ui/CreditDisplay.tsx — Compact credit indicator for sidebar:
   - Shows credits_balance / credits_total with progress bar
   - Color changes: green (>50 remaining), amber (<50), red (<10)
 26. frontend/components/ui/CreditCostBadge.tsx — Small badge for buttons: "25 credits"

 Modified files:

 27. frontend/app/layout.tsx — Wrap children with SubscriptionProvider inside AuthProvider

 ---
 Phase 7: Frontend Pages & Integration

 New files:

 28. frontend/app/pricing/page.tsx — Public pricing page:
   - Pro plan card ($29/month, 300 credits, feature list)
   - Enterprise card ("Contact Sales")
   - Credit cost breakdown table
   - "Start Free Trial" CTA → login if unauthenticated, else /api/subscriptions/start-trial
 29. frontend/app/subscription/success/page.tsx — Post-checkout success page with redirect to /main

 Modified files:

 30. frontend/lib/contexts/AuthContext.tsx — After register() succeeds, call subscriptionApi.startTrial()
 to auto-start 3-day trial
 31. frontend/app/login/page.tsx — Show "Your 3-day free trial has started!" after registration
 32. frontend/app/main/page.tsx:
   - Add CreditDisplay in sidebar (above user email)
   - Wrap canvas with SubscriptionGate
 33. frontend/components/canvas/ReactFlowCanvas.tsx:
   - Import useSubscription(), call refreshSubscription() after generate/extend calls
   - Catch 402 errors in handleGenerateVideo / handleExtendVideo → show "Insufficient credits" or
 "Subscribe" prompt
 34. frontend/components/canvas/nodes/VideoNodeRF.tsx — Add CreditCostBadge on Generate button
 35. frontend/components/canvas/nodes/ExtensionNodeRF.tsx — Add CreditCostBadge on Extend button
 36. frontend/components/landing/Navigation.tsx — Add "Pricing" link

 ---
 Polar.sh Setup (Manual Steps)

 1. Create organization on polar.sh
 2. Create product "Axel Pro": $29/month recurring, 3-day trial period enabled
 3. Copy Product ID → set as POLAR_PRO_PRODUCT_ID in backend/.env
 4. Create API Access Token (Settings → Developers) → set as POLAR_ACCESS_TOKEN
 5. Create Webhook Endpoint: URL = https://your-domain/api/webhooks/polar
   - Subscribe to: subscription.created, subscription.active, subscription.updated, subscription.canceled,
  subscription.revoked, order.created
   - Copy webhook secret → set as POLAR_WEBHOOK_SECRET
 6. For development: use sandbox mode (POLAR_SANDBOX=true + sandbox access token)

 Required .env additions (backend)

 POLAR_ACCESS_TOKEN=
 POLAR_WEBHOOK_SECRET=
 POLAR_PRO_PRODUCT_ID=
 POLAR_SANDBOX=true
 POLAR_SUCCESS_URL=http://localhost:3000/subscription/success

 ---
 File Summary

 New backend files (10)
 ┌──────────────────────────────────────────────┬─────────────────────────────┐
 │                     File                     │           Purpose           │
 ├──────────────────────────────────────────────┼─────────────────────────────┤
 │ backend/app/core/exceptions.py               │ InsufficientCreditsError    │
 ├──────────────────────────────────────────────┼─────────────────────────────┤
 │ backend/app/models/subscription.py           │ Subscription model          │
 ├──────────────────────────────────────────────┼─────────────────────────────┤
 │ backend/app/models/credit_transaction.py     │ CreditTransaction model     │
 ├──────────────────────────────────────────────┼─────────────────────────────┤
 │ backend/app/models/polar_event.py            │ Webhook idempotency model   │
 ├──────────────────────────────────────────────┼─────────────────────────────┤
 │ backend/app/schemas/subscription.py          │ Pydantic schemas            │
 ├──────────────────────────────────────────────┼─────────────────────────────┤
 │ backend/app/services/subscription_service.py │ Credit & subscription logic │
 ├──────────────────────────────────────────────┼─────────────────────────────┤
 │ backend/app/services/polar_service.py        │ Polar SDK wrapper           │
 ├──────────────────────────────────────────────┼─────────────────────────────┤
 │ backend/app/api/subscriptions.py             │ Subscription endpoints      │
 ├──────────────────────────────────────────────┼─────────────────────────────┤
 │ backend/app/api/webhooks.py                  │ Polar webhook handler       │
 ├──────────────────────────────────────────────┼─────────────────────────────┤
 │ alembic/versions/..._add_subscriptions.py    │ Migration (autogenerated)   │
 └──────────────────────────────────────────────┴─────────────────────────────┘
 Modified backend files (8)
 ┌──────────────────────────────────┬──────────────────────────────────────────┐
 │               File               │                  Change                  │
 ├──────────────────────────────────┼──────────────────────────────────────────┤
 │ backend/requirements.txt         │ Add polar-sdk                            │
 ├──────────────────────────────────┼──────────────────────────────────────────┤
 │ backend/app/config.py            │ Add Polar + credit settings              │
 ├──────────────────────────────────┼──────────────────────────────────────────┤
 │ backend/app/models/user.py       │ Add subscription relationship            │
 ├──────────────────────────────────┼──────────────────────────────────────────┤
 │ backend/app/models/__init__.py   │ Import new models                        │
 ├──────────────────────────────────┼──────────────────────────────────────────┤
 │ backend/app/api/deps.py          │ Add require_active_subscription          │
 ├──────────────────────────────────┼──────────────────────────────────────────┤
 │ backend/app/api/ai.py            │ Add subscription gate + credit deduction │
 ├──────────────────────────────────┼──────────────────────────────────────────┤
 │ backend/app/main.py              │ Register routers + exception handler     │
 ├──────────────────────────────────┼──────────────────────────────────────────┤
 │ backend/app/tasks/video_tasks.py │ Credit refund on failure                 │
 ├──────────────────────────────────┼──────────────────────────────────────────┤
 │ backend/app/tasks/face_tasks.py  │ Credit refund on failure                 │
 └──────────────────────────────────┴──────────────────────────────────────────┘
 New frontend files (7)
 ┌───────────────────────────────────────────────┬───────────────────────┐
 │                     File                      │        Purpose        │
 ├───────────────────────────────────────────────┼───────────────────────┤
 │ frontend/lib/types/subscription.ts            │ TypeScript types      │
 ├───────────────────────────────────────────────┼───────────────────────┤
 │ frontend/lib/contexts/SubscriptionContext.tsx │ Subscription context  │
 ├───────────────────────────────────────────────┼───────────────────────┤
 │ frontend/components/SubscriptionGate.tsx      │ Paywall gate          │
 ├───────────────────────────────────────────────┼───────────────────────┤
 │ frontend/components/ui/CreditDisplay.tsx      │ Credit balance widget │
 ├───────────────────────────────────────────────┼───────────────────────┤
 │ frontend/components/ui/CreditCostBadge.tsx    │ Cost badge            │
 ├───────────────────────────────────────────────┼───────────────────────┤
 │ frontend/app/pricing/page.tsx                 │ Pricing page          │
 ├───────────────────────────────────────────────┼───────────────────────┤
 │ frontend/app/subscription/success/page.tsx    │ Post-checkout page    │
 └───────────────────────────────────────────────┴───────────────────────┘
 Modified frontend files (8)
 ┌──────────────────────────────────────────────────────┬──────────────────────────────────┐
 │                         File                         │              Change              │
 ├──────────────────────────────────────────────────────┼──────────────────────────────────┤
 │ frontend/lib/api.ts                                  │ Add subscriptionApi, handle 402  │
 ├──────────────────────────────────────────────────────┼──────────────────────────────────┤
 │ frontend/lib/contexts/AuthContext.tsx                │ Auto-start trial on register     │
 ├──────────────────────────────────────────────────────┼──────────────────────────────────┤
 │ frontend/app/layout.tsx                              │ Add SubscriptionProvider         │
 ├──────────────────────────────────────────────────────┼──────────────────────────────────┤
 │ frontend/app/login/page.tsx                          │ Trial started message            │
 ├──────────────────────────────────────────────────────┼──────────────────────────────────┤
 │ frontend/app/main/page.tsx                           │ CreditDisplay + SubscriptionGate │
 ├──────────────────────────────────────────────────────┼──────────────────────────────────┤
 │ frontend/components/canvas/ReactFlowCanvas.tsx       │ 402 handling, credit refresh     │
 ├──────────────────────────────────────────────────────┼──────────────────────────────────┤
 │ frontend/components/canvas/nodes/VideoNodeRF.tsx     │ CreditCostBadge                  │
 ├──────────────────────────────────────────────────────┼──────────────────────────────────┤
 │ frontend/components/canvas/nodes/ExtensionNodeRF.tsx │ CreditCostBadge                  │
 ├──────────────────────────────────────────────────────┼──────────────────────────────────┤
 │ frontend/components/landing/Navigation.tsx           │ Pricing link                     │
 └──────────────────────────────────────────────────────┴──────────────────────────────────┘
 ---
 Verification

 1. Trial flow: Register → auto-trial starts → GET /api/subscriptions/status returns {is_trial: true,
 credits_balance: 50} → generate 5 fast videos → credits reach 0 → 6th attempt returns 402
 2. Checkout flow: Click Subscribe → redirected to Polar checkout → complete payment → webhook fires → GET
  /status returns {status: "active", credits_balance: 300}
 3. Credit deduction: Generate video → credits_balance decreases by 25 (standard) or 10 (fast) →
 transaction logged
 4. Failed job refund: Trigger a failing generation → after retries exhausted → credits refunded →
 transaction logged
 5. Trial expiry: Set trial_ends_at to past → AI endpoints return 402 → pricing page shown
 6. Cancellation: Cancel via Polar portal → webhook sets status=canceled → still works until period_end →
 then 402
 7. Concurrent requests: Send 2 generate requests simultaneously with only 25 credits → only 1 succeeds
 (SELECT FOR UPDATE)
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌