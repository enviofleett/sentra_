# Production Deployment Checklist

## 🚀 Pre-Launch Checklist for Sentra Scent Shop

This checklist ensures your e-commerce platform is production-ready.

---

## ✅ Critical Fixes Applied (January 2, 2026)

### 1. Stock Deduction System ✅
- **Status:** FIXED
- **Location:** `supabase/functions/paystack-webhook/index.ts`
- **Migration:** `supabase/migrations/20260102000001_add_stock_deduction_function.sql`
- **What it does:** Automatically deducts product stock after successful payment
- **Test:** Place an order and verify stock decreases

### 2. Group Buy Stock Validation ✅
- **Status:** FIXED
- **Location:** `src/pages/admin/GroupBuyCampaignsManagement.tsx`
- **What it does:** Prevents creating campaigns with goal_quantity exceeding available stock
- **Test:** Try creating a campaign with quantity > stock

### 3. Email Verification Requirement ✅
- **Status:** PARTIALLY IMPLEMENTED
- **Location:** `src/contexts/AuthContext.tsx`, `src/pages/Checkout.tsx`
- **What it does:** Blocks checkout for unverified email addresses
- **Action Required:** Enable email confirmation in Supabase Dashboard
  - Go to: Authentication > Settings > Email Auth
  - Enable "Confirm email" option

### 4. Cart Product Deletion Handling ✅
- **Status:** FIXED
- **Location:** `src/contexts/CartContext.tsx`
- **What it does:** Automatically removes deleted products from cart
- **Test:** Add product to cart, delete product from admin, reload cart

### 5. Error Boundaries ✅
- **Status:** IMPLEMENTED
- **Location:** `src/components/ErrorBoundary.tsx`, `src/main.tsx`
- **What it does:** Gracefully handles React errors without crashing entire app
- **Test:** Trigger an error and verify fallback UI appears

---

## 🚨 CRITICAL - MUST DO BEFORE LAUNCH

### 1. Configure Email Service (P0 - BLOCKING)

**Current Status:** ❌ NOT CONFIGURED

**Impact:** No emails will send (order confirmations, notifications, etc.)

**Action Required:**
```bash
# Option A: Gmail (Quick Start)
supabase secrets set GMAIL_EMAIL="your-email@gmail.com"
supabase secrets set GMAIL_APP_PASSWORD="xxxx-xxxx-xxxx-xxxx"

# Option B: Resend (Recommended)
# See EMAIL_SETUP_GUIDE.md for full instructions
supabase secrets set RESEND_API_KEY="re_xxxxxxxx"
```

**Documentation:** See `EMAIL_SETUP_GUIDE.md`

**Test:**
```bash
supabase functions invoke send-email --body '{
  "to": "test@example.com",
  "templateId": "ORDER_CONFIRMATION",
  "data": {"customer_name": "Test", "order_id": "123", "total_amount": "5000"}
}'
```

---

### 2. Apply Database Migration (P0 - BLOCKING)

**Current Status:** ✅ Migration file created

**Action Required:**
```bash
# Push migration to production
supabase db push

# Or if using Supabase CLI with migrations
supabase migration up
```

**Verify:**
```sql
-- Check if function exists
SELECT proname FROM pg_proc WHERE proname = 'deduct_product_stock';
```

---

### 3. Enable Email Confirmation in Supabase (P0 - SECURITY)

**Current Status:** ❌ NOT ENABLED

**Action Required:**
1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/oczsddmantovkqfwczqk
2. Navigate to **Authentication** > **Settings**
3. Under **Email Auth**, enable "Confirm email"
4. Customize email templates if needed

**Impact:** Users can currently checkout without verified emails

---

### 4. Configure Paystack Webhook URL (P0 - CRITICAL)

**Current Status:** ⚠️ VERIFY CONFIGURATION

**Action Required:**
1. Go to Paystack Dashboard: https://dashboard.paystack.com/#/settings/webhooks
2. Verify webhook URL is set to:
   ```
   https://oczsddmantovkqfwczqk.supabase.co/functions/v1/paystack-webhook
   ```
3. Ensure webhook secret is configured in Supabase:
   ```bash
   supabase secrets set PAYSTACK_SECRET_KEY="sk_live_your_secret_key"
   ```

