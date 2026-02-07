# Subscription System Setup Guide

This guide walks you through setting up the Polar.sh payment integration for Axel's credit-based subscription system.

## Overview

**What we built:**
- **Pro Plan**: $29/month, 300 credits
- **Free Trial**: 3 days, 50 credits (auto-starts on registration)
- **Enterprise**: "Contact Sales" button only (no automation)

**Credit costs:**
- Video generation (Standard): 25 credits
- Video generation (Fast): 10 credits
- Video extension: 25 credits (standard)
- Face analysis: 5 credits
- Prompt enhancement: Free

**Flow:**
1. User registers → Auto-trial starts (50 credits, 3 days)
2. Trial expires → User subscribes via Polar checkout
3. Subscription activates → 300 credits allocated
4. Monthly renewal → Credits reset to 300

---

## 1. Create Polar.sh Account

1. Go to [polar.sh](https://polar.sh) and sign up
2. Create an organization (e.g., "Axel")
3. You'll land on the dashboard

---

## 2. Create the Pro Product

### Navigate to Products
Dashboard → **Products** → **Create Product**

### Product Details
- **Name**: `Axel Pro`
- **Description**: `300 credits per month for AI video generation`
- **Type**: `Recurring`
- **Billing Interval**: `Monthly`
- **Price**: `$29.00`
- **Trial Period**: ✅ Enable → `3 days`

### Important Settings
- **Payment Methods**: Enable Stripe (Polar handles this)
- **Tax**: Configure based on your location (Polar auto-calculates)
- **Visibility**: Set to `Public` when ready to launch

### After Creation
- Copy the **Product ID** (looks like: `prod_abc123xyz`)
- Save this for later — you'll need it in `.env`

---

## 3. Get API Credentials

### Access Token
1. Dashboard → **Settings** → **API & Webhooks** → **Access Tokens**
2. Click **Create Access Token**
3. **Name**: `Axel Backend`
4. **Scopes**: Select:
   - ✅ `subscriptions:read`
   - ✅ `subscriptions:write`
   - ✅ `checkouts:write`
   - ✅ `customers:read`
   - ✅ `orders:read`
5. Click **Create**
6. **Copy the token immediately** (you won't see it again)
7. Save as `POLAR_ACCESS_TOKEN` in your `.env`

### Webhook Secret
1. Same page → **Webhooks** section
2. Click **Create Webhook Endpoint**
3. **URL**: Your production backend URL + `/api/webhooks/polar`
   - Example: `https://api.yourdomain.com/api/webhooks/polar`
   - For testing: Use ngrok tunnel (e.g., `https://abc123.ngrok.io/api/webhooks/polar`)
4. **Events to subscribe to**:
   - ✅ `subscription.created`
   - ✅ `subscription.active`
   - ✅ `subscription.updated`
   - ✅ `subscription.canceled`
   - ✅ `subscription.revoked`
   - ✅ `order.created`
5. Click **Create**
6. Copy the **Signing Secret** (looks like: `whsec_abc123xyz`)
7. Save as `POLAR_WEBHOOK_SECRET` in your `.env`

---

## 4. Configure Backend Environment

Edit `backend/.env`:

```bash
# Polar.sh Configuration
POLAR_ACCESS_TOKEN=polar_pat_abc123xyz...
POLAR_WEBHOOK_SECRET=whsec_abc123xyz...
POLAR_PRO_PRODUCT_ID=prod_abc123xyz

# Sandbox mode (set to false in production)
POLAR_SANDBOX=true

# Redirect after successful checkout
POLAR_SUCCESS_URL=https://yourdomain.com/subscription/success

# Credit allocations (already set, but configurable)
CREDITS_PRO_MONTHLY=300
CREDITS_TRIAL=50
TRIAL_DAYS=3
```

### Sandbox vs Production

**Sandbox mode (`POLAR_SANDBOX=true`):**
- Use for testing with Polar's sandbox environment
- Test credit card: `4242 4242 4242 4242` (any future date, any CVC)
- No real charges
- Access sandbox dashboard at [sandbox.polar.sh](https://sandbox.polar.sh)

**Production mode (`POLAR_SANDBOX=false`):**
- Real payments via Stripe
- Use production API token and product ID
- Set `POLAR_SUCCESS_URL` to your production frontend URL

---

## 5. Test the Integration

### Local Testing with ngrok (Webhooks)

Polar webhooks need a public URL. Use ngrok:

```bash
# Terminal 1: Start backend
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2: Expose with ngrok
ngrok http 8000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Update Polar webhook endpoint URL to: https://abc123.ngrok.io/api/webhooks/polar
```

### Test Flow

1. **Registration + Auto-Trial**
   ```bash
   # Register a new user via frontend or API
   POST /api/auth/register
   {
     "email": "test@example.com",
     "password": "test123"
   }

   # Check subscription status
   GET /api/subscriptions/status
   # Should return: { is_trial: true, credits_balance: 50, trial_ends_at: "..." }
   ```

2. **Start Checkout**
   ```bash
   # Frontend calls this when user clicks "Subscribe"
   POST /api/subscriptions/checkout

   # Returns: { checkout_url: "https://polar.sh/checkout/...", checkout_id: "..." }
   # User is redirected to Polar's hosted checkout page

   # NOTE: Polar validates email domains. Emails with @example.com will fail.
   # Use real domains for testing (e.g., @gmail.com, @test.com)
   ```

3. **Complete Payment**
   - Use test card in sandbox: `4242 4242 4242 4242`
   - Polar processes payment
   - Polar sends webhook to your backend (`/api/webhooks/polar`)
   - Backend receives `subscription.active` event
   - Backend allocates 300 credits
   - User is redirected to `POLAR_SUCCESS_URL`

4. **Verify Subscription**
   ```bash
   GET /api/subscriptions/status
   # Should return: { status: "active", credits_balance: 300, is_trial: false }
   ```

### Test Webhooks Manually

Polar Dashboard → **Webhooks** → Select your endpoint → **Send test event**

You can trigger test events for:
- `subscription.created`
- `subscription.active`
- `order.created` (renewal)

Check your backend logs to see the webhook processing.

---

## 6. Common Flows

### New User Flow
```
1. User registers → AuthContext calls subscriptionApi.startTrial()
2. POST /api/subscriptions/start-trial → Creates trial subscription
3. Database: subscription record with is_trial=true, credits_balance=50
4. User generates videos (deducts credits)
5. Trial expires after 3 days → AI endpoints return 402
6. SubscriptionGate shows paywall → User clicks "Subscribe"
7. POST /api/subscriptions/checkout → Returns Polar checkout URL
8. User completes payment on Polar's page
9. Polar webhook → subscription.active → Backend allocates 300 credits
10. User redirected to /subscription/success → Auto-redirects to /main
```

### Monthly Renewal Flow
```
1. Polar charges user on renewal date
2. Polar sends order.created webhook (billing_reason: "subscription_cycle")
3. Backend handler → Finds subscription by polar_subscription_id
4. Resets credits_balance to 300, updates current_period_start/end
5. Creates credit_transaction (type: "allocation", amount: 300)
```

### Cancellation Flow
```
1. User clicks "Manage Subscription" → GET /api/subscriptions/portal
2. Redirected to Polar customer portal
3. User clicks "Cancel Subscription"
4. Polar sends subscription.canceled webhook
5. Backend sets status="canceled", canceled_at=now
6. User can still use service until current_period_end
7. After period ends → 402 errors on AI endpoints
```

### Credit Deduction & Refund
```
# Deduction (on video generation)
1. POST /api/ai/generate-video → require_active_subscription dependency
2. subscription_service.deduct_credits(user_id, 25, "video_generation")
3. Uses SELECT ... FOR UPDATE to prevent race conditions
4. Throws InsufficientCreditsError if balance < 25 → returns 402
5. Creates credit_transaction (type: "deduction", amount: -25)

# Refund (on job failure)
1. Celery worker retries job 3 times, all fail
2. Worker calls refund_credits_sync(user_id, 25, job_id, "video_generation")
3. Creates credit_transaction (type: "refund", amount: +25)
4. User gets credits back
```

---

## 7. Monitoring

### Check Subscription Status
```bash
# Via API
GET /api/subscriptions/status
Authorization: Bearer <user_token>

# Response
{
  "has_subscription": true,
  "status": "active",
  "plan": "pro",
  "credits_balance": 275,
  "credits_total": 300,
  "is_trial": false,
  "trial_ends_at": null,
  "current_period_end": "2026-03-06T12:00:00Z"
}
```

### View Credit Transactions
```bash
GET /api/subscriptions/transactions?limit=50
Authorization: Bearer <user_token>

# Response: Array of transactions
[
  {
    "id": "uuid",
    "type": "deduction",
    "amount": -25,
    "balance_after": 275,
    "operation_type": "video_generation",
    "description": "Video generation (Standard)",
    "created_at": "2026-02-06T12:00:00Z"
  }
]
```

### Check Polar Dashboard
- **Active Subscriptions**: See all paying customers
- **Revenue**: Track MRR (Monthly Recurring Revenue)
- **Webhooks**: View recent webhook deliveries and retries
- **Customer Portal**: Send users here to manage subscriptions

---

## 8. Production Checklist

Before going live:

- [ ] Set `POLAR_SANDBOX=false`
- [ ] Use production Polar API token
- [ ] Update `POLAR_PRO_PRODUCT_ID` to production product ID
- [ ] Update webhook URL to production backend (no ngrok)
- [ ] Set `POLAR_SUCCESS_URL` to production frontend URL
- [ ] Test full checkout flow in production mode
- [ ] Configure Stripe payout settings in Polar dashboard
- [ ] Set up tax configuration (Polar handles tax calculation)
- [ ] Enable email notifications in Polar for payment failures
- [ ] Monitor webhook failures in Polar dashboard
- [ ] Set up alerting for failed credit deductions (optional)

---

## 9. Troubleshooting

### "Insufficient credits" but user just subscribed
- Check webhook was received: Polar Dashboard → Webhooks → Recent Deliveries
- Check backend logs for `subscription.active` processing
- Verify `polar_webhook_events` table has the event ID
- Manually allocate credits via SQL if needed:
  ```sql
  UPDATE subscriptions SET credits_balance = 300 WHERE user_id = '...';
  INSERT INTO credit_transactions (subscription_id, user_id, type, amount, balance_after, description)
  VALUES (...);
  ```

### Checkout creation fails with email validation error
- Polar validates that email domains accept mail
- `@example.com` emails will be rejected
- Use real email domains for testing (Gmail, custom domain, etc.)

### Webhook signature verification fails
- Verify `POLAR_WEBHOOK_SECRET` matches Polar dashboard
- Check webhook endpoint is receiving POST requests (not GET)
- Ensure no middleware is modifying request body before verification

### Trial not auto-starting on registration
- Check `AuthContext.tsx` → `register()` function calls `subscriptionApi.startTrial()`
- Check backend logs for errors in `POST /api/subscriptions/start-trial`
- Verify user doesn't already have a subscription (one per user)

### Credits not resetting on renewal
- Check `order.created` webhook has `billing_reason: "subscription_cycle"`
- Verify backend processes this event type in `webhooks.py`
- Check `current_period_start` and `current_period_end` updated correctly

---

## 10. FAQs

**Q: Can users purchase additional credits?**
A: Not currently implemented. You'd need to create one-time products in Polar and handle `order.created` webhooks without `billing_reason`.

**Q: How do refunds work?**
A: Refunds via Polar dashboard → Customer → Refund. This does NOT automatically add credits back. You'd need to handle `order.refunded` webhook (not implemented).

**Q: Can we offer annual plans?**
A: Yes. Create a new product with billing interval "Yearly" and adjust credit allocation (e.g., 3600 credits/year).

**Q: What happens if a webhook fails?**
A: Polar retries failed webhooks with exponential backoff (up to 3 days). Check Polar dashboard for failed deliveries and manually replay them.

**Q: Can we change credit costs after launch?**
A: Yes, update `CREDIT_COSTS` dict in `subscription_service.py`. Existing users keep their current credit balance.

**Q: How do we handle chargebacks?**
A: Polar sends `subscription.revoked` webhook on chargeback. Backend immediately revokes access (status → "revoked").

---

## Need Help?

- **Polar Documentation**: [docs.polar.sh](https://docs.polar.sh)
- **Polar Discord**: [discord.gg/polar](https://discord.gg/polar)
- **Backend Logs**: Check Uvicorn logs for webhook processing errors
- **Database**: Query `subscriptions`, `credit_transactions`, `polar_webhook_events` tables
