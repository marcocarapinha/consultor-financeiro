'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, AlertCircle, BarChart3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useState } from 'react';

interface Props {
  assets: any[];
  loading: boolean;
  onRefresh: () => void;
}

export function AssetTable({ assets, loading, onRefresh }: Props) {
  const [deleting, setDeleting] = useState<string | null>(null);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="w-5 h-5" /> Ativos na Carteira
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ativo</TableHead>
                <TableHead>Ticker</TableHead>
                <TableHead className="text-right">Qtd.</TableHead>
                <TableHead className="text-right">P. Médio</TableHead>
                <TableHead className="text-right">P. Atual</TableHead>
                <TableHead className="text-right">Var. Dia</TableHead>
                <TableHead className="text-right">G/P Total</TableHead>
                <TableHead className="text-right">Peso</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(assets ?? []).map((a: any, i: number) => {
                const isGainDay = (a?.dayChange ?? 0) >= 0;
                const isGainTotal = (a?.totalGain ?? 0) >= 0;
                const hasError = !!a?.quote?.error;
                return (
                  <TableRow key={a?.id ?? `asset-${i}`}>
                    <TableCell className="font-medium">
                      {a?.name ?? '-'}
                      {hasError && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          <AlertCircle className="w-3 h-3 mr-1" /> Sem cotação
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
