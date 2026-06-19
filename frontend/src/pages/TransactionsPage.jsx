import { useState, useEffect } from 'react';
import { transactionsAPI } from '../api/client';
import TransactionTable from '../components/TransactionTable';
import { Search, Filter, Plus, X } from 'lucide-react';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ cardNum: '', merchant: '', minAmount: '', maxAmount: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [newTxn, setNewTxn] = useState({
    cardNum: '', merchant: '', amount: '', transDateTime: '',
    lat: '0', long: '0', merchLat: '0', merchLong: '0',
    category: 'shopping_net', gender: 'M',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, [pagination.page]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: 20 };
      if (filters.cardNum) params.cardNum = filters.cardNum;
      if (filters.merchant) params.merchant = filters.merchant;
      if (filters.minAmount) params.minAmount = filters.minAmount;
      if (filters.maxAmount) params.maxAmount = filters.maxAmount;

      const { data } = await transactionsAPI.list(params);
      setTransactions(data.transactions);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination((p) => ({ ...p, page: 1 }));
    loadTransactions();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await transactionsAPI.create({
        ...newTxn,
        transDateTime: newTxn.transDateTime || new Date().toISOString(),
      });
      setShowCreate(false);
      setNewTxn({
        cardNum: '', merchant: '', amount: '', transDateTime: '',
        lat: '0', long: '0', merchLat: '0', merchLong: '0',
        category: 'shopping_net', gender: 'M',
      });
      loadTransactions();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create transaction');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="main-content">
      <div className="flex items-center justify-between mb-6">
        <div className="page-header mb-0">
          <h1>Transactions</h1>
          <p>Browse, search, and create transactions</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New Transaction
        </button>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="glass-card p-4 mb-6 fade-in-up">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-[var(--text-muted)] mb-1">Card Number</label>
            <input
              className="input-field"
              placeholder="Search by card..."
              value={filters.cardNum}
              onChange={(e) => setFilters({ ...filters, cardNum: e.target.value })}
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-[var(--text-muted)] mb-1">Merchant</label>
            <input
              className="input-field"
              placeholder="Search by merchant..."
              value={filters.merchant}
              onChange={(e) => setFilters({ ...filters, merchant: e.target.value })}
            />
          </div>
          <div className="w-[120px]">
            <label className="block text-xs text-[var(--text-muted)] mb-1">Min Amount</label>
            <input
              className="input-field"
              type="number"
              placeholder="$0"
              value={filters.minAmount}
              onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
            />
          </div>
          <div className="w-[120px]">
            <label className="block text-xs text-[var(--text-muted)] mb-1">Max Amount</label>
            <input
              className="input-field"
              type="number"
              placeholder="$∞"
              value={filters.maxAmount}
              onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-primary">
            <Search size={14} /> Search
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="glass-card overflow-hidden fade-in-up" style={{ animationDelay: '100ms' }}>
        {loading ? (
          <div className="p-8 text-center text-[var(--text-muted)]">Loading transactions...</div>
        ) : (
          <TransactionTable transactions={transactions} showLabel />
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-[var(--border-color)]">
            <p className="text-xs text-[var(--text-muted)]">
              Showing page {pagination.page} of {pagination.pages} ({pagination.total} total)
            </p>
            <div className="flex gap-2">
              <button
                className="btn-ghost"
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              >
                Previous
              </button>
              <button
                className="btn-ghost"
                disabled={pagination.page >= pagination.pages}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-lg p-6 fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">New Transaction</h2>
              <button onClick={() => setShowCreate(false)} className="text-[var(--text-muted)] hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Card Number *</label>
                  <input className="input-field" required value={newTxn.cardNum}
                    onChange={(e) => setNewTxn({ ...newTxn, cardNum: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Merchant *</label>
                  <input className="input-field" required value={newTxn.merchant}
                    onChange={(e) => setNewTxn({ ...newTxn, merchant: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Amount ($) *</label>
                  <input className="input-field" type="number" step="0.01" required value={newTxn.amount}
                    onChange={(e) => setNewTxn({ ...newTxn, amount: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Date/Time</label>
                  <input className="input-field" type="datetime-local" value={newTxn.transDateTime}
                    onChange={(e) => setNewTxn({ ...newTxn, transDateTime: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Cardholder Latitude</label>
                  <input className="input-field" type="number" step="any" value={newTxn.lat}
                    onChange={(e) => setNewTxn({ ...newTxn, lat: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Cardholder Longitude</label>
                  <input className="input-field" type="number" step="any" value={newTxn.long}
                    onChange={(e) => setNewTxn({ ...newTxn, long: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Merchant Latitude</label>
                  <input className="input-field" type="number" step="any" value={newTxn.merchLat}
                    onChange={(e) => setNewTxn({ ...newTxn, merchLat: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Merchant Longitude</label>
                  <input className="input-field" type="number" step="any" value={newTxn.merchLong}
                    onChange={(e) => setNewTxn({ ...newTxn, merchLong: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Category</label>
                  <select className="input-field" value={newTxn.category}
                    onChange={(e) => setNewTxn({ ...newTxn, category: e.target.value })}>
                    <option value="shopping_net">Shopping (Online)</option>
                    <option value="shopping_pos">Shopping (POS)</option>
                    <option value="grocery_pos">Grocery</option>
                    <option value="gas_transport">Gas/Transport</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="food_dining">Food/Dining</option>
                    <option value="misc_net">Misc (Online)</option>
                    <option value="misc_pos">Misc (POS)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Gender</label>
                  <select className="input-field" value={newTxn.gender}
                    onChange={(e) => setNewTxn({ ...newTxn, gender: e.target.value })}>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? 'Analyzing...' : 'Create & Analyze'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
