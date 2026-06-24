import { useState, useEffect } from 'react';
import { transactionsAPI } from '../api/client';
import TransactionTable from '../components/TransactionTable';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X } from 'lucide-react';
import DetailPanel from '../components/DetailPanel';

const containerVariants = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const modalVariants = {
  initial: { opacity: 0, y: '100%' },
  animate: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 350, damping: 30 } },
  exit: { opacity: 0, y: '100%', transition: { duration: 0.25 } },
};

const fieldVariants = {
  initial: { opacity: 0, y: 10 },
  animate: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.05 + i * 0.04, duration: 0.3 },
  }),
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ cardNum: '', merchant: '', minAmount: '', maxAmount: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [newTxn, setNewTxn] = useState({
    cardNum: '', merchant: '', amount: '', transDateTime: '',
    lat: '0', long: '0', merchLat: '0', merchLong: '0',
    lat: '0', long: '0', merchLat: '0', merchLong: '0',
    category: 'shopping_net', gender: 'M',
  });
  const [creating, setCreating] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState(null);

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
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 800, margin: 0, padding: 0, color: 'var(--text-primary)', lineHeight: 1.2 }}>Provider Data</h1>
            <p style={{ marginTop: '0.25rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Browse, search, and add providers</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <motion.button
              className="btn-ghost"
              onClick={() => setShowFilters((value) => !value)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </motion.button>
            <motion.button
              className="btn-ghost border-blue-500 text-blue-500 bg-white hover:bg-blue-50 px-4 py-2 flex items-center gap-2 rounded-full"
              onClick={() => setShowCreate(true)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              <Plus size={16} /> Add a Provider
            </motion.button>
          </div>
        </div>

        {/* Filters */}
        <AnimatePresence initial={false}>
          {showFilters && (
            <motion.form
              onSubmit={handleSearch}
              className="glass-card p-4 mb-6"
              variants={itemVariants}
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
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
              <label className="block text-xs text-[var(--text-muted)] mb-1">Filter by Network</label>
              <select className="input-field" onChange={() => {}}>
                <option value="">All Networks</option>
                <option value="NPI">NPI Network</option>
              </select>
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
            <motion.button
              type="submit"
              className="btn-primary"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              <Search size={14} /> Search
            </motion.button>
          </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Table */}
        <motion.div
          className="glass-card overflow-hidden"
          variants={itemVariants}
        >
          {loading ? (
            <div className="p-8 text-center text-[var(--text-muted)]">
              <span className="inline-block w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mr-2" />
              Loading transactions...
            </div>
          ) : (
            <TransactionTable 
              transactions={transactions} 
              showLabel 
              onRowClick={(txn) => setSelectedTxn(txn)} 
            />
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-[var(--border-color)]">
              <p className="text-xs text-[var(--text-muted)]">
                Showing page {pagination.page} of {pagination.pages} ({pagination.total} total)
              </p>
              <div className="flex gap-2">
                <motion.button
                  className="btn-ghost pagination-button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Previous
                </motion.button>
                <motion.button
                  className="btn-ghost pagination-button"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Next
                </motion.button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            style={{ paddingLeft: 'calc(260px + 1rem)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              className="glass-card w-full max-w-lg p-6"
              variants={modalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold gradient-text">Add a Provider</h2>
                <motion.button
                  onClick={() => setShowCreate(false)}
                  className="text-[var(--text-muted)] hover:text-white transition-colors"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X size={20} />
                </motion.button>
              </div>
              <form onSubmit={handleCreate} className="space-y-3">
                <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
                  {[
                    { label: 'Card Number *', key: 'cardNum', type: 'text', required: true, idx: 0 },
                    { label: 'Merchant *', key: 'merchant', type: 'text', required: true, idx: 1 },
                    { label: 'Amount ($) *', key: 'amount', type: 'number', required: true, step: '0.01', idx: 2 },
                    { label: 'Date/Time', key: 'transDateTime', type: 'datetime-local', idx: 3 },
                    { label: 'Cardholder Latitude', key: 'lat', type: 'number', step: 'any', idx: 4 },
                    { label: 'Cardholder Longitude', key: 'long', type: 'number', step: 'any', idx: 5 },
                    { label: 'Merchant Latitude', key: 'merchLat', type: 'number', step: 'any', idx: 6 },
                    { label: 'Merchant Longitude', key: 'merchLong', type: 'number', step: 'any', idx: 7 },
                  ].map((field) => (
                    <motion.div
                      key={field.key}
                      custom={field.idx}
                      variants={fieldVariants}
                      initial="initial"
                      animate="animate"
                    >
                      <label className="block text-xs text-[var(--text-muted)] mb-1">{field.label}</label>
                      <input
                        className="input-field"
                        type={field.type}
                        step={field.step}
                        required={field.required}
                        value={newTxn[field.key]}
                        onChange={(e) => setNewTxn({ ...newTxn, [field.key]: e.target.value })}
                      />
                    </motion.div>
                  ))}
                  <motion.div custom={8} variants={fieldVariants} initial="initial" animate="animate">
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
                  </motion.div>
                  <motion.div custom={9} variants={fieldVariants} initial="initial" animate="animate">
                    <label className="block text-xs text-[var(--text-muted)] mb-1">Gender</label>
                    <select className="input-field" value={newTxn.gender}
                      onChange={(e) => setNewTxn({ ...newTxn, gender: e.target.value })}>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                    </select>
                  </motion.div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <motion.button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setShowCreate(false)}
                    whileTap={{ scale: 0.95 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    className="btn-primary"
                    disabled={creating}
                    whileTap={{ scale: 0.95 }}
                  >
                    {creating ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      'Create & Analyze'
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <DetailPanel 
        isOpen={!!selectedTxn} 
        transaction={selectedTxn} 
        onClose={() => setSelectedTxn(null)} 
      />
    </div>
  );
}
