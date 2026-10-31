'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, Trash2, Check, Loader2, ListChecks, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  assets: any[];
  loading: boolean;
  onUpdate: () => void;
}

interface FormState {
  id: string;
  name: string;
  ticker: string;
  quantity: string;
  avgPrice: string;
  currency: string;
  purchaseDate: string;
  broker: string;
  assetClass: string;
  validated: boolean | null;
}

const emptyForm: FormState = {
  id: '',
  name: '',
  ticker: '',
  quantity: '',
  avgPrice: '',
  currency: 'EUR',
  purchaseDate: '',
  broker: '',
  assetClass: 'Ações',
  validated: null,
};

function toDateInput(v: any): string {
  if (!v) return '';
  try {
    return new Date(v).toISOString().split('T')[0];
  } catch {
    return '';
  }
}

export function HoldingsEditor({ assets, loading, onUpdate }: Props) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);

  const isEditing = !!form?.id;

  const openCreate = () => {
    setForm({ ...emptyForm });
  };

  const openEdit = (a: any) => {
    setForm({
      id: a?.id ?? '',
      name: a?.name ?? '',
      ticker: a?.ticker ?? '',
      quantity: String(a?.quantity ?? ''),
      avgPrice: String(a?.avgPrice ?? ''),
      currency: a?.currency ?? 'EUR',
      purchaseDate: toDateInput(a?.purchaseDate),
      broker: a?.broker ?? '',
      assetClass: a?.assetClass ?? 'Ações',
      validated: null,
    });
  };

  const setField = (field: keyof FormState, value: string | boolean | null) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const validateTickerFn = async () => {
    const ticker = form?.ticker;
    if (!ticker) return;
    setValidating(true);
    try {
      const res = await fetch(`/api/portfolio/validate-ticker?ticker=${encodeURIComponent(ticker)}`);
      const data = await res.json();
      setForm((prev) => (prev ? { ...prev, validated: data?.valid ?? false, name: data?.name ?? prev.name } : prev));
      if (data?.valid) {
        toast.success(`${ticker} válido: ${data?.name ?? ''}`);
      } else {
        toast.error(`${ticker} não encontrado.`);
      }
    } catch {
      toast.error('Erro ao validar ticker.');
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async () => {
    if (!form) return;
    if (!form.ticker || !(parseFloat(form.quantity) > 0)) {
      toast.error('Indique um ticker e uma quantidade válida.');
      return;
    }
    setSaving(true);
    try {
      let res: Response;
      if (isEditing) {
        res = await fetch('/api/portfolio', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else {
        res = await fetch('/api/portfolio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assets: [form] }),
        });
      }
      if (res.ok) {
        toast.success(isEditing ? 'Ativo atualizado.' : 'Ativo adicionado.');
        setForm(null);
        onUpdate();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error ?? 'Erro ao guardar ativo.');
      }
    } catch {
      toast.error('Erro de rede.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!id) return;
    if (!confirm('Tem a certeza que deseja remover este ativo?')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/portfolio?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Ativo removido.');
        onUpdate();
      } else {
        toast.error('Erro ao remover ativo.');
      }
    } catch {
      toast.error('Erro de rede.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ListChecks className="w-5 h-5" /> Os Meus Ativos
            </CardTitle>
            <CardDescription>Visualize, edite ou remova os ativos guardados na sua carteira.</CardDescription>
          </div>
          <Button onClick={openCreate} size="sm" className="shrink-0">
            <Plus className="w-4 h-4 mr-1" /> Novo Ativo
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-4"><Skeleton className="h-40 w-full" /></div>
        ) : (assets?.length ?? 0) === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p>Ainda não tem ativos na carteira.</p>
            <p className="text-sm mt-1">Clique em «Novo Ativo» para começar.</p>
          </div>
        ) : (
          <>
          {/* Vista de cartões (telemóvel) */}
          <div className="md:hidden divide-y divide-border">
            {(assets ?? []).map((a: any, i: number) => (
              <div key={a?.id ?? `mh-${i}`} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{a?.name || '-'}</p>
                    <p className="font-mono text-xs text-muted-foreground">{a?.ticker ?? '-'}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(a)} aria-label="Editar"><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(a?.id)} disabled={deleting === a?.id} aria-label="Remover">
                      {deleting === a?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}
                    </Button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Qtd.</span><span className="font-mono">{a?.quantity?.toFixed?.(2) ?? '0'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">P. Médio</span><span className="font-mono">{a?.avgPrice?.toFixed?.(2) ?? '0'} {a?.currency ?? 'EUR'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Classe</span><span>{a?.assetClass || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Corretora</span><span className="truncate ml-2">{a?.broker || '-'}</span></div>
                </div>
              </div>
            ))}
          </div>
          {/* Vista de tabela (ecrãs maiores) */}
          <div className="overflow-x-auto hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Ticker</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead className="text-right">P. Médio</TableHead>
                  <TableHead>Classe</TableHead>
                  <TableHead>Corretora</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(assets ?? []).map((a: any, i: number) => (
                  <TableRow key={a?.id ?? `h-${i}`}>
                    <TableCell className="font-medium">{a?.name || '-'}</TableCell>
                    <TableCell className="font-mono text-sm">{a?.ticker ?? '-'}</TableCell>
                    <TableCell className="text-right font-mono">{a?.quantity?.toFixed?.(2) ?? '0'}</TableCell>
                    <TableCell className="text-right font-mono">{a?.avgPrice?.toFixed?.(2) ?? '0'} {a?.currency ?? 'EUR'}</TableCell>
                    <TableCell>{a?.assetClass || '-'}</TableCell>
                    <TableCell>{a?.broker || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(a)} aria-label="Editar">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(a?.id)}
                          disabled={deleting === a?.id}
                          aria-label="Remover"
                        >
                          {deleting === a?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          </>
        )}
      </CardContent>

      <Dialog open={!!form} onOpenChange={(o: boolean) => { if (!o) setForm(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Ativo' : 'Novo Ativo'}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Ticker *</Label>
                <div className="flex gap-1">
                  <Input
                    className="font-mono"
                    placeholder="ex: AAPL"
                    value={form.ticker}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setForm((prev) => (prev ? { ...prev, ticker: e.target.value.toUpperCase(), validated: null } : prev)); }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={validateTickerFn}
                    disabled={!form.ticker || validating}
                    aria-label="Validar ticker"
                  >
                    {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
                {form.validated === true && <Badge variant="default" className="text-xs"><Check className="w-3 h-3 mr-1" /> Válido</Badge>}
                {form.validated === false && <Badge variant="destructive" className="text-xs">Não encontrado</Badge>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nome</Label>
                <Input value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField('name', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Quantidade *</Label>
                <Input type="number" value={form.quantity} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField('quantity', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Preço Médio *</Label>
                <Input type="number" step="0.01" value={form.avgPrice} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField('avgPrice', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Moeda</Label>
                <Select value={form.currency} onValueChange={(v: string) => setField('currency', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CHF">CHF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Classe de Ativo</Label>
                <Select value={form.assetClass} onValueChange={(v: string) => setField('assetClass', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ações">Ações</SelectItem>
                    <SelectItem value="ETF">ETF</SelectItem>
                    <SelectItem value="Obrigações">Obrigações</SelectItem>
                    <SelectItem value="Criptomoedas">Criptomoedas</SelectItem>
                    <SelectItem value="Fundos">Fundos</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data de Compra</Label>
                <Input type="date" value={form.purchaseDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField('purchaseDate', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Corretora</Label>
                <Input value={form.broker} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField('broker', e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              {isEditing ? 'Guardar Alterações' : 'Adicionar Ativo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
