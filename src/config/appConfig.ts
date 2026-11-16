/**
 * Global App Configuration for Signal
 * Controls strict production vs demo/mock data fallback modes
 */

export interface AppConfig {
  /**
   * If true, uses mock sample data when backend returns empty records or is offline.
   * If false, strictly enforces live DB data & clean empty states for production.
   */
  enableMockFallback: boolean;

  /**
   * Application environment
   */
  environment: "development" | "production" | "test";
}

const isProduction = import.meta.env.PROD;

export const appConfig: AppConfig = {
  // Set to false for strict live database mode (no mock data fallbacks)
  enableMockFallback: false,
  environment: isProduction ? "production" : "development",
};

export function setMockMode(enabled: boolean) {
  appConfig.enableMockFallback = isProduction ? false : enabled;
  localStorage.setItem("signal_mock_mode", String(appConfig.enableMockFallback));
}
