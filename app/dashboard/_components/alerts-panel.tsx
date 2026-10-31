'use client';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Bell, BellRing, Plus, Trash2, Loader2, RotateCcw, TrendingUp, TrendingDown,
  ArrowUpCircle, ArrowDownCircle, AlertTriangle, Target, Pencil,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface Props {
  assets: any[];
  onCountChange?: (count: number) => void;
}

const TYPE_META: Record<string, { label: string; short: string; icon: any; unit: string; dir: 'up' | 'down' }> = {
  PRICE_ABOVE: { label: 'Preço sobe acima de', short: 'Preço ≥', icon: ArrowUpCircle, unit: '€', dir: 'up' },
  PRICE_BELOW: { label: 'Preço desce abaixo de', short: 'Preço ≤', icon: ArrowDownCircle, unit: '€', dir: 'down' },
  GAIN_PCT: { label: 'Ganho atinge', short: 'Ganho ≥', icon: TrendingUp, unit: '%', dir: 'up' },
  LOSS_PCT: { label: 'Perda atinge', short: 'Perda ≥', icon: TrendingDown, unit: '%', dir: 'down' },
  LOSS_RECOVER: { label: 'Perda recupera até', short: 'Perda ≤', icon: TrendingUp, unit: '%', dir: 'up' },
};

