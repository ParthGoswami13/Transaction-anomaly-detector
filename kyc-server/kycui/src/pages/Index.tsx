
import AuthForm from "@/components/AuthForm";
import SponsorBanner from "@/components/SponsorBanner";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { isAborted } from "zod";

const Index = () => {
   const { isAuthenticated, user, logout } = useAuth();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background grid-background p-4 sm:p-6">
      <div className="relative w-full max-w-5xl flex flex-col items-center justify-center gap-8">
        {/* Top gradient accents */}
        <div className="absolute top-[-150px] left-[-100px] w-64 h-64 bg-primary/10 rounded-full filter blur-3xl opacity-30" />
        <div className="absolute top-[-100px] right-[-100px] w-64 h-64 bg-accent/10 rounded-full filter blur-3xl opacity-30" />
        
        {/* Main content */}
        <div className="w-full max-w-md">
          <div className="text-center space-y-2 mb-6">
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                Transactify
              </span>
            </h1>
            <p className="text-muted-foreground">
              Create Transactions Safely
            </p>
          </div>
          
          {isAuthenticated ? (
            <div className="space-y-4 text-center">
              <div className="p-6 rounded-lg border border-border/30 bg-card/70 backdrop-blur-sm">
                <h2 className="text-xl font-semibold mb-2">Welcome, {user?.user_metadata?.name || user?.email}!</h2>
                <p className="text-muted-foreground mb-4">
                  You are successfully logged in to the hackathon portal.
                </p>
                <Button onClick={logout} variant="outline">Logout</Button>
              </div>
              <p className="text-sm text-muted-foreground">
                More features will be added to your dashboard soon!
              </p>
            </div>
          ) : (
            <AuthForm />
          )}
        </div>
        
        {/* Sponsors section */}
        <div className="mt-8">
          <SponsorBanner />
        </div>
      </div>
    </div>
  );
};

export default Index;
