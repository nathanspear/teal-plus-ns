const express = require('express');
const stripe = require('stripe')('sk_test_YOUR_SECRET_KEY'); // Replace with your secret key
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage (replace with database in production)
const users = new Map();
const subscriptions = new Map();

// Routes
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { plan, customerId } = req.body;
    
    // Define plan prices (in cents)
    const planPrices = {
      basic: 499,    // $4.99
      pro: 999       // $9.99
    };
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: planPrices[plan],
      currency: 'usd',
      customer: customerId,
      metadata: {
        plan: plan,
        extension: 'teal-auto-off'
      }
    });
    
    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/confirm-payment', async (req, res) => {
  try {
    const { paymentIntentId, customerId, plan } = req.body;
    
    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
      // Generate license key
      const licenseKey = `TEAL_PREMIUM_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      // Store subscription
      subscriptions.set(customerId, {
        plan: plan,
        licenseKey: licenseKey,
        createdAt: new Date(),
        status: 'active',
        paymentIntentId: paymentIntentId
      });
      
      res.json({
        success: true,
        licenseKey: licenseKey,
        plan: plan
      });
    } else {
      res.status(400).json({ error: 'Payment not completed' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/validate-license', async (req, res) => {
  try {
    const { licenseKey } = req.body;
    
    // Find subscription by license key
    let subscription = null;
    for (const [customerId, sub] of subscriptions.entries()) {
      if (sub.licenseKey === licenseKey) {
        subscription = sub;
        break;
      }
    }
    
    if (subscription && subscription.status === 'active') {
      res.json({
        valid: true,
        plan: subscription.plan,
        expiresAt: subscription.createdAt
      });
    } else {
      res.json({ valid: false });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = 'whsec_YOUR_WEBHOOK_SECRET'; // Replace with your webhook secret
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }
  
  // Handle subscription events
  switch (event.type) {
    case 'customer.subscription.created':
      console.log('Subscription created:', event.data.object);
      break;
    case 'customer.subscription.updated':
      console.log('Subscription updated:', event.data.object);
      break;
    case 'customer.subscription.deleted':
      console.log('Subscription cancelled:', event.data.object);
      break;
    case 'invoice.payment_succeeded':
      console.log('Payment succeeded:', event.data.object);
      break;
    case 'invoice.payment_failed':
      console.log('Payment failed:', event.data.object);
      break;
  }
  
  res.json({ received: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
