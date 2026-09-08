import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { DashboardClient } from './_components/dashboard-client';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const userId = (session.user as any)?.id;
  if (!userId) redirect('/login');

  const profile = await prisma.riskProfile.findUnique({ where: { userId } });
  if (!profile) redirect('/onboarding');

  return <DashboardClient userName={session.user?.name ?? 'Utilizador'} riskProfile={profile.classification} />;
}
