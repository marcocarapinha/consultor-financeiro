'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, ChevronRight, ChevronLeft, Loader2, Shield, Target, Clock, BarChart3, AlertTriangle, Wallet } from 'lucide-react';
import { toast } from 'sonner';

const questions = [
  {
    id: 'horizon',
    icon: Clock,
    question: 'Qual é o seu horizonte temporal de investimento?',
    options: [
      { value: '1', label: 'Menos de 1 ano' },
      { value: '2', label: '1 a 3 anos' },
      { value: '3', label: '3 a 5 anos' },
      { value: '4', label: '5 a 10 anos' },
      { value: '5', label: 'Mais de 10 anos' },
    ],
  },
  {
    id: 'objective',
    icon: Target,
    question: 'Qual é o principal objetivo dos seus investimentos?',
    options: [
      { value: '1', label: 'Preservar capital' },
      { value: '2', label: 'Gerar rendimento regular' },
      { value: '3', label: 'Crescimento moderado' },
      { value: '4', label: 'Crescimento agressivo' },
      { value: '5', label: 'Maximizar retornos (aceito alto risco)' },
    ],
  },
  {
    id: 'reaction_loss',
    icon: AlertTriangle,
    question: 'Se a sua carteira perdesse 20% do valor num mês, o que faria?',
    options: [
      { value: '1', label: 'Venderia tudo imediatamente' },
      { value: '2', label: 'Venderia parte dos investimentos' },
      { value: '3', label: 'Não faria nada, esperaria recuperar' },
      { value: '4', label: 'Compraria mais a preços baixos' },
    ],
  },
  {
    id: 'experience',
    icon: BarChart3,
    question: 'Qual é a sua experiência com investimentos?',
    options: [
      { value: '1', label: 'Nenhuma – sou iniciante' },
      { value: '2', label: 'Básica – depósitos e certificados' },
      { value: '3', label: 'Intermédia – ações e ETFs' },
      { value: '4', label: 'Avançada – derivados e criptomoedas' },
    ],
  },
  {
    id: 'income_stability',
    icon: Wallet,
    question: 'Como descreveria a estabilidade do seu rendimento?',
    options: [
      { value: '1', label: 'Instável – rendimentos irregulares' },
      { value: '2', label: 'Moderadamente estável' },
      { value: '3', label: 'Estável – rendimento fixo regular' },
      { value: '4', label: 'Muito estável – múltiplas fontes de rendimento' },
    ],
  },
  {
    id: 'risk_tolerance',
    icon: Shield,
    question: 'Que percentagem da carteira está disposto a arriscar perder para obter retornos mais elevados?',
    options: [
      { value: '1', label: '0% – não quero perder nada' },
      { value: '2', label: 'Até 10%' },
      { value: '3', label: 'Até 25%' },
      { value: '4', label: 'Até 50%' },
      { value: '5', label: 'Mais de 50%' },
    ],
  },
];

export function OnboardingForm() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const current = questions[step];
  const Icon = current?.icon ?? Shield;
  const progress = ((step + 1) / questions.length) * 100;

  const handleSelect = (value: string) => {
    setAnswers((prev) => ({ ...(prev ?? {}), [current?.id ?? '']: value }));
  };

  const handleNext = () => {
    if (!answers[current?.id ?? '']) {
      toast.error('Por favor, selecione uma opção.');
      return;
    }
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/risk-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data?.error ?? 'Erro ao guardar perfil.');
        return;
      }
      toast.success('Perfil de risco definido com sucesso!');
      router.push('/dashboard');
      router.refresh();
    } catch {
      toast.error('Erro de rede. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold tracking-tight">InvestAssist</h1>
        </div>
        <div className="mb-4">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Pergunta {step + 1} de {questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{current?.question ?? ''}</CardTitle>
                <CardDescription>Selecione a opção que melhor o descreve</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={answers[current?.id ?? ''] ?? ''}
              onValueChange={handleSelect}
              className="space-y-3"
            >
              {(current?.options ?? []).map((opt: any) => (
                <div
                  key={opt.value}
                  className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    answers[current?.id ?? ''] === opt.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleSelect(opt.value)}
                >
                  <RadioGroupItem value={opt.value} id={`${current?.id}-${opt.value}`} />
                  <Label htmlFor={`${current?.id}-${opt.value}`} className="cursor-pointer flex-1">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => setStep(Math.max(0, step - 1))}
                disabled={step === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
              </Button>
              <Button onClick={handleNext} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {step === questions.length - 1 ? 'Concluir' : 'Próxima'}
                {step < questions.length - 1 ? <ChevronRight className="w-4 h-4 ml-1" /> : null}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
