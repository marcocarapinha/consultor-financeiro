'use client';
import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, Plus, Trash2, Check, Loader2, FileSpreadsheet, Search, Briefcase, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AssetEntry {
  name: string;
  ticker: string;
  quantity: string;
  avgPrice: string;
  currency: string;
  purchaseDate: string;
  broker: string;
  sector: string;
  assetClass: string;
  validated: boolean | null;
}

const emptyAsset: AssetEntry = {
  name: '', ticker: '', quantity: '', avgPrice: '', currency: 'EUR',
  purchaseDate: '', broker: '', sector: '', assetClass: 'Ações', validated: null,
};

export function PortfolioManagementContent({ onUpdate }: { onUpdate: () => void }) {
  const [mode, setMode] = useState<'manual' | 'upload'>('manual');
  const [assets, setAssets] = useState<AssetEntry[]>([{ ...emptyAsset }]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState<string | null>(null);
  const [uploadedAssets, setUploadedAssets] = useState<any[] | null>(null);

  const addRow = () => {
    setAssets((prev) => [...(prev ?? []), { ...emptyAsset }]);
  };

  const removeRow = (idx: number) => {
    setAssets((prev) => (prev ?? []).filter((_: any, i: number) => i !== idx));
  };

  const updateRow = (idx: number, field: keyof AssetEntry, value: string) => {
    setAssets((prev) => {
      const updated = [...(prev ?? [])];
      if (updated[idx]) {
        updated[idx] = { ...updated[idx], [field]: value, validated: field === 'ticker' ? null : updated[idx].validated };
      }
      return updated;
    });
  };

  const validateTickerFn = async (idx: number) => {
    const ticker = assets?.[idx]?.ticker;
    if (!ticker) return;
    setValidating(ticker);
    try {
      const res = await fetch(`/api/portfolio/validate-ticker?ticker=${encodeURIComponent(ticker)}`);
      const data = await res.json();
      setAssets((prev) => {
        const updated = [...(prev ?? [])];
        if (updated[idx]) {
          updated[idx] = { ...updated[idx], validated: data?.valid ?? false, name: data?.name ?? updated[idx].name };
        }
        return updated;
      });
      if (data?.valid) {
        toast.success(`${ticker} válido: ${data?.name ?? ''}`);
      } else {
        toast.error(`${ticker} não encontrado no Yahoo Finance.`);
      }
    } catch {
      toast.error('Erro ao validar ticker.');
    } finally {
      setValidating(null);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/portfolio/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setUploadedAssets(data?.parsed ?? []);
        toast.success(`${data?.count ?? 0} ativos encontrados no ficheiro.`);
      } else {
        toast.error(data?.error ?? 'Erro ao processar ficheiro.');
      }
    } catch {
      toast.error('Erro de rede.');
    } finally {
      setUploading(false);
    }
  };

  const saveAssets = async (assetsToSave: any[]) => {
    setSaving(true);
    try {
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets: assetsToSave }),
      });
      if (res.ok) {
        toast.success('Ativos adicionados com sucesso!');
        setAssets([{ ...emptyAsset }]);
        setUploadedAssets(null);
        onUpdate();
      } else {
        const data = await res.json();
        toast.error(data?.error ?? 'Erro ao guardar.');
      }
    } catch {
      toast.error('Erro de rede.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-primary" /> Gerir Carteira
        </h2>
        <div className="flex gap-2">
          <Button variant={mode === 'manual' ? 'default' : 'outline'} size="sm" onClick={() => setMode('manual')}>
            <Plus className="w-4 h-4 mr-1" /> Manual
          </Button>
          <Button variant={mode === 'upload' ? 'default' : 'outline'} size="sm" onClick={() => setMode('upload')}>
            <Upload className="w-4 h-4 mr-1" /> Upload
          </Button>
        </div>
      </div>

      {mode === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" /> Upload de Ficheiro
            </CardTitle>
            <CardDescription>
              Carregue um ficheiro CSV ou XLSX com colunas: ticker, quantidade, preço médio (e opcionalmente: nome, data, corretora, setor)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Ficheiro CSV / XLSX</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleUpload}
                disabled={uploading}
                className="mt-1"
              />
              {uploading && <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1"><Loader2 className="w-4 h-4 animate-spin" /> A processar...</p>}
            </div>

            {uploadedAssets && (uploadedAssets.length ?? 0) > 0 && (
              <div>
                <Alert className="mb-3">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    Foram encontrados {uploadedAssets.length} ativos. Confirme antes de adicionar à carteira.
                  </AlertDescription>
                </Alert>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Ticker</TableHead>
                        <TableHead>Qtd.</TableHead>
                        <TableHead>Preço Médio</TableHead>
                        <TableHead>Classe</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(uploadedAssets ?? []).map((a: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell>{a?.name ?? '-'}</TableCell>
                          <TableCell className="font-mono">{a?.ticker ?? '-'}</TableCell>
                          <TableCell>{a?.quantity ?? '0'}</TableCell>
                          <TableCell>{a?.avgPrice ?? '0'}€</TableCell>
                          <TableCell>{a?.assetClass ?? '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button onClick={() => saveAssets(uploadedAssets)} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                    Confirmar e Adicionar
                  </Button>
                  <Button variant="outline" onClick={() => setUploadedAssets(null)}>Cancelar</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {mode === 'manual' && (
        <Card>
          <CardHeader>
            <CardTitle>Adicionar Ativos Manualmente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(assets ?? []).map((a: AssetEntry, idx: number) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                <div className="space-y-1">
                  <Label className="text-xs">Ticker *</Label>
                  <div className="flex gap-1">
                    <Input
                      placeholder="ex: AAPL"
                      value={a?.ticker ?? ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateRow(idx, 'ticker', e.target.value.toUpperCase())}
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => validateTickerFn(idx)}
                      disabled={!a?.ticker || validating === a?.ticker}
                    >
                      {validating === a?.ticker ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                  </div>
                  {a?.validated === true && <Badge variant="default" className="text-xs"><Check className="w-3 h-3 mr-1" /> Válido</Badge>}
                  {a?.validated === false && <Badge variant="destructive" className="text-xs">Não encontrado</Badge>}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nome</Label>
                  <Input placeholder="Nome do ativo" value={a?.name ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateRow(idx, 'name', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Quantidade *</Label>
                  <Input type="number" placeholder="0" value={a?.quantity ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateRow(idx, 'quantity', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Preço Médio *</Label>
                  <Input type="number" step="0.01" placeholder="0.00" value={a?.avgPrice ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateRow(idx, 'avgPrice', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Classe de Ativo</Label>
                  <Select value={a?.assetClass ?? 'Ações'} onValueChange={(v: string) => updateRow(idx, 'assetClass', v)}>
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
                  <Input type="date" value={a?.purchaseDate ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateRow(idx, 'purchaseDate', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Corretora</Label>
                  <Input placeholder="Opcional" value={a?.broker ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateRow(idx, 'broker', e.target.value)} />
                </div>
                <div className="flex items-end">
                  {(assets?.length ?? 0) > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeRow(idx)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <Button variant="outline" onClick={addRow}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar Linha
              </Button>
              <Button
                onClick={() => saveAssets(assets.filter((a: AssetEntry) => a.ticker && parseFloat(a.quantity) > 0))}
                disabled={saving || assets.every((a: AssetEntry) => !a.ticker || !a.quantity)}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                Guardar Ativos
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
