# Analytics Utilities - Critical Business Rules

## Revenue Calculation Policy

**⚠️ CRITICAL: All revenue calculations MUST only include paid orders.**

### Implementation
- All analytics functions filter by `paystack_status = 'success'`
- This ensures revenue reflects only confirmed payments from Paystack
- Never calculate revenue from pending or failed orders

### Paystack Status Values
- `success`: Payment confirmed by Paystack webhook (✅ COUNT IN REVENUE)
- `failed`: Payment failed (❌ EXCLUDE FROM REVENUE)
- `amount_mismatch`: Payment amount doesn't match order total (❌ EXCLUDE FROM REVENUE)
- `null`: Payment not yet attempted/completed (❌ EXCLUDE FROM REVENUE)

### Functions Implementing This Rule
All functions in `src/utils/analytics.ts`:
- ✅ `getRevenueByPeriod()` - Revenue charts by time period
- ✅ `getOrderStatusBreakdown()` - Order status distribution
- ✅ `getOrdersTimeline()` - Orders timeline chart
- ✅ `getAverageOrderMetrics()` - Average order value and metrics
- ✅ `DashboardAnalytics.fetchAnalytics()` - Dashboard KPIs

### Product Purchase Analytics
Product purchase tracking uses the `product_analytics` table which is populated by:
- **Trigger**: `track_product_purchases()` - Automatically triggered on order insertion
- **Condition**: Only tracks purchases from orders (no status filter needed in trigger)
- **Note**: Purchase analytics inherit payment status from their source order

### Verification
To verify revenue accuracy, run this query:
```sql
SELECT 
  COUNT(*) as paid_orders,
  SUM(total_amount) as total_revenue
FROM orders 
WHERE paystack_status = 'success';
```

### Related Files
- `src/utils/analytics.ts` - All analytics functions
- `src/pages/admin/DashboardAnalytics.tsx` - Dashboard implementation
- `supabase/functions/paystack-webhook/index.ts` - Sets paystack_status on payment
- Database trigger: `track_product_purchases()` - Tracks product purchases from orders