**Test:** Place a test order and check webhook logs

---

## ⚠️ HIGH PRIORITY - SHOULD DO BEFORE LAUNCH

### 5. Set Up Error Monitoring (P1)

**Recommended:** Sentry

**Setup:**
```bash
npm install @sentry/react

# Add to src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your-sentry-dsn",
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0,
});
```

**Alternative:** Use Supabase Edge Function logs

---

### 6. Configure Database Backups (P1)

**Action Required:**
1. Go to Supabase Dashboard > Settings > Database
2. Enable Point-in-Time Recovery (PITR)
3. Set backup retention period (recommended: 7 days minimum)

---

### 7. Add Rate Limiting (P1)

**Protection Needed:**
- Edge Functions (webhook, commit-to-group-buy)
- Auth endpoints (signup, signin)

**Options:**
1. **Supabase Built-in:** Configure in Dashboard
2. **Cloudflare:** Add rate limiting rules
3. **Custom:** Implement in Edge Functions with Redis

**Example for Edge Function:**
```typescript
// Add to edge functions
const rateLimiter = new Map();

function checkRateLimit(userId: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const userRequests = rateLimiter.get(userId) || [];

  // Filter recent requests
  const recentRequests = userRequests.filter((time: number) => now - time < windowMs);

  if (recentRequests.length >= limit) {
    return false; // Rate limit exceeded
  }

  recentRequests.push(now);
  rateLimiter.set(userId, recentRequests);
  return true;
}
```

---

### 8. Test All Critical Flows (P1)

- [ ] User signup with email verification
- [ ] User login
- [ ] Add product to cart
- [ ] Checkout process
- [ ] Payment with Paystack (test mode first!)
- [ ] Order confirmation email received
- [ ] Stock deducted correctly
- [ ] Order appears in user profile
- [ ] Admin can view order
- [ ] Group buy campaign creation
- [ ] Group buy commitment
- [ ] Affiliate link click and tracking
- [ ] Commission credited after purchase

---

## 📊 MEDIUM PRIORITY - DO WITHIN FIRST WEEK

### 9. Set Up Analytics (P2)

**Options:**
- Google Analytics 4
- Plausible Analytics
- PostHog

**Track:**
- Page views
- Product views (already tracked in DB)
- Add to cart events
- Checkout initiations
- Purchase completions
- Affiliate link clicks

---

### 10. Configure CDN for Images (P2)

**Current:** Images served directly from Supabase Storage

**Recommended:** Cloudflare Images or Cloudinary

**Benefits:**
- Faster load times
- Automatic image optimization
- WebP conversion
- Responsive images

