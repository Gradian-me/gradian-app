// Force dynamic rendering for all authentication routes so login (and sign-up, etc.)
// are never statically cached. This avoids 404 on first load after redirect (e.g. after
// session expiry when user is sent to /authentication/login?returnUrl=...).
export const dynamic = 'force-dynamic';

export default function AuthenticationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
