'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Newspaper, ExternalLink, RefreshCw } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

interface NewsItem {
  title: string;
  link: string;
  publisher: string;
  providerPublishTime: number | null;
  thumbnail: string | null;
  relatedTicker: string | null;
}

function timeAgo(ts: number | null): string {
  if (!ts) return '';
  const seconds = Math.floor(Date.now() / 1000 - ts);
  if (seconds < 60) return 'agora mesmo';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `há ${days} d`;
}

export function MarketNews() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNews = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/news');
      if (res.ok) {
        const data = await res.json();
        setNews(Array.isArray(data?.news) ? data.news : []);
      }
    } catch {
      // silent; show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Newspaper className="w-5 h-5" /> Últimas Notícias do Mercado
          </CardTitle>
          <Button variant="ghost" size="icon-sm" onClick={fetchNews} aria-label="Atualizar notícias">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-6">
            <Newspaper className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Sem notícias disponíveis de momento.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {news.map((n, i) => (
              <li key={n.link ?? i}>
                <a
                  href={n.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 py-3 group hover:bg-muted/40 rounded-md px-2 -mx-2 transition-colors"
                >
                  <div className="relative w-16 h-16 shrink-0 rounded-md overflow-hidden bg-muted">
                    {n.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={n.thumbnail} alt={n.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Newspaper className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {n.title}
                    </p>
                    <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                      {n.publisher && <span>{n.publisher}</span>}
                      {n.providerPublishTime && <span>· {timeAgo(n.providerPublishTime)}</span>}
                      {n.relatedTicker && (
                        <Badge variant="outline" className="text-[10px] font-mono py-0">
                          {n.relatedTicker}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">
          As notícias são fornecidas por fontes externas apenas para fins informativos. Isto não constitui
          aconselhamento financeiro.
        </p>
      </CardContent>
    </Card>
  );
}
