"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  AlertTriangle,
  Badge,
  ShieldX,
  ShieldAlert,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import axios from "axios";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { getSession, setSession } from "@/lib/session";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Badge as BadgeComponent } from "@/components/ui/badge";

const clearFilters = {
  transactionId: "",
  date: "",
  senderAccount: "",
  receiverAccount: "",
  amountMin: "",
  amountMax: "",
  paymentType: "",
  isLaundering: "",
};

const riskIcons = {
  Low: <ShieldX className="w-4 h-4 text-primary" />,
  Medium: <ShieldAlert className="w-4 h-4 text-accent" />,
  High: <AlertTriangle className="w-4 h-4 text-destructive" />,
};

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [activeSubTab, setActiveSubTab] = useState("transactions");
  const [transactions, setTransactions] = useState([]);
  const [launderingCategories, setLaunderingCategories] = useState({});
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const navigate = useNavigate();
  const [filters, setFilters] = useState(clearFilters);
  const [flaggedUsers, setFlaggedUsers] = useState([]);
  const [sortedUsers, setSortedUsers] = useState(flaggedUsers);
  const [sortOrder, setSortOrder] = useState("asc");

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const token = queryParams.get("access_token");
    const userId = queryParams.get("userId");
    const encodedDeviceIds = queryParams.get("deviceIds");

    if (!token || !userId) return;

    const checkFingerprint = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        const fingerprint = result.visitorId;

        let deviceIdArray = [];
        if (encodedDeviceIds) {
          try {
            deviceIdArray = JSON.parse(decodeURIComponent(encodedDeviceIds));
          } catch (error) {
            console.error("Error parsing deviceIds:", error);
          }
        }

        console.log("Generated Fingerprint:", fingerprint);
        console.log("Allowed Device IDs:", deviceIdArray);

        if (deviceIdArray.includes(fingerprint)) {
          setSession("access_token", token);
          setSession("userId", userId);

          setTimeout(() => {
            const accessToken = getSession("access_token");
            if (!accessToken) {
              navigate("/login");
            } else {
              setTimeout(() => {
                navigate("/dashboard");
              }, 1000);
            }
          }, 100);
        } else {
          toast({
            title: "Unauthorized",
            description:
              "Device not registered. Kindly log in to add this device.",
          });
          navigate("/login");
        }
      } catch (error) {
        console.error("Fingerprint generation error:", error);
      }
    };

    checkFingerprint();
  }, [navigate]);

  const sortByRisk = () => {
    const sorted = [...sortedUsers].sort((a, b) => {
      const riskLevels = { Low: 1, Medium: 2, High: 3 };
      return sortOrder === "asc"
        ? riskLevels[a.riskLevel] - riskLevels[b.riskLevel]
        : riskLevels[b.riskLevel] - riskLevels[a.riskLevel];
    });

    setSortedUsers(sorted);
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  const applyFilters = async () => {
    const params = new URLSearchParams(filters as any).toString();
    const res = await fetch(
      `http://localhost:3001/api/transactions/search?${params}`
    );
    const data = await res.json();
    setTransactions(data);
  };

  useEffect(() => {
    fetch("http://localhost:3001/api/transactions/flagged-users")
      .then((res) => res.json())
      .then((data) => setFlaggedUsers(data));
  }, []);

  const riskColors = {
    High: "bg-destructive text-destructive-foreground",
    Medium: "bg-accent text-accent-foreground",
    Low: "bg-primary text-primary-foreground",
  };

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(
        `http://localhost:3001/api/transactions`,
        {
          params: { page, limit },
        }
      );
      setTransactions(response.data.transactions);
      setTotal(response.data.total);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  const fetchLaunderingCategories = async () => {
    try {
      const response = await axios.get(
        `http://localhost:3001/api/transactions/laundering/categories`
      );
      setLaunderingCategories(response.data);
    } catch (error) {
      console.error("Error fetching laundering categories:", error);
    }
  };

  useEffect(() => {
    if (activeTab === "dashboard") {
      fetchTransactions();
      fetchLaunderingCategories();
      console.log(transactions);
    }
  }, [activeTab, page]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("userId");

    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    navigate("/login");
  };

  const amountData = transactions.map((t) => ({
    date: `${t.transactions.timestamp}`,
    amount: t.transactions.amount,
  }));

  const pieData = Object.entries(launderingCategories).map(([type, txns]) => ({
    name: type || "Non-Laundering",
    value: (txns as any[]).length,
  }));

  const barData = transactions.map((t) => ({
    id: t.hash,
    amount: t.transactions.amount,
    isFraud: t.transactions.riskScore > 0.5,
  }));

  return (
    <div className="grid-background h-full w-full">


      <div className="max-w-7xl mx-auto py-6 px-4">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <div className="flex justify-between items-center mb-6">
            <TabsList className="bg-muted">
              <TabsTrigger 
                value="dashboard" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Dashboard
              </TabsTrigger>
              <TabsTrigger 
                value="settings" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Settings
              </TabsTrigger>
            </TabsList>
            
            {activeTab === "dashboard" && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveSubTab("transactions")}
                  className={activeSubTab === "transactions" ? "bg-secondary text-secondary-foreground" : ""}
                >
                  Transactions
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveSubTab("users")}
                  className={activeSubTab === "users" ? "bg-secondary text-secondary-foreground" : ""}
                >
                  Flagged Users
                </Button>
              </div>
            )}
          </div>

          <TabsContent value="dashboard" className="space-y-6">
            {activeSubTab === "transactions" ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <Card className="card-shadow-blue bg-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-card-foreground">Total Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-primary">{total}</div>
                      <p className="text-sm text-muted-foreground mt-1">Last 30 days</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="card-shadow-purple bg-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-card-foreground">Flagged Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-accent">
                        {transactions.filter(t => (t.transactions.riskScore > 0.5)).length}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">Requiring attention</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="card-shadow-green bg-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-card-foreground">Risk Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-destructive">Medium</div>
                      <p className="text-sm text-muted-foreground mt-1">System-wide assessment</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <Card className="col-span-1 md:col-span-2 bg-card">
                    <CardHeader>
                      <CardTitle>Transaction Volume</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={amountData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                          <YAxis stroke="hsl(var(--muted-foreground))" />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              borderColor: "hsl(var(--border))"
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="amount" 
                            stroke="hsl(var(--primary))" 
                            activeDot={{ r: 8 }}
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="bg-card">
                    <CardHeader>
                      <CardTitle>Laundering Types</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="hsl(var(--primary))"
                            dataKey="value"
                            label
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              borderColor: "hsl(var(--border))"
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="bg-card">
                    <CardHeader>
                      <CardTitle>Transaction Amounts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={barData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="id" stroke="hsl(var(--muted-foreground))" />
                          <YAxis stroke="hsl(var(--muted-foreground))" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              borderColor: "hsl(var(--border))"
                            }}
                          />
                          <Bar
                            dataKey="amount"
                            fill="hsl(var(--primary))"
                            shape={(props) => {
                              const { x, y, width, height, payload } = props;
                              return (
                                <rect
                                  x={x}
                                  y={y}
                                  width={width}
                                  height={height}
                                  fill={payload.isFraud ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                                  className="pointer-events-none"
                                />
                              );
                            }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
                
                <Card className="bg-card mb-6">
                  <CardHeader>
                    <CardTitle>Filter Transactions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Input
                        placeholder="Transaction ID"
                        value={filters.transactionId}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            transactionId: e.target.value,
                          })
                        }
                      />

                      <Input
                        type="date"
                        value={filters.date}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            date: e.target.value,
                          })
                        }
                      />

                      <Input
                        placeholder="Sender Account"
                        type="number"
                        value={filters.senderAccount}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            senderAccount: e.target.value,
                          })
                        }
                      />

                      <Input
                        placeholder="Receiver Account"
                        type="number"
                        value={filters.receiverAccount}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            receiverAccount: e.target.value,
                          })
                        }
                      />

                      <Input
                        placeholder="Min Amount"
                        type="number"
                        value={filters.amountMin}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            amountMin: e.target.value,
                          })
                        }
                      />

                      <Input
                        placeholder="Max Amount"
                        type="number"
                        value={filters.amountMax}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            amountMax: e.target.value,
                          })
                        }
                      />

                      <Input
                        placeholder="Payment Type"
                        value={filters.paymentType}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            paymentType: e.target.value,
                          })
                        }
                      />

                      <Select
                        value={filters.isLaundering}
                        onValueChange={(value) =>
                          setFilters({
                            ...filters,
                            isLaundering: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Transaction Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value=" ">All</SelectItem>
                          <SelectItem value="1">Laundering</SelectItem>
                          <SelectItem value="0">Non-Laundering</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end gap-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        fetchTransactions();
                        setFilters(clearFilters);
                      }}
                    >
                      Reset
                    </Button>
                    <Button
                      onClick={applyFilters}
                      className="bg-primary text-primary-foreground"
                    >
                      Apply Filters
                    </Button>
                  </CardFooter>
                </Card>

                <Card className="bg-card">
                  <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Transaction ID</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transactions.map((txn) => (
                            <TableRow
                              key={txn.hash}
                              className={txn.transactions.riskScore > 0.4 ? "bg-destructive/10" : ""}
                            >
                              <TableCell className="font-medium">{txn.hash}</TableCell>
                              <TableCell>{txn.transactions.Date}</TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  {txn.transactions.amount > 0 ? (
                                    <ArrowUp className="mr-1 h-4 w-4 text-primary" />
                                  ) : (
                                    <ArrowDown className="mr-1 h-4 w-4 text-destructive" />
                                  )}
                                  {Math.abs(txn.transactions.amount)} {txn.transactions.payment_currency}
                                </div>
                              </TableCell>
                              <TableCell>
                                {txn.transactions.riskScore > 0.4 ? (
                                  <BadgeComponent variant="destructive">Suspicious</BadgeComponent>
                                ) : (
                                  <BadgeComponent variant="outline">Normal</BadgeComponent>
                                )}
                              </TableCell>
                              <TableCell>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      Details
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>
                                        Transaction Details - {txn.hash}
                                      </DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 pt-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Sender</h4>
                                          <p className="text-foreground">{txn.transactions.senderAccount}</p>
                                        </div>
                                        <div>
                                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Receiver</h4>
                                          <p className="text-foreground">{txn.transactions.recieverAccount}</p>
                                        </div>
                                        <div>
                                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Amount</h4>
                                          <p className="text-foreground">{txn.transactions.amount} {txn.transactions.payment_currency}</p>
                                        </div>
                                        <div>
                                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Date & Time</h4>
                                          <p className="text-foreground">{txn.transactions.timestamp}</p>
                                        </div>
                                      </div>
                                      
                                      {txn.transactions.riskScore > 0.4 && (
                                        <div className="bg-destructive/10 p-4 rounded-lg border border-destructive">
                                          <h4 className="font-medium text-destructive flex items-center gap-2 mb-2">
                                            <AlertTriangle className="w-4 h-4" />
                                            Suspicious Activity Detected
                                          </h4>
                                          <p className="text-sm">
                                            <strong>Fraudualent Activity:</strong> {txn.transactions.fraudType}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    <div className="flex justify-between items-center mt-4">
                      <Button
                        variant="outline"
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {page} of {Math.ceil(total / limit)}
                      </span>
                      <Button
                        variant="outline"
                        onClick={() => setPage(page + 1)}
                        disabled={page >= Math.ceil(total / limit)}
                      >
                        Next
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle>Flagged Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-end mb-4">
                    <Button 
                      variant="outline" 
                      onClick={sortByRisk}
                      className="text-sm"
                    >
                      Sort by Risk {sortOrder === "asc" ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />}
                    </Button>
                  </div>
                  
                  {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {flaggedUsers.map(({ user, transactions, riskLevel }) => (
                      <Card key={user} className="bg-card border-border overflow-hidden">
                        <CardHeader className={`${riskColors[riskLevel]} py-3`}>
                          <CardTitle className="flex items-center text-base">
                            {riskIcons[riskLevel]}
                            <span className="ml-2">{user}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          <h4 className="text-sm font-medium mb-2">Suspicious Transactions</h4>
                          <div className="space-y-3 max-h-[240px] overflow-y-auto pr-2">
                            {transactions.map((txn) => (
                              <div
                                key={txn.hash}
                                className="p-3 bg-background rounded-lg text-foreground text-sm"
                              >
                                <div className="flex justify-between mb-1">
                                  <span className="font-medium">#{txn.hash}</span>
                                  <BadgeComponent variant="outline" className="text-xs">
                                    {txn.transactions[0].Payment_type}
                                  </BadgeComponent>
                                </div>
                                <div className="flex justify-between mb-1">
                                  <span className="text-muted-foreground">Amount:</span>
                                  <span className="font-medium">{txn.transactions[0].Amount} {txn.transactions[0].Payment_currency}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {txn.transactions[0].Sender_bank_location} → {txn.transactions[0].Receiver_bank_location}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                        <CardFooter className="px-4 py-3 bg-muted border-t border-border flex justify-end">
                          <Button variant="outline" size="sm">Investigate</Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div> */}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>User Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Settings content goes here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <footer className="bg-card border-t border-border py-4 px-4 mt-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center gap-6 text-muted-foreground text-xs">
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              AI-Powered Fraud Detection
            </span>
            <span className="flex items-center gap-1">
              <Badge className="w-4 h-4" />
              Blockchain Security
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AdminPanel;