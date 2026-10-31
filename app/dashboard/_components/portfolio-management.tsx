'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Check, Loader2, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function PortfolioManagementContent({ onUpdate }: { onUpdate: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadedAssets, setUploadedAssets] = useState<any[] | null>(null);

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileSpreadsheet className="w-5 h-5" /> Importar de Ficheiro
        </CardTitle>
        <CardDescription>
          Carregue um ficheiro CSV ou XLSX com colunas: ticker, quantidade, preço médio (e opcionalmente: nome, data, corretora, setor).
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
  );
}
