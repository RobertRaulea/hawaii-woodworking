import type React from 'react';
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { Users, Eye, Search, Mail, Download, X } from 'lucide-react';
import { api } from '../../../../convex/_generated/api';

const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatPrice = (price: number): string => `${price.toFixed(2)} RON`;

export const AdminCustomers: React.FC = () => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'registered' | 'guest'>('all');
  const [showNewsletterModal, setShowNewsletterModal] = useState(false);
  const customers = useQuery(api.customers.getAll);
  const newsletterSubscribers = useQuery(api.customers.getNewsletterSubscribers);

  const filtered = useMemo(() => {
    if (!customers) return [];

    let result = customers;

    if (typeFilter === 'registered') {
      result = result.filter((c) => c.isRegistered);
    } else if (typeFilter === 'guest') {
      result = result.filter((c) => !c.isRegistered);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.firstName.toLowerCase().includes(q) ||
          c.lastName.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
      );
    }

    return result;
  }, [customers, search, typeFilter]);

  if (customers === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-stone-500">Loading customers...</p>
      </div>
    );
  }

  const registeredCount = customers.filter((c) => c.isRegistered).length;
  const guestCount = customers.filter((c) => !c.isRegistered).length;
  const newsletterCount = customers.filter((c) => c.newsletter).length;

  const handleExportEmails = () => {
    if (!newsletterSubscribers) return;
    const emails = newsletterSubscribers.map((sub) => sub.email).join(', ');
    navigator.clipboard.writeText(emails);
    alert(`${newsletterSubscribers.length} email addresses copied to clipboard!`);
  };

  const handleDownloadCSV = () => {
    if (!newsletterSubscribers) return;
    const csvContent = [
      ['Email', 'First Name', 'Last Name', 'Type', 'Joined Date'].join(','),
      ...newsletterSubscribers.map((sub) =>
        [
          sub.email,
          sub.firstName,
          sub.lastName,
          sub.isRegistered ? 'Registered' : 'Guest',
          new Date(sub.createdAt).toLocaleDateString('ro-RO'),
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 mb-4">Customers</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-stone-200 p-5">
            <p className="text-sm text-stone-500 mb-1">Total Customers</p>
            <p className="text-2xl font-bold text-stone-900">{customers.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-stone-200 p-5">
            <p className="text-sm text-stone-500 mb-1">Registered</p>
            <p className="text-2xl font-bold text-stone-900">{registeredCount}</p>
          </div>
          <div className="bg-white rounded-lg border border-stone-200 p-5">
            <p className="text-sm text-stone-500 mb-1">Guests</p>
            <p className="text-2xl font-bold text-stone-900">{guestCount}</p>
          </div>
          <div 
            className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-amber-200 p-5 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setShowNewsletterModal(true)}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-amber-700 font-medium">Newsletter</p>
              <Mail className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-amber-900">{newsletterCount}</p>
            <p className="text-xs text-amber-600 mt-1">Click to export</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-stone-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="typeFilter" className="text-sm text-stone-500">
            Type:
          </label>
          <select
            id="typeFilter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | 'registered' | 'guest')}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">All</option>
            <option value="registered">Registered</option>
            <option value="guest">Guest</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 bg-white p-12 text-center">
          <Users className="h-10 w-10 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500">No customers found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="px-4 py-3 text-left font-medium text-stone-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-stone-600 hidden md:table-cell">Email</th>
                <th className="px-4 py-3 text-center font-medium text-stone-600">Type</th>
                <th className="px-4 py-3 text-right font-medium text-stone-600">Orders</th>
                <th className="px-4 py-3 text-right font-medium text-stone-600 hidden lg:table-cell">Total Spent</th>
                <th className="px-4 py-3 text-left font-medium text-stone-600 hidden lg:table-cell">Joined</th>
                <th className="px-4 py-3 text-right font-medium text-stone-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => (
                <tr
                  key={customer._id}
                  className="border-b border-stone-100 last:border-b-0 hover:bg-stone-50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-stone-900">
                    {customer.firstName} {customer.lastName}
                  </td>
                  <td className="px-4 py-3 text-stone-500 hidden md:table-cell">
                    {customer.email}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        customer.isRegistered
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {customer.isRegistered ? 'Registered' : 'Guest'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-stone-700">
                    {customer.orderCount}
                  </td>
                  <td className="px-4 py-3 text-right text-stone-700 hidden lg:table-cell">
                    {formatPrice(customer.totalSpent)}
                  </td>
                  <td className="px-4 py-3 text-stone-500 hidden lg:table-cell">
                    {formatDate(customer.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/admin/customers/${customer._id}`}
                      className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Newsletter Subscribers Modal */}
      {showNewsletterModal && newsletterSubscribers && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Newsletter Subscribers</h2>
                  <p className="text-sm text-amber-100">{newsletterSubscribers.length} total subscribers</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewsletterModal(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleExportEmails}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  Copy All Emails
                </button>
                <button
                  onClick={handleDownloadCSV}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download CSV
                </button>
              </div>

              <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
                <h3 className="text-sm font-semibold text-stone-700 mb-2">How to send promotional emails:</h3>
                <ol className="text-sm text-stone-600 space-y-1.5 list-decimal list-inside">
                  <li>Click "Copy All Emails" to copy subscriber emails to clipboard</li>
                  <li>Open your email client (Gmail, Outlook, etc.)</li>
                  <li>Paste the emails in the BCC field to protect privacy</li>
                  <li>Compose your promotional message</li>
                  <li>Send to all subscribers at once</li>
                </ol>
                <p className="text-xs text-stone-500 mt-3 italic">
                  💡 Tip: Use BCC (Blind Carbon Copy) to keep subscriber emails private from each other.
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <div className="rounded-lg border border-stone-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50">
                      <th className="px-4 py-3 text-left font-medium text-stone-600">Email</th>
                      <th className="px-4 py-3 text-left font-medium text-stone-600 hidden md:table-cell">Name</th>
                      <th className="px-4 py-3 text-center font-medium text-stone-600 hidden sm:table-cell">Type</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {newsletterSubscribers.map((sub, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-stone-100 last:border-b-0 hover:bg-stone-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-stone-700 font-mono text-xs">
                          {sub.email}
                        </td>
                        <td className="px-4 py-3 text-stone-900 hidden md:table-cell">
                          {sub.firstName} {sub.lastName}
                        </td>
                        <td className="px-4 py-3 text-center hidden sm:table-cell">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              sub.isRegistered
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-stone-100 text-stone-600'
                            }`}
                          >
                            {sub.isRegistered ? 'Registered' : 'Guest'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default AdminCustomers;
