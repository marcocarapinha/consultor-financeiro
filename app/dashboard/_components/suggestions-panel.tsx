'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Loader2, RefreshCw, AlertTriangle, ThumbsUp, ThumbsDown, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

export function SuggestionsPanel() {
  const [suggestions, setSuggestions] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/suggestions');
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
      } else {
        toast.error('Erro ao gerar sugestões.');
      }
    } catch {
      toast.error('Erro de rede.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold flex items-center gap-2">
          <Lightbulb className="w-6 h-6 text-primary" /> Sugestões de Investimento (IA)
        </h2>
        <Button onClick={fetchSuggestions} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          {suggestions ? 'Atualizar' : 'Gerar Sugestões'}
        </Button>
      </div>

      <Alert>
        <AlertTriangle className="w-4 h-4" />
        <AlertDescription>
          ⚠️ Isto não constitui aconselhamento financeiro. Consulte um consultor financeiro certificado antes de tomar qualquer decisão de investimento.
        </AlertDescription>
      </Alert>

      {suggestions?.summary && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm">{suggestions.summary}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">A analisar a sua carteira...</span>
        </div>
      )}

      {!loading && !suggestions && (
        <Card>
          <CardContent className="p-8 text-center">
            <Lightbulb className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Clique em &quot;Gerar Sugestões&quot; para obter recomendações personalizadas.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(suggestions?.suggestions ?? []).map((s: any, i: number) => {
          const isHighRisk = (s?.riskLevel ?? '').toLowerCase().includes('alto') || (s?.riskLevel ?? '').toLowerCase().includes('muito');
          return (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {s?.name ?? 'Ativo'}
                    <span className="text-xs font-mono text-muted-foreground ml-2">{s?.ticker ?? ''}</span>
                  </CardTitle>
                  <div className="flex gap-1">
                    {isHighRisk && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Risco Elevado
                      </Badge>
                    )}
                    <Badge variant={isHighRisk ? 'destructive' : 'secondary'} className="text-xs">
                      {s?.riskLevel ?? 'N/A'}
                    </Badge>
                    {s?.assetClass && <Badge variant="outline" className="text-xs">{s.assetClass}</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{s?.reason ?? ''}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-medium gain-text flex items-center gap-1 mb-1"><ThumbsUp className="w-3 h-3" /> Prós</p>
                    <ul className="text-xs space-y-1">
                      {(s?.pros ?? []).map((p: string, j: number) => (
                        <li key={j} className="flex items-start gap-1"><span className="gain-text">+</span> {p}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium loss-text flex items-center gap-1 mb-1"><ThumbsDown className="w-3 h-3" /> Contras</p>
                    <ul className="text-xs space-y-1">
                      {(s?.cons ?? []).map((c: string, j: number) => (
                        <li key={j} className="flex items-start gap-1"><span className="loss-text">-</span> {c}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
