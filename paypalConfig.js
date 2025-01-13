const checkoutSdk = require('@paypal/checkout-server-sdk');
require('dotenv').config(); 

// function environment() {
//   return new checkoutSdk.core.SandboxEnvironment(
//     'Ac35fQGDcAeRQmWusn-dFNoyeVr_ok8DTd4MNX-FprgXZihuvfm4AvduQYXIGNrxVrxCWGRzfFz_Yapc', // Replace with your Client ID
//     'EFvMLju0q78H22fMeSalLZVcW0VfQAxPyIzoWly59XBA8K33Z0GWeBagRecgPbQ0cFhJsgwQV5xbF_3S' // Replace with your Secret
//   );
// }
const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

// Choose the correct environment: Sandbox for testing or Live for production
const environment = process.env.NODE_ENV === 'production'
    ? new checkoutSdk.core.LiveEnvironment(clientId, clientSecret)
    : new checkoutSdk.core.SandboxEnvironment(clientId, clientSecret);
const client = new checkoutSdk.core.PayPalHttpClient(environment);

module.exports = client;