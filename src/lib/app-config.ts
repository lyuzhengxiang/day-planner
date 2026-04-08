export function getAppBaseUrl(appBaseUrl = process.env.APP_BASE_URL): string {
  const value = appBaseUrl?.trim();

  if (!value) {
    return "http://localhost:3000";
  }

  return value.replace(/\/+$/, "");
}
