import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { OnboardingForm } from './_components/onboarding-form';

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const userId = (session.user as any)?.id;
  if (!userId) redirect('/login');
  const existing = await prisma.riskProfile.findUnique({ where: { userId } });
  if (existing) redirect('/dashboard');
  return <OnboardingForm />;
}
