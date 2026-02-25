# Sentra Admin System Guide

## Overview

This guide documents the newly implemented features for the Sentra application, focusing on VAT Management, Admin Order Creation, and Invoice Generation.

## 1. VAT Management System

The VAT system is now fully dynamic and configurable.

### Features
- **Configurable Rate**: The active VAT rate is stored in the `vat_settings` table.
- **Audit Logging**: All changes to the VAT rate are logged in `vat_audit_logs`.
- **Dynamic Calculation**: The storefront and admin order creation tools fetch the latest rate automatically.

### Usage
- Navigate to **Tax Management** in the Admin Dashboard.
- View the current active rate and history of changes.
- Enter a new rate and save to update it globally.

### Technical Details
- **Tables**: `vat_settings`, `vat_audit_logs`
- **Logic**: `src/utils/vat.ts` contains the core calculation logic.

## 2. Admin Order Creation

Admins can now create orders on behalf of users.

### Features
- **User Selection**: Search for existing users by email.
- **New User Creation**: Instantly create a new user account if they don't exist.
- **Cart Management**: Add products, adjust quantities.
- **Stock Validation**: Checks available stock (basic implementation).
- **Shipping Details**: Input shipping and billing information.

### Usage
1. Go to **Orders** > **Create Order**.
2. **Select User**: Search or toggle "Create New User".
3. **Add Products**: Use the product selector to build the cart.
4. **Enter Details**: Fill in the shipping form.
5. **Place Order**: Confirm the order.

### Technical Details
- **Page**: `src/pages/admin/CreateOrder.tsx`
- **Edge Function**: `admin-create-user` handles secure user creation.

## 3. Invoice Generation & Payments

Professional PDF invoices are generated automatically for admin-created orders.

### Features
- **PDF Generation**: Downloadable PDF with company branding.
- **Paystack Integration**: Includes a unique Paystack payment link and reference.
- **Breakdown**: Shows subtotal, VAT, and total due.

### Usage
- After creating an order, a success dialog appears.
- Click **Download Invoice** to get the PDF.
- The invoice contains a "Click Link to Pay" section for the customer.

### Technical Details
- **Utility**: `src/utils/invoiceGenerator.ts` (using `jspdf`).
- **Edge Function**: `paystack-init-transaction` initializes the payment.
- **Secrets**: Requires `PAYSTACK_SECRET_KEY` in Supabase.

## 4. Production Configuration

### Environment Variables / Secrets
Ensure the following secrets are set in your Supabase project:

```bash
supabase secrets set PAYSTACK_SECRET_KEY=sk_test_xxxx
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=ey...
```

### Testing
- **Unit Tests**: Run `npm test src/utils/vat.test.ts` to verify VAT logic.
- **Integration**: The system uses Edge Functions which require a deployed environment or local Supabase setup to test fully.

## 5. Deployment

When deploying to production:
1. Push migrations: `supabase db push`
2. Deploy functions: `supabase functions deploy admin-create-user` and `supabase functions deploy paystack-init-transaction`
3. Set secrets as mentioned above.
