import { redirect } from 'next/navigation';

// Proxy (src/proxy.ts) normally handles locale redirection.
// This is a safety net in case proxy matching is bypassed.
export default function RootPage() {
  redirect('/tr');
}
