import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, CheckCircle, Monitor, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";


const Dashboard = () => {
  const { macAddresses } = useAuth();
  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();
  // console.log(user);

  
  // Get user's name from metadata or email if not available
  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || "User";
  
  return (
    <>
    {/* <header className="fixed top-0 z-10 w-full rounded-b-md backdrop-blur-lg bg-background/50 shadow-md mt-4">
        <nav className="container mx-auto max-w-4xl px-8 py-4 md:py-6 border border-white/50 rounded-full backdrop-blur-lg bg-background/50 shadow-md hidden md:flex items-center justify-between">
          <a href="#" className="text-lg font-bold" >
            Acme QR Codes
          </a>
          <div className="flex items-center gap-4">
            <a href="#" className="text-muted-foreground hover:text-foreground" >
              Features
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground" >
              Pricing
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground" >
              Contact
            </a>
            <Button
              variant="outline"
              className="rounded-full bg-gradient-to-r from-orange-400 to-yellow-400 font-bold uppercase"
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
                <a href="#" className="text-lg font-bold" >
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
                <a href="#" className="block text-muted-foreground hover:text-foreground" >
                  Features
                </a>
                <a href="#" className="block text-muted-foreground hover:text-foreground" >
                  Pricing
                </a>
                <a href="#" className="block text-muted-foreground hover:text-foreground" >
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
      </header> */}
      <main className="grid-background min-h-screen w-full p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Welcome back, {userName}!
            </span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Here's an overview of your account
          </p>
        </div>

        {/* Dashboard Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Balance Card */}
          <DashboardCard 
            title="Available Balance"
            value={user.balance}
            icon={<Wallet className="h-6 w-6" />}
            description="Current account balance"
            glowColor="from-green-500/10 via-green-500/5 to-transparent"
            iconColor="text-green-400"
          />
          
          {/* Wallet ID Card */}
          <DashboardCard 
            title="Wallet ID"
            value={user.accountNumber}
            icon={<CheckCircle className="h-6 w-6" />}
            description="Your unique wallet identifier"
            glowColor="from-blue-500/10 via-blue-500/5 to-transparent"
            iconColor="text-blue-400"
          />
          
          {/* Hardware ID Card */}
          <DashboardCard 
            title="Hardware ID"
            value={macAddresses}
            icon={<Monitor className="h-6 w-6" />}
            description="Device identifier"
            glowColor="from-purple-500/10 via-purple-500/5 to-transparent"
            iconColor="text-purple-400"
          />
          
          {/* User Stats Card */}
          <DashboardCard 
            title="Account Holder"
            value={user.name}
            icon={<User className="h-6 w-6" />}
            description="Your account name"
            glowColor="from-pink-500/10 via-pink-500/5 to-transparent"
            iconColor="text-pink-400"
          />
        </div>
        
        {/* Bottom Action Buttons */}
        <div className="mt-8 flex flex-wrap gap-4">
          <Button 
            className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            onClick={() => navigate("/create-transaction")}
          >
            <Wallet className="mr-2 h-4 w-4" /> Create Transaction
          </Button>
          <Button 
            variant="outline" 
            className="border-blue-500/30"
            onClick={() => navigate("/all-transactions")}
          >
            <CheckCircle className="mr-2 h-4 w-4" /> View All Transactions
          </Button>
        </div>
      </div>
    </main>
    </>
    
  );
};

// Reusable Dashboard Card Component
interface DashboardCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  description: string;
  glowColor: string;
  iconColor: string;
}

const DashboardCard = ({ 
  title, 
  value, 
  icon, 
  description,
  glowColor,
  iconColor
}: DashboardCardProps) => {

  const {toast} = useToast();

  function fallbackCopyTextToClipboard(text) {
    let textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
  
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
  
    try {
      let successful = document.execCommand('copy');
      let msg = successful ? 'successful' : 'unsuccessful';
      console.log('Fallback: Copying text command was ' + msg);
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
    }
  
    document.body.removeChild(textArea);
  }
  function copyTextToClipboard(text) {
    if (!navigator.clipboard) {
      fallbackCopyTextToClipboard(text);
      return;
    }
    navigator.clipboard.writeText(text).then(function() {
      toast({title: "Copied to clipboard", duration: 1000});
    }, function(err) {
      toast({ title: 'Async: Could not copy text: ', description: err.message, duration: 1500 });
    });
  }

  return (
    <Card className="relative overflow-hidden border-border/40 backdrop-blur-sm">
      <div className={`absolute top-0 left-0 h-full w-full bg-gradient-to-br ${glowColor} pointer-events-none`} />
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold mt-1 truncate text-ellipsis" onClick={(e) => {
              // console.log(e.target);
              copyTextToClipboard(value)
            }}>{value.length > 25 ? value.slice(0, 25)+"..." : value}</h3>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div className={`p-2 rounded-full bg-background/40 backdrop-blur-sm ${iconColor}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Dashboard;
