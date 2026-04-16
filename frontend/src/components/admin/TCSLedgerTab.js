import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Calendar, DollarSign, FileText } from 'lucide-react';
import MobileTable from '../common/MobileTable';

const TCSLedgerTab = () => {
  const [ledgerData, setLedgerData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchTCSLedger();
  }, []);

  const fetchTCSLedger = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch TCS ledger data
      const response = await api.get('/tcs-ledger');
      setLedgerData(response.data.ledger || []);
      setSummary(response.data.summary || null);
    } catch (err) {
      console.error('Failed to fetch TCS ledger:', err);
      setError('Failed to fetch TCS ledger');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      pending: { bg: '#fff3cd', color: '#856404', label: 'Pending' },
      paid: { bg: '#d4edda', color: '#155724', label: 'Paid' },
      adjusted: { bg: '#d1ecf1', color: '#0c5460', label: 'Adjusted' }
    };
    const config = statusColors[status] || statusColors.pending;
    return (
      <span style={{
        backgroundColor: config.bg,
        color: config.color,
        padding: '0.25rem 0.75rem',
        borderRadius: '12px',
        fontSize: '0.875rem',
        fontWeight: '600'
      }}>
        {config.label}
      </span>
    );
  };

  const columns = [
    {
      key: 'order_date',
      label: 'Order Date',
      render: (item) => formatDate(item.order_date)
    },
    {
      key: 'bill_number',
      label: 'Bill Number',
      render: (item) => item.bill_number || '-'
    },
    {
      key: 'distributor_name',
      label: 'Distributor',
      render: (item) => item.distributor_name || '-'
    },
    {
      key: 'tcs_amount',
      label: 'TCS Amount',
      render: (item) => (
        <span style={{ fontWeight: '700', color: '#2e7d32' }}>
          {formatCurrency(item.tcs_amount)}
        </span>
      )
    },
    {
      key: 'payment_status',
      label: 'Status',
      render: (item) => getStatusBadge(item.payment_status)
    },
    {
      key: 'payment_date',
      label: 'Payment Date',
      render: (item) => item.payment_date ? formatDate(item.payment_date) : '-'
    },
    {
      key: 'payment_reference',
      label: 'Reference',
      render: (item) => item.payment_reference || '-'
    }
  ];

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{
          color: '#000',
          margin: 0,
          fontSize: '2rem',
          fontWeight: '700',
          letterSpacing: '0.5px',
          marginBottom: '0.5rem'
        }}>
          TCS Ledger
        </h2>
        <p style={{
          color: '#666',
          fontSize: '1rem',
          marginBottom: 0
        }}>
          Tax Collected at Source - Track TCS collected from orders
        </p>
      </div>

      {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* Summary Cards */}
      {summary && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            backgroundColor: '#fff3cd',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '2px solid #ffc107'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <Calendar size={24} color="#856404" />
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#856404', fontWeight: '600' }}>
                Pending TCS
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700', color: '#856404' }}>
              {formatCurrency(summary.pending || 0)}
            </p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#856404' }}>
              {summary.pending_count || 0} transactions
            </p>
          </div>

          <div style={{
            backgroundColor: '#d4edda',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '2px solid #28a745'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <DollarSign size={24} color="#155724" />
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#155724', fontWeight: '600' }}>
                Paid TCS
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700', color: '#155724' }}>
              {formatCurrency(summary.paid || 0)}
            </p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#155724' }}>
              {summary.paid_count || 0} transactions
            </p>
          </div>

          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '2px solid #dee2e6'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <FileText size={24} color="#495057" />
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#495057', fontWeight: '600' }}>
                Total TCS
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700', color: '#495057' }}>
              {formatCurrency(summary.total || 0)}
            </p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#495057' }}>
              {summary.total_count || 0} transactions
            </p>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <MobileTable
          columns={columns}
          data={ledgerData}
          enableSearch={true}
          enableSort={true}
          defaultSortKey="order_date"
          defaultSortOrder="desc"
        />
      </div>
    </div>
  );
};

export default TCSLedgerTab;
