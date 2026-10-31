'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, AlertCircle, BarChart3, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useState, useMemo } from 'react';

interface Props {
  assets: any[];
  loading: boolean;
  onRefresh: () => void;
}

type SortKey =
  | 'name'
  | 'ticker'
  | 'quantity'
  | 'avgPrice'
  | 'currentPrice'
  | 'dayChangePercent'
  | 'totalGainPercent'
  | 'weight';
type SortDir = 'asc' | 'desc';

const SORT_LABELS: Record<SortKey, string> = {
  name: 'Ativo',
  ticker: 'Ticker',
  quantity: 'Qtd.',
  avgPrice: 'P. Médio',
  currentPrice: 'P. Atual',
  dayChangePercent: 'Var. Dia',
  totalGainPercent: 'G/P Total',
  weight: 'Peso',
};

const STRING_KEYS: SortKey[] = ['name', 'ticker'];

export function AssetTable({ assets, loading, onRefresh }: Props) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('weight');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      // Sensible default direction: text ascending, numbers descending.
      setSortDir(STRING_KEYS.includes(key) ? 'asc' : 'desc');
    }
  };

  const sortedAssets = useMemo(() => {
    const list = [...(assets ?? [])];
    const dir = sortDir === 'asc' ? 1 : -1;
    list.sort((a: any, b: any) => {
      if (STRING_KEYS.includes(sortKey)) {
        const av = String(a?.[sortKey] ?? '').toLowerCase();
        const bv = String(b?.[sortKey] ?? '').toLowerCase();
        return av.localeCompare(bv, 'pt') * dir;
      }
      const av = Number(a?.[sortKey] ?? 0);
      const bv = Number(b?.[sortKey] ?? 0);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return list;
  }, [assets, sortKey, sortDir]);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem a certeza que deseja remover este ativo?')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/portfolio?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Ativo removido.');
        onRefresh();
      } else {
        toast.error('Erro ao remover ativo.');
      }
    } catch {
      toast.error('Erro de rede.');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return <Card><CardContent className="p-4"><Skeleton className="h-48 w-full" /></CardContent></Card>;
  }

  if ((assets?.length ?? 0) === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Ainda não tem ativos na carteira.</p>
          <p className="text-sm text-muted-foreground mt-1">Vá à secção Carteira para adicionar ativos.</p>
        </CardContent>
      </Card>
    );
  }

  const SortHeader = ({ col, align = 'left' }: { col: SortKey; align?: 'left' | 'right' }) => {
    const active = sortKey === col;
    return (
      <TableHead className={align === 'right' ? 'text-right' : undefined}>
        <button
          type="button"
          onClick={() => handleSort(col)}
          className={`inline-flex items-center gap-1 select-none hover:text-foreground transition-colors ${
            align === 'right' ? 'flex-row-reverse' : ''
          } ${active ? 'text-foreground font-semibold' : ''}`}
          aria-label={`Ordenar por ${SORT_LABELS[col]}`}
        >
          {SORT_LABELS[col]}
          {active ? (
            sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />
          )}
        </button>
      </TableHead>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5" /> Ativos na Carteira
          </CardTitle>
          {/* Ordenação (telemóvel) */}
          <div className="flex items-center gap-2 md:hidden">
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                  <SelectItem key={k} value={k}>{SORT_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              aria-label={sortDir === 'asc' ? 'Ordem ascendente' : 'Ordem descendente'}
            >
              {sortDir === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Vista de cartões (telemóvel) */}
        <div className="md:hidden divide-y divide-border">
          {(sortedAssets ?? []).map((a: any, i: number) => {
            const isGainDay = (a?.dayChange ?? 0) >= 0;
            const isGainTotal = (a?.totalGain ?? 0) >= 0;
            const hasError = !!a?.quote?.error;
            const isStale = !!a?.quote?.stale;
            return (
              <div key={a?.id ?? `m-asset-${i}`} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{a?.name ?? '-'}</p>
                    <p className="font-mono text-xs text-muted-foreground">{a?.ticker ?? '-'}</p>
                    {hasError && (
                      <Badge variant="outline" className="mt-1 text-xs" title={a?.quote?.error ?? undefined}><AlertCircle className="w-3 h-3 mr-1" /> Sem cotação</Badge>
                    )}
                    {!hasError && isStale && (
                      <Badge variant="outline" className="mt-1 text-xs text-muted-foreground"><AlertCircle className="w-3 h-3 mr-1" /> Última cotação</Badge>
                    )}
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(a?.id)} disabled={deleting === a?.id} aria-label="Remover">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Qtd.</span><span className="font-mono">{a?.quantity?.toFixed?.(2) ?? '0'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Peso</span><span className="font-mono">{a?.weight?.toFixed?.(1) ?? '0'}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">P. Médio</span><span className="font-mono">{a?.avgPrice?.toFixed?.(2) ?? '0'}€</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">P. Atual</span><span className="font-mono">{hasError ? '-' : `${a?.currentPrice?.toFixed?.(2) ?? '0'}€`}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Var. Dia</span><span className={`font-mono ${isGainDay ? 'gain-text' : 'loss-text'}`}>{hasError ? '-' : `${isGainDay ? '+' : ''}${a?.dayChangePercent?.toFixed?.(2) ?? '0'}%`}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">G/P Total</span><span className={`font-mono ${isGainTotal ? 'gain-text' : 'loss-text'}`}>{`${isGainTotal ? '+' : ''}${a?.totalGainPercent?.toFixed?.(2) ?? '0'}%`}</span></div>
                </div>
              </div>
            );
          })}
        </div>
        {/* Vista de tabela (ecrãs maiores) */}
        <div className="overflow-x-auto hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader col="name" />
                <SortHeader col="ticker" />
                <SortHeader col="quantity" align="right" />
                <SortHeader col="avgPrice" align="right" />
                <SortHeader col="currentPrice" align="right" />
                <SortHeader col="dayChangePercent" align="right" />
                <SortHeader col="totalGainPercent" align="right" />
                <SortHeader col="weight" align="right" />
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(sortedAssets ?? []).map((a: any, i: number) => {
                const isGainDay = (a?.dayChange ?? 0) >= 0;
                const isGainTotal = (a?.totalGain ?? 0) >= 0;
                const hasError = !!a?.quote?.error;
                const isStale = !!a?.quote?.stale;
                return (
                  <TableRow key={a?.id ?? `asset-${i}`}>
                    <TableCell className="font-medium">
                      {a?.name ?? '-'}
                      {hasError && (
                        <Badge variant="outline" className="ml-2 text-xs" title={a?.quote?.error ?? undefined}>
                          <AlertCircle className="w-3 h-3 mr-1" /> Sem cotação
                        </Badge>
                      )}
                      {!hasError && isStale && (
                        <Badge variant="outline" className="ml-2 text-xs text-muted-foreground">
                          <AlertCircle className="w-3 h-3 mr-1" /> Última cotação
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{a?.ticker ?? '-'}</TableCell>
                    <TableCell className="text-right font-mono">{a?.quantity?.toFixed?.(2) ?? '0'}</TableCell>
                    <TableCell className="text-right font-mono">{a?.avgPrice?.toFixed?.(2) ?? '0'}€</TableCell>
                    <TableCell className="text-right font-mono">
                      {hasError ? '-' : `${a?.currentPrice?.toFixed?.(2) ?? '0'}€`}
                    </TableCell>
                    <TableCell className={`text-right font-mono ${isGainDay ? 'gain-text' : 'loss-text'}`}>
                      {hasError ? '-' : `${isGainDay ? '+' : ''}${a?.dayChange?.toFixed?.(2) ?? '0'}€ (${isGainDay ? '+' : ''}${a?.dayChangePercent?.toFixed?.(2) ?? '0'}%)`}
                    </TableCell>
                    <TableCell className={`text-right font-mono ${isGainTotal ? 'gain-text' : 'loss-text'}`}>
                      {`${isGainTotal ? '+' : ''}${a?.totalGain?.toFixed?.(2) ?? '0'}€ (${isGainTotal ? '+' : ''}${a?.totalGainPercent?.toFixed?.(2) ?? '0'}%)`}
                    </TableCell>
                    <TableCell className="text-right font-mono">{a?.weight?.toFixed?.(1) ?? '0'}%</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(a?.id)}
                        disabled={deleting === a?.id}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
