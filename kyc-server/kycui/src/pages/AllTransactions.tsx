import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import axios from "axios";

const AllTransactions = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [transactions, setTransactions] = useState({sentTransactions: [], receivedTransactions: []});
  const [loading, setLoading] = useState(true);
  const bankAccount = user?.accountNumber || "default_account"; // Adjust accordingly

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await axios.get("http://localhost:3001/api/transactions/user", {
          params: { bankAccount },
          headers: { Authorization: `Bearer ${token}` },
        });
        // console.log(response);
        setTransactions(response.data);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchTransactions();
  }, [token, bankAccount]);

  return (
    <main className="grid-background min-h-screen w-full p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Transaction History
              </span>
            </h1>
            <p className="text-muted-foreground mt-2">View all your past transactions</p>
          </div>
          <Button variant="outline" className="border-blue-500/30" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="rounded-md border">
              {loading ? (
                <p className="text-center p-4">Loading transactions...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-b bg-secondary/30">
                      <TableHead>Transaction</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {transactions.sentTransactions.length > 0 || transactions.receivedTransactions.length > 0 ? (
  <>
    {transactions.sentTransactions.map((transaction) => (
      <TableRow key={transaction._id} className="border-b transition-colors hover:bg-secondary/20">
        <TableCell>Sent</TableCell>
        <TableCell className="text-red-400">
          -₹{transaction.transactions.amount}
        </TableCell>
        <TableCell>{new Date(transaction.transactions.timestamp).toLocaleString()}</TableCell>
        <TableCell>
          <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">
            Completed
          </span>
        </TableCell>
      </TableRow>
    ))}
    
    {transactions.receivedTransactions.map((transaction) => (
      <TableRow key={transaction._id} className="border-b transition-colors hover:bg-secondary/20">
        <TableCell>Received</TableCell>
        <TableCell className="text-green-400">
          +₹{transaction.transactions.amount}
        </TableCell>
        <TableCell>{new Date(transaction.transactions.timestamp).toLocaleString()}</TableCell>
        <TableCell>
          <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">
            Completed
          </span>
        </TableCell>
      </TableRow>
    ))}
  </>
) : (
  <TableRow>
    <TableCell colSpan={4} className="text-center p-4">
      No transactions found.
    </TableCell>
  </TableRow>
)}

                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default AllTransactions;
