import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export enum fraudTypes{
  NOFRAUD="VALID TRANSACTION",
  CFRAUD="C/D CARD FRAUD PROBABLE",
  RP="RISKY PROFILE",
  SMURFING="PROBABLE SMURFING",
  ML="PROBABLE MONEY LAUNDERING"
}

const CreateTransaction = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, macAddresses } = useAuth();

  const [amount, setAmount] = useState("");
  const [transactionType, setTransactionType] = useState("send");
  const [merchant, setMerchant] = useState("");
  const [recieverAccount, setRecieverAccount] = useState("");
  const [recieverLocation, setRecieverLocation] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [userLocation, setUserLocation] = useState({ lat: null, lng: null, countryCode: "" });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation((prev) => ({ ...prev, lat: latitude, lng: longitude }));
          try {
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
            const data = await response.json();
            setUserLocation((prev) => ({ ...prev, countryCode: data.countryCode }));
          } catch (error) {
            console.error("Error fetching country code:", error);
          }
        },
        (error) => console.error("Geolocation error:", error)
      );
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const transactionData = {
      amount: parseFloat(amount),
      transactionType,
      senderAccount: user.accountNumber,
      recieverAccount: parseInt(recieverAccount),
      payment_currency: currency,
      userLocation,
      city_pop: Math.floor(Math.random() * (1000000 - 10000) + 10000),
      riskScore: Math.floor(Math.random() * 4),
      timestamp: new Date().toISOString(),
      macAddresses,
      gender: user.gender === "male" ? "M" : "F",
      merchant,
      recieverLocation,
      fraudType: fraudTypes.NOFRAUD
    };

    try {
      const res = await fetch("http://localhost:5000/analyze_transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "trans_date_trans_time": transactionData.timestamp,
          "cardNum": Math.floor(Math.random() * 10000000000000000),
          "merchant": transactionData.merchant,
          "category": "electronics",
          "amount": transactionData.amount,
          "first": user.firstName,
          "last": "Doe",
          "gender": user.gender == "male"?"M":"F",
          "street": "123 Main St",
          "city": "New York",
          "state": "NY",
          "zip": "10001",
          "lat": userLocation.lat,
          "long": userLocation.lng,
          "city_pop": 8419000,
          "job": "Engineer",
          "dob": "1985-01-15",
          "transactionId": "txn_5f3e2a",
          "unix_time": 1672542922,
          "merch_lat": 34.0522,
          "merch_long": -122.4194
      })
    });
      const resData = await res.json();
      if (resData && Object.keys(resData).length > 0) {
        const resFraud = await fetch("http://localhost:5000/assess_risk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            "p_cc": resData['fraud_detection']['adjusted_confidence'], "p_sm": resData['smurfing_detection']['analysis']['enhanced_suspicion_score'], "p_rp": resData['risk_profiling']['risk_score']
          }),

      });
    }
    } catch(error) {
      console.log(error.message);
    }
    
    try {
      const response = await fetch("http://localhost:3001/api/auth/user/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({transaction: transactionData})
      });
      
      if (!response.ok) throw new Error("Transaction failed");
      
      toast({
        title: "Transaction created",
        description: `${transactionType === 'send' ? 'Sent' : 'Requested'} ${currency} ${amount} ${transactionType === 'send' ? 'to' : 'from'} ${recieverAccount}`,
      });
      
      setTimeout(() => navigate("/all-transactions"), 1000);
    } catch (error) {
      console.error("Error processing transaction:", error);
      toast({ title: "Error", description: "Transaction failed" });
    }
  };
  
  return (
    <main className="grid-background min-h-screen w-full p-4 md:p-8">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Create Transaction
              </span>
            </h1>
            <p className="text-muted-foreground mt-2">Send or request money</p>
          </div>
          <Button 
            variant="outline" 
            className="border-blue-500/30"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
        </div>
        
        <Card className="border-border/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>New Transaction</CardTitle>
            <CardDescription>Fill in the details to create a new transaction</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
            <Label htmlFor="type">Transaction Type</Label>
            <div className="space-y-2">
                <Select 
                  value={transactionType} 
                  onValueChange={setTransactionType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select transaction type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="send">Send Money</SelectItem>
                    <SelectItem value="request">Request Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient Account Number</Label>
                <Input
                  id="recipient"
                  placeholder="Enter account number"
                  value={recieverAccount}
                  onChange={(e) => setRecieverAccount(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="1"
                  step="any"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="senderAccount">Merchant Name</Label>
                <Input
                  id="senderAccount"
                  placeholder="FedEx express llc."
                  value={merchant}
                  type="text"
                  onChange={(e) => setMerchant(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senderAccount">Receiver Location</Label>
                <Input
                  id="senderAccount"
                  placeholder="NY"
                  value={recieverLocation}
                  type="text"
                  onChange={(e) => setRecieverLocation(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button type="submit" className="w-full bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
                <Send className="mr-2 h-4 w-4" />
                {transactionType === 'send' ? 'Send Money' : 'Request Money'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default CreateTransaction;
