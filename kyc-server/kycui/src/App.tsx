
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import CreateTransactions from "./pages/CreateTransaction";
import ForgetPassword from "./pages/ForgotPassword";
import { RegistrationFlow } from "./components/RegistrationFlow";
import Registration from "./pages/Registration";
import KYCVerification from "./pages/Validate";
import BlockchainViewer from "./pages/ledger";
import Dashboard from "./pages/dashboard";
import AllTransactions from "./pages/AllTransactions";
import AdminPanel from "./pages/Admin";
import { Button } from "./components/ui/button";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AnimatePresence mode="wait">
          <header className="fixed grid-background-header top-0 z-10 w-full rounded-b-md mt-4">
        <nav className="container mx-auto max-w-4xl px-8 py-4 md:py-6 border border-border/50 rounded-full backdrop-blur-lg bg-background/50 shadow-md hidden md:flex items-center justify-between">
          <a href="#">
          <h2 className="text-xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Transectify
            </span>
          </h2>
          </a>
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="text-muted-foreground hover:text-foreground">
              Dashboard
            </a>
            <a href="/admin" className="text-muted-foreground hover:text-foreground">
              Admin
            </a>
            <a href="/all-transactions" className="text-muted-foreground hover:text-foreground">
              Transactions
            </a>
            <Button
              variant="default"
              className="rounded-full font-bold uppercase"
            >
              Sign In
            </Button>
          </div>
        </nav>
        ,{" "}
        <div className="fixed top-0 left-0 w-full h-full bg-background/50 backdrop-blur-lg z-20 flex flex-col items-center justify-center md:hidden">
          <div className="fixed top-0 left-0 w-full h-full bg-background/50 backdrop-blur-lg z-20 flex flex-col items-center justify-center md:hidden">
            <div className="bg-background p-8 rounded-md shadow-md w-full max-w-md space-y-4">
              <div className="flex items-center justify-between">
                <a href="#" className="text-lg font-bold">
                  Acme QR Codes
                </a>
                <Button
                  variant="outline"
                  className="rounded-full bg-gradient-to-r from-orange-400 to-yellow-400 font-bold uppercase"
                >
                  Open Menu
                </Button>
              </div>
              <div className="space-y-2">
                <a href="#" className="block text-muted-foreground hover:text-foreground">
                  Features
                </a>
                <a href="#" className="block text-muted-foreground hover:text-foreground">
                  Pricing
                </a>
                <a href="#" className="block text-muted-foreground hover:text-foreground">
                  Contact
                </a>
              </div>
              <Button
                variant="outline"
                className="rounded-full bg-gradient-to-r from-orange-400 to-yellow-400 font-bold uppercase w-full"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main className="">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/ledger" element={<BlockchainViewer />} />
              <Route path="/forgot-password" element={<ForgetPassword />} />
              <Route path="/validate" element={<KYCVerification />} />
              <Route path="/kyc" element={<Registration />} /> 
              <Route path="/registration" element={<Registration />} />
              <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/all-transactions" element={<AllTransactions />} />
            <Route path="/create-transaction" element={<CreateTransactions />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
      </main>
          </AnimatePresence>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
