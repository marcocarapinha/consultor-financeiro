import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { ResetPasswordForm } from './_components/reset-password-form';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    redirect('/dashboard');
  }
  const { token, email } = await searchParams;
  return <ResetPasswordForm token={token ?? ''} email={email ?? ''} />;
}
