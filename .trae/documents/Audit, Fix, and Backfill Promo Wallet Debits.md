I have analyzed the current promo wallet implementation and identified the necessary steps to audit, fix, and backfill the data.

### Analysis Findings
1.  **Current Flow**: Promo credits are debited *immediately* when a payment is initialized (in `initialize-standard-payment`), before the user completes payment on Paystack.
2.  **The Gap**: 
    *   If a payment fails or is abandoned, there is currently no mechanism to **refund** the promo credit. The user loses their credit.
    *   There may be historical orders where the `promo_discount_applied` was recorded on the order, but the actual wallet debit transaction was not recorded (or failed).
3.  **Reporting**: Reports are driven by the `wallet_transactions` table. If the debit transaction is missing, the report and balance are incorrect.

### Plan
I will implement a robust solution to ensure integrity and backfill missing data.

#### 1. Create Refund Mechanism (Fail-Proofing)
I will create a new Database RPC `refund_promo_wallet` to allow returning credits to the user.
*   **File**: `supabase/migrations/20260129140000_add_refund_promo_wallet.sql`
*   **Logic**: Atomically credits the user's promo balance and records a `promo_refund` transaction linked to the order.

#### 2. Audit & Backfill Script (The Fix)
I will create a migration that runs a one-time audit and correction script.
*   **File**: `supabase/migrations/20260129150000_fix_promo_debit_flow.sql`
*   **Logic**:
    *   Find all orders with `promo_discount_applied > 0`.
    *   Check if a corresponding `promo_debit` transaction exists in `wallet_transactions`.
    *   If missing:
        *   Deduct the amount from `user_wallets.balance_promo` (correcting the inflated balance).
        *   Insert the missing `wallet_transactions` record (correcting the report).

#### 3. Update Edge Function (Optional but Recommended)
I will update the `initialize-standard-payment` function to ensure it handles the debit response correctly, though the primary fix is in the database layer to ensure data integrity.

### Next Steps
1.  Create the refund RPC migration.
2.  Create the backfill/audit migration.
3.  Apply the migrations.
