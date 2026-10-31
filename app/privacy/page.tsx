import Link from 'next/link';
import { TrendingUp } from 'lucide-react';

export const metadata = {
  title: 'Política de Privacidade - InvestAssist',
  description:
    'Como o InvestAssist recolhe, utiliza, armazena e protege os seus dados pessoais.',
};

// Contacto de privacidade. Substitua pelo seu email real de contacto.
const CONTACT_EMAIL = 'mcarapinha@gmail.com';
const LAST_UPDATED = '9 de setembro de 2026';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="w-full border-b border-border/60">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-display font-bold tracking-tight">InvestAssist</span>
          </Link>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Iniciar sessão
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
          Política de Privacidade
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Última atualização: {LAST_UPDATED}</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">
          <section className="space-y-3">
            <p>
              A presente Política de Privacidade descreve como o <strong>InvestAssist</strong>
              {' '}(“a aplicação”, “nós”) recolhe, utiliza, armazena e protege os seus dados pessoais
              quando utiliza a nossa aplicação web. Ao criar uma conta ou iniciar sessão, o utilizador
              declara ter lido e compreendido esta política.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold">1. Responsável pelo tratamento</h2>
            <p>
              O responsável pelo tratamento dos dados é a equipa do InvestAssist. Para qualquer questão
              relacionada com privacidade, pode contactar-nos através do email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline" suppressHydrationWarning>
                {CONTACT_EMAIL}
              </a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold">2. Dados que recolhemos</h2>
            <p>Recolhemos apenas os dados necessários para o funcionamento da aplicação:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Dados de conta:</strong> nome, endereço de email e uma versão encriptada
                (hash) da sua palavra-passe. Se optar por iniciar sessão com o Google, recebemos o
                seu nome, email e imagem de perfil associados à sua Conta Google.
              </li>
              <li>
                <strong>Perfil de risco:</strong> as respostas ao questionário de perfil de
                investidor (por exemplo, tolerância ao risco e horizonte temporal).
              </li>
              <li>
                <strong>Dados da carteira:</strong> os ativos, quantidades e valores que
                voluntariamente introduz na aplicação para acompanhamento.
              </li>
              <li>
                <strong>Mensagens do assistente:</strong> as mensagens que troca com o assistente de
                IA, para lhe fornecer respostas e sugestões.
              </li>
              <li>
                <strong>Dados técnicos e de utilização:</strong> informação recolhida
                automaticamente, como endereço IP, tipo de dispositivo e estatísticas de utilização
                (quando as ferramentas de análise estão ativas).
              </li>
            </ul>
            <p>
              <strong>Não recolhemos credenciais bancárias</strong> e a aplicação nunca executa
              ordens de compra ou venda de instrumentos financeiros.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold">3. Como utilizamos os seus dados</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Criar e gerir a sua conta e autenticá-lo com segurança.</li>
              <li>Apresentar a sua carteira, cotações, gráficos e relatórios de desempenho.</li>
              <li>Gerar sugestões e respostas personalizadas através de inteligência artificial.</li>
              <li>Melhorar a estabilidade, a segurança e a experiência de utilização da aplicação.</li>
              <li>Cumprir obrigações legais aplicáveis.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold">4. Partilha com terceiros</h2>
            <p>
              Não vendemos os seus dados pessoais. Partilhamos dados apenas com prestadores de
              serviços estritamente necessários ao funcionamento da aplicação:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Google</strong> — para autenticação através do início de sessão com o Google
                (quando escolhe essa opção).
              </li>
              <li>
                <strong>Fornecedores de dados de mercado</strong> — para obter cotações e informação
                financeira dos ativos.
              </li>
              <li>
                <strong>Fornecedores de infraestrutura e de IA</strong> — para alojamento da
                aplicação e para processar os pedidos ao assistente de inteligência artificial.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold">5. Conservação dos dados</h2>
            <p>
              Mantemos os seus dados enquanto a sua conta estiver ativa. Pode solicitar a eliminação
              da sua conta e dos dados associados a qualquer momento, contactando-nos pelo email
              indicado. Alguns dados poderão ser conservados durante o período exigido por lei.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold">6. Segurança</h2>
            <p>
              Aplicamos medidas técnicas e organizativas adequadas para proteger os seus dados,
              incluindo a encriptação das palavras-passe e o acesso restrito aos dados por utilizador.
              Nenhum sistema é 100% seguro, mas empenhamo-nos em proteger a sua informação.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold">7. Os seus direitos</h2>
            <p>
              Nos termos do Regulamento Geral sobre a Proteção de Dados (RGPD), tem o direito de
              aceder, retificar, eliminar e limitar o tratamento dos seus dados, bem como o direito à
              portabilidade e o direito de oposição. Para exercer estes direitos, contacte-nos através
              do email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline" suppressHydrationWarning>
                {CONTACT_EMAIL}
              </a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold">8. Menores</h2>
            <p>
              A aplicação não se destina a menores de 18 anos e não recolhemos intencionalmente dados
              de menores.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold">9. Alterações a esta política</h2>
            <p>
              Poderemos atualizar esta Política de Privacidade periodicamente. As alterações serão
              publicadas nesta página, com a respetiva data de atualização.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold">10. Contacto</h2>
            <p>
              Para qualquer questão sobre esta política ou sobre o tratamento dos seus dados,
              contacte-nos através do email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline" suppressHydrationWarning>
                {CONTACT_EMAIL}
              </a>.
            </p>
          </section>

          <section className="space-y-3 border-t border-border/60 pt-6">
            <p className="text-xs text-muted-foreground">
              Aviso: O InvestAssist tem fins meramente informativos e educativos e não constitui
              aconselhamento financeiro, fiscal ou jurídico. As decisões de investimento são da
              exclusiva responsabilidade do utilizador.
            </p>
          </section>
        </div>

        <div className="mt-10">
          <Link href="/" className="text-sm text-primary hover:underline">
            ← Voltar à página inicial
          </Link>
        </div>
      </main>
    </div>
  );
}
