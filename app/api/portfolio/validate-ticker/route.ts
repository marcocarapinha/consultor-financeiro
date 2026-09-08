export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { validateTicker } from '@/lib/yahoo-finance';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');
    if (!ticker) return NextResponse.json({ error: 'Ticker em falta.' }, { status: 400 });

    const result = await validateTicker(ticker);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ valid: false, name: null });
  }
}
