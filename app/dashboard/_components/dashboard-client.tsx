'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { TrendingUp, LogOut, RefreshCw, MessageCircle, Briefcase, Lightbulb, Menu, X, Bell, BellRing } from 'lucide-react';
import { PortfolioSummary } from './portfolio-summary';
import { AssetTable } from './asset-table';
import { PortfolioChart } from './portfolio-chart';
import { AllocationChart } from './allocation-chart';
import { TopMovers } from './top-movers';
import { BenchmarkComparison } from './benchmark-comparison';
import { SuggestionsPanel } from './suggestions-panel';
import { AlertsPanel } from './alerts-panel';
import { MarketNews } from './market-news';
import { ChatPanel } from './chat-panel';
import { toast } from 'sonner';

interface DashboardClientProps {
  userName: string;
  riskProfile: string;
}

export function DashboardClient({ userName, riskProfile }: DashboardClientProps) {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'portfolio' | 'suggestions' | 'alerts'>('dashboard');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [triggeredAlerts, setTriggeredAlerts] = useState(0);

  const fetchPortfolio = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/portfolio');
      if (res.ok) {
        const data = await res.json();
        setPortfolio(data);
      }
    } catch {
      toast.error('Erro ao carregar carteira.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const handleLogout = async () => {
    await signOut({ redirectTo: '/login' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg hidden sm:block">InvestAssist</span>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {[
              { key: 'dashboard', label: 'Dashboard', icon: TrendingUp },
              { key: 'portfolio', label: 'Carteira', icon: Briefcase },
              { key: 'alerts', label: 'Alertas', icon: Bell },
              { key: 'suggestions', label: 'Sugestões IA', icon: Lightbulb },
            ].map((tab: any) => (
              <Button
                key={tab.key}
                variant={activeTab === tab.key ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab.key)}
              >
                <tab.icon className="w-4 h-4 mr-1" />
                {tab.label}
              </Button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setActiveTab('alerts')} className="relative" title="Alertas">
              {triggeredAlerts > 0 ? <BellRing className="w-5 h-5 text-primary" /> : <Bell className="w-5 h-5" />}
              {triggeredAlerts > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center">
                  {triggeredAlerts}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowChat(!showChat)} className="relative">
              <MessageCircle className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={fetchPortfolio}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <span className="text-xs text-muted-foreground hidden sm:block">{userName}</span>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenu(!mobileMenu)}>
              {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
        {mobileMenu && (
          <div className="md:hidden border-t border-border p-2 flex gap-1">
            {[
              { key: 'dashboard', label: 'Dashboard', icon: TrendingUp },
              { key: 'portfolio', label: 'Carteira', icon: Briefcase },
              { key: 'alerts', label: 'Alertas', icon: Bell },
              { key: 'suggestions', label: 'Sugestões', icon: Lightbulb },
            ].map((tab: any) => (
              <Button
                key={tab.key}
                variant={activeTab === tab.key ? 'default' : 'ghost'}
                size="sm"
                className="flex-1"
                onClick={() => { setActiveTab(tab.key); setMobileMenu(false); }}
              >
                <tab.icon className="w-4 h-4 mr-1" />
                {tab.label}
              </Button>
            ))}
          </div>
        )}
      </header>

      <div className="flex">
        {/* Main Content */}
        <main className={`flex-1 max-w-[1200px] mx-auto p-4 transition-all ${showChat ? 'mr-0 lg:mr-[380px]' : ''}`}>
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <PortfolioSummary portfolio={portfolio} loading={loading} riskProfile={riskProfile} />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <PortfolioChart />
                </div>
                <AllocationChart assets={portfolio?.assets ?? []} />
              </div>
              <AssetTable assets={portfolio?.assets ?? []} loading={loading} onRefresh={fetchPortfolio} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TopMovers assets={portfolio?.assets ?? []} />
                <BenchmarkComparison />
              </div>
              <MarketNews />
            </div>
          )}
          {activeTab === 'portfolio' && (
            <PortfolioManager assets={portfolio?.assets ?? []} loading={loading} onUpdate={fetchPortfolio} />
          )}
          {activeTab === 'alerts' && (
            <AlertsPanel assets={portfolio?.assets ?? []} onCountChange={setTriggeredAlerts} />
          )}
          {activeTab === 'suggestions' && (
            <SuggestionsPanel />
          )}
        </main>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="fixed right-0 top-14 bottom-0 w-full lg:w-[380px] border-l border-border bg-background z-40">
            <ChatPanel onClose={() => setShowChat(false)} />
          </div>
        )}
      </div>
    </div>
  );
}

// Inline PortfolioManager to keep it in the same batch
function PortfolioManager({ assets, loading, onUpdate }: { assets: any[]; loading: boolean; onUpdate: () => void }) {
  return (
    <div className="space-y-6">
      <HoldingsEditor assets={assets} loading={loading} onUpdate={onUpdate} />
      <PortfolioManagementContent onUpdate={onUpdate} />
    </div>
  );
}

import { PortfolioManagementContent } from './portfolio-management';
import { HoldingsEditor } from './holdings-editor';
