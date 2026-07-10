import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import Landing from '@/pages/landing';
import Dashboard from '@/pages/dashboard';
import EscrowsList from '@/pages/escrows/index';
import NewEscrow from '@/pages/escrows/new';
import EscrowDetail from '@/pages/escrows/[id]';
import WalletsList from '@/pages/wallets';
import { Route, Switch, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/escrows" component={EscrowsList} />
      <Route path="/escrows/new" component={NewEscrow} />
      <Route path="/escrows/:id" component={EscrowDetail} />
      <Route path="/wallets" component={WalletsList} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
