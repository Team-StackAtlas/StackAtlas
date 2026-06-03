// Runtime configuration injected via index.html (window.__APP_CONFIG__).
// Populated by the host/deployment so secrets are not baked into the bundle.
interface AppConfig {
  /**
   * Gemini API key. NOTE: any value here is visible to the browser. This is a
   * temporary, prototype-only mechanism — the Gemini call must be moved behind
   * a server-side proxy before production use.
   */
  GEMINI_API_KEY?: string;
}

interface Window {
  __APP_CONFIG__?: AppConfig;
}