export function AlertsPanel({ assets, onCountChange }: Props) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const [ticker, setTicker] = useState('');
  const [type, setType] = useState('PRICE_ABOVE');
  const [threshold, setThreshold] = useState('');
  const [note, setNote] = useState('');

  const holdings = (assets ?? []).filter((a: any) => a?.ticker);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/alerts');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data?.alerts ?? []);
        onCountChange?.(data?.triggeredCount ?? 0);
      } else {
        toast.error('Erro ao carregar alertas.');
      }
    } catch {
      toast.error('Erro de rede.');
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const resetForm = () => { setTicker(''); setType('PRICE_ABOVE'); setThreshold(''); setNote(''); setEditId(null); };

  const openCreate = () => { resetForm(); setOpen(true); };

  const openEdit = (a: any) => {
    setEditId(a?.id);
    setTicker((a?.ticker ?? '').toUpperCase());
    setType(a?.type ?? 'PRICE_ABOVE');
    setThreshold(a?.threshold != null ? String(a.threshold) : '');
    setNote(a?.note ?? '');
    setOpen(true);
  };

  const handleSubmit = async () => {
    const t = ticker.trim().toUpperCase();
    const thr = Number(threshold);
    if (!t) { toast.error('Indique o ativo (ticker).'); return; }
    if (!Number.isFinite(thr) || thr <= 0) { toast.error('Indique um valor válido.'); return; }
    setSaving(true);
    try {
      let res: Response;
      if (editId) {
        res = await fetch(`/api/alerts/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, threshold: thr, note: note.trim() }),
        });
      } else {
        const match = holdings.find((h: any) => (h?.ticker ?? '').toUpperCase() === t);
        res = await fetch('/api/alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker: t, name: match?.name ?? null, type, threshold: thr, note: note.trim() || null }),
        });
      }
      if (res.ok) {
        toast.success(editId ? 'Alerta atualizado.' : 'Alerta criado.');
        setOpen(false);
        resetForm();
        fetchAlerts();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d?.error ?? 'Erro ao guardar alerta.');
      }
    } catch {
      toast.error('Erro de rede.');
    } finally {
      setSaving(false);
    }
  };

  const patchAlert = async (id: string, payload: any) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) { fetchAlerts(); }
      else { toast.error('Erro ao atualizar alerta.'); }
    } catch {
      toast.error('Erro de rede.');
    } finally {
      setBusyId(null);
    }
  };

  const deleteAlert = async (id: string) => {
    if (!confirm('Eliminar este alerta?')) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/alerts/${id}`, { method: 'DELETE' });
      if (res.ok) { toast.success('Alerta eliminado.'); fetchAlerts(); }
      else { toast.error('Erro ao eliminar.'); }
    } catch {
      toast.error('Erro de rede.');
    } finally {
      setBusyId(null);
    }
  };

  const isPct = type === 'GAIN_PCT' || type === 'LOSS_PCT' || type === 'LOSS_RECOVER';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-display font-bold flex items-center gap-2">
          <Bell className="w-6 h-6 text-primary" /> Alertas
        </h2>
        <Dialog open={open} onOpenChange={(v: boolean) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Novo Alerta</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editId ? 'Editar Alerta' : 'Novo Alerta'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Ativo (ticker)</Label>
                <Input
                  placeholder="Ex.: AAPL, GALP.LS"
                  value={ticker}
                  disabled={!!editId}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTicker(e.target.value.toUpperCase())}
                />
                {!editId && holdings.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {holdings.slice(0, 12).map((h: any) => (
                      <button
                        key={h?.id}
                        type="button"
                        onClick={() => setTicker((h?.ticker ?? '').toUpperCase())}
                        className="text-xs font-mono px-2 py-0.5 rounded border border-border hover:bg-muted transition-colors"
                      >
                        {h?.ticker}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Condição</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRICE_ABOVE">Preço sobe acima de…</SelectItem>
                    <SelectItem value="PRICE_BELOW">Preço desce abaixo de…</SelectItem>
                    <SelectItem value="GAIN_PCT">Ganho atinge …%</SelectItem>
                    <SelectItem value="LOSS_PCT">Perda atinge …% (ou pior)</SelectItem>
                    <SelectItem value="LOSS_RECOVER">Perda recupera até …%</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{isPct ? 'Percentagem (%)' : 'Preço alvo (€)'}</Label>
                <Input
                  type="number"
                  min="0"
                  step={isPct ? '0.1' : '0.01'}
                  placeholder={isPct ? 'Ex.: 10' : 'Ex.: 150'}
                  value={threshold}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setThreshold(e.target.value)}
                />
                {isPct && type !== 'LOSS_RECOVER' && (
                  <p className="text-xs text-muted-foreground">Aplica-se a ativos que possui (usa o preço médio de compra).</p>
                )}
                {type === 'LOSS_RECOVER' && (
                  <p className="text-xs text-muted-foreground">Avisa quando uma posição em perda recupera até esta percentagem ou melhor (ex.: de −70% para −30%). Indique o valor sem sinal: 30 significa −30%.</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Nota (opcional)</Label>
                <Input
                  placeholder="Ex.: considerar vender"
                  value={note}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNote(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} {editId ? 'Guardar' : 'Criar Alerta'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Alert>
        <Target className="w-4 h-4" />
        <AlertDescription>
          Os alertas são verificados sempre que abre ou atualiza o painel. Isto não constitui aconselhamento financeiro.
        </AlertDescription>
      </Alert>

      {loading ? (
        <Card><CardContent className="p-4"><Skeleton className="h-40 w-full" /></CardContent></Card>
      ) : (alerts?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Ainda não tem alertas.</p>
            <p className="text-sm text-muted-foreground mt-1">Crie um alerta para ser avisado quando um ativo atingir um preço ou uma percentagem de ganho/perda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(alerts ?? []).map((a: any) => {
            const meta = TYPE_META[a?.type] ?? TYPE_META.PRICE_ABOVE;
            const Icon = meta.icon;
            const triggered = a?.triggered && a?.active;
            const good = meta.dir === 'up';
            const valueStr = a?.currentValue == null
              ? '—'
              : (a?.type === 'GAIN_PCT' || a?.type === 'LOSS_PCT')
                ? `${a.currentValue >= 0 ? '+' : ''}${a.currentValue.toFixed(2)}%`
                : `${a.currentValue.toFixed(2)}€`;
            return (
              <Card key={a?.id} className={triggered ? (good ? 'border-[color:var(--gain)]/60' : 'border-destructive/60') : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${good ? 'gain-text' : 'loss-text'}`} />
                        <span className="truncate">{a?.name ?? a?.ticker}</span>
                      </CardTitle>
                      <p className="font-mono text-xs text-muted-foreground mt-0.5">{a?.ticker}</p>
                    </div>
                    {triggered ? (
                      <Badge className={good ? 'bg-[color:var(--gain)] text-white' : 'bg-destructive text-white'}>
                        <BellRing className="w-3 h-3 mr-1" /> Disparado
                      </Badge>
                    ) : !a?.active ? (
                      <Badge variant="secondary">Pausado</Badge>
                    ) : !a?.hasData ? (
                      <Badge variant="outline" className="text-muted-foreground"><AlertTriangle className="w-3 h-3 mr-1" /> Sem dados</Badge>
                    ) : (
                      <Badge variant="outline">A monitorizar</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{meta.short} {a?.threshold}{meta.unit}</span>
                    <span className="font-mono">Atual: {valueStr}</span>
                  </div>
                  {a?.note && <p className="text-xs text-muted-foreground italic">{a.note}</p>}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!!a?.active}
                        disabled={busyId === a?.id}
                        onCheckedChange={(v: boolean) => patchAlert(a?.id, { active: v })}
                      />
                      <span className="text-xs text-muted-foreground">{a?.active ? 'Ativo' : 'Pausado'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {triggered && (
                        <Button variant="ghost" size="icon-sm" title="Reativar" disabled={busyId === a?.id} onClick={() => patchAlert(a?.id, { reset: true })}>
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon-sm" title="Editar" disabled={busyId === a?.id} onClick={() => openEdit(a)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" title="Eliminar" disabled={busyId === a?.id} onClick={() => deleteAlert(a?.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
