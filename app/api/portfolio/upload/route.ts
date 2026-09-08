export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const userId = (session.user as any)?.id;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Ficheiro em falta.' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook?.SheetNames?.[0];
    if (!sheetName) return NextResponse.json({ error: 'Ficheiro vazio.' }, { status: 400 });
    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet ?? {}) ?? [];

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Nenhum dado encontrado no ficheiro.' }, { status: 400 });
    }

    const parsed = rows.map((row: any) => ({
      name: row?.nome ?? row?.name ?? row?.Name ?? row?.Ativo ?? row?.ativo ?? '',
      ticker: (row?.ticker ?? row?.Ticker ?? row?.TICKER ?? row?.simbolo ?? row?.Symbol ?? '').toString().toUpperCase(),
      quantity: parseFloat(row?.quantidade ?? row?.quantity ?? row?.Quantidade ?? row?.Qty ?? '0') || 0,
      avgPrice: parseFloat(row?.preco_medio ?? row?.avgPrice ?? row?.['Preço Médio'] ?? row?.['preço médio'] ?? row?.Price ?? '0') || 0,
      currency: row?.moeda ?? row?.currency ?? row?.Currency ?? 'EUR',
      purchaseDate: row?.data ?? row?.date ?? row?.['Data de Compra'] ?? null,
      broker: row?.corretora ?? row?.broker ?? row?.Broker ?? null,
      sector: row?.setor ?? row?.sector ?? row?.Sector ?? null,
      assetClass: row?.classe ?? row?.assetClass ?? row?.['Classe de Ativo'] ?? null,
    })).filter((a: any) => a.ticker && a.quantity > 0);

    if (parsed.length === 0) {
      return NextResponse.json({ error: 'Nenhum ativo válido encontrado. Verifique as colunas: ticker, quantidade, preço médio.' }, { status: 400 });
    }

    return NextResponse.json({ parsed, count: parsed.length });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Erro ao processar ficheiro.' }, { status: 500 });
  }
}
