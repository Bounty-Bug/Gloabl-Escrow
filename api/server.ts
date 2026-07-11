// Vercel serverless function — wraps the Express app
// Vercel routes all /api/* requests here and nft-bundles all imports automatically.
export { default } from '../artifacts/api-server/src/app';
