export function isAuthorizedCronRequest(
  request: Request,
  secret = process.env.CRON_SECRET
): boolean {
  if (!secret) {
    return false;
  }

  const bearer = request.headers.get("authorization");
  if (bearer === `Bearer ${secret}`) {
    return true;
  }

  const altHeader = request.headers.get("x-cron-secret");
  if (altHeader === secret) {
    return true;
  }

  const url = new URL(request.url);
  return url.searchParams.get("key") === secret;
}
