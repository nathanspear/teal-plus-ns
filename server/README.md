# Teal+ Payment Server

This is an optional backend server for handling payment processing with Stripe.

## ⚠️ Note

This server is **optional** and only needed if you want to implement paid subscriptions. The extension will work fine without it in free/trial mode.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure Stripe:
   - Get your Stripe API keys from https://dashboard.stripe.com/apikeys
   - Replace `sk_test_YOUR_SECRET_KEY` in `server.js` with your actual secret key
   - Replace `whsec_YOUR_WEBHOOK_SECRET` with your webhook secret

3. Start the server:
```bash
node server.js
```

The server will run on `http://localhost:3000`

## API Endpoints

- `POST /api/create-payment-intent` - Create a payment intent
- `POST /api/confirm-payment` - Confirm payment and generate license
- `POST /api/validate-license` - Validate a license key
- `POST /api/webhook` - Handle Stripe webhooks

## Production Deployment

For production:
1. Use environment variables for sensitive data
2. Set up a proper database instead of in-memory storage
3. Configure HTTPS
4. Set up proper error handling and logging
5. Configure Stripe webhooks for production