**Setup:**
```typescript
// Update image URLs to use CDN
const imageUrl = `https://your-cdn.com/transform/w_800,f_auto/${product.image_url}`;
```

---

### 11. Add Order Cancellation Workflow (P2)

**Location to implement:** `src/pages/profile/Orders.tsx`

**Logic:**
```typescript
const cancelOrder = async (orderId: string) => {
  // Only allow cancellation if status is 'pending' or 'processing'
  // Refund payment via Paystack API
  // Restore stock
  // Update order status to 'cancelled'
};
```

---

### 12. Implement Refund System (P2)

**Integration needed:** Paystack Refund API

**Documentation:** https://paystack.com/docs/api/#refund

**Implementation:**
```typescript
async function processRefund(orderId: string, amount: number) {
  const response = await fetch('https://api.paystack.co/refund', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      transaction: paymentReference,
      amount: amount * 100 // Convert to kobo
    })
  });

  // Update order, restore stock, reverse commission
}
```

---

## 🔒 SECURITY CHECKLIST

- [x] Row-Level Security enabled on all tables
- [x] Webhook signature verification (HMAC-SHA512)
- [x] Input validation with Zod schemas
- [x] SQL injection protection (parameterized queries)
- [ ] Email verification enabled
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Secrets stored in Supabase Secrets (not in code)
- [ ] Error messages don't leak sensitive data
- [ ] Admin functions use SECURITY DEFINER
- [ ] Payment amounts verified server-side

**Action:** Review and check off remaining items

---

## 📈 PERFORMANCE CHECKLIST

- [ ] Database indexes optimized
- [ ] Image CDN configured
- [ ] React Query caching configured (5-min default)
- [ ] Code splitting for admin routes
- [ ] Service worker for offline support (optional)
- [ ] Edge caching for product lists
- [ ] Lazy loading for images

**Action:** Implement high-impact items first

---

## 🧪 TESTING CHECKLIST

### Manual Testing

- [ ] Test signup flow
- [ ] Test login flow
- [ ] Test checkout with real payment (small amount)
- [ ] Test group buy flow
- [ ] Test affiliate link tracking
- [ ] Test admin operations
- [ ] Test on mobile devices
- [ ] Test email deliverability

### Automated Testing (Future)

- [ ] Set up Playwright for E2E tests
- [ ] Add unit tests for utility functions
- [ ] Add integration tests for Edge Functions
- [ ] Set up CI/CD pipeline

---

## 📱 MOBILE RESPONSIVENESS

- [ ] Test on iPhone (Safari)
- [ ] Test on Android (Chrome)
- [ ] Test tablet view
- [ ] Verify touch targets are adequate (min 44x44px)
- [ ] Test cart on mobile
- [ ] Test checkout form on mobile
- [ ] Test Paystack payment popup on mobile

---

## 🎯 GO-LIVE STEPS

### Day Before Launch

1. [ ] Run full test suite
2. [ ] Verify all secrets are set
3. [ ] Check database migrations applied
4. [ ] Test email sending
5. [ ] Verify payment integration
6. [ ] Check stock levels
7. [ ] Review all admin controls
8. [ ] Prepare customer support plan

### Launch Day

1. [ ] Enable email verification
2. [ ] Switch to production mode
3. [ ] Monitor webhook logs
4. [ ] Monitor error logs
5. [ ] Test with real small order
6. [ ] Announce to limited audience first
7. [ ] Monitor for 24 hours before full launch

### Post-Launch (Week 1)

1. [ ] Monitor email delivery rates
2. [ ] Check for any errors
3. [ ] Verify stock deduction working
4. [ ] Review order completion rate
5. [ ] Check payment success rate
6. [ ] Gather user feedback
7. [ ] Plan improvements

---

## 🆘 EMERGENCY CONTACTS & ROLLBACK

### If Something Goes Wrong

**Rollback Database:**
```bash
# If PITR is enabled
supabase db rollback --to "2026-01-02 10:00:00"
```

**Disable Problematic Feature:**
```sql
-- Example: Disable email sending temporarily
UPDATE app_config
SET value = '{"enabled": false}'
WHERE key = 'email_enabled';
```

**Emergency Mode:**
- Disable new orders: Update app_config
- Show maintenance banner
- Notify customers via social media

---

## 📊 SUCCESS METRICS

Track these KPIs post-launch:

- **Order Completion Rate:** Target > 70%
- **Email Delivery Rate:** Target > 95%
- **Payment Success Rate:** Target > 98%
- **Cart Abandonment Rate:** Target < 60%
- **Stock Accuracy:** Target = 100%
- **Error Rate:** Target < 0.1%
- **Average Load Time:** Target < 2s

---

## 📝 SUMMARY

### ✅ Completed
1. Stock deduction system
2. Group buy stock validation
3. Email verification checks
4. Cart cleanup for deleted products
5. Error boundaries
6. Email configuration guide

### 🚨 Must Do Now
1. Configure email service (BLOCKING)
2. Apply database migration
3. Enable email verification in Supabase
4. Verify Paystack webhook configuration

### ⚠️ Should Do Soon
1. Set up error monitoring
2. Configure database backups
3. Add rate limiting
4. Test all critical flows
5. Mobile testing

### 📌 Can Do Later
1. Analytics setup
2. CDN configuration
3. Order cancellation
4. Refund system
5. Automated testing

---

## 🎉 Ready to Launch?

**Minimum Requirements to Go Live:**
1. ✅ All critical fixes applied
2. ✅ Email service configured
3. ✅ Database migration applied
4. ✅ Email verification enabled
5. ✅ Paystack webhook configured
6. ✅ Full test order completed successfully

**Once these are done, you're ready for production! 🚀**

---

**Last Updated:** January 2, 2026
**Next Review:** Before launch + 1 week after launch
