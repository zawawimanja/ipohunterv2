// Vercel Web Analytics
// This module initializes Vercel Web Analytics using the @vercel/analytics package
// Using esm.sh CDN to load the package since this is a static HTML project without a bundler
import { inject } from 'https://esm.sh/@vercel/analytics@2.0.1';

// Initialize analytics with production mode
// Mode is automatically detected based on the environment
inject({ mode: 'auto' });
