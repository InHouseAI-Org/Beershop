import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { FileText } from 'lucide-react';
import MobileTable from '../common/MobileTable';

const TDSLedgerTab = () => {
  const [ledgerData, setLedgerData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchTDSLedger();
  }, []);

  const fetchTDSLedger = async (startDate = '', endDate = '') => {
    try {
      setLoading(true);
      setError('');

      // Build query params
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('start_date', startDate);
      if (endDate) queryParams.append('end_date', endDate);
      const queryString = queryParams.toString();

      // Fetch TDS ledger data
      const response = await api.get(`/tds-ledger${queryString ? '?' + queryString : ''}`);
      setLedgerData(response.data.ledger || []);
      setSummary(response.data.summary || null);
    } catch (err) {
      console.error('Failed to fetch TDS ledger:', err);
      setError('Failed to fetch TDS ledger');
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (field, value) => {
    const newDateRange = { ...dateRange, [field]: value };
    setDateRange(newDateRange);
  };

  const handleApplyDateFilter = () => {
    fetchTDSLedger(dateRange.startDate, dateRange.endDate);
  };

  const handleClearDateFilter = () => {
    setDateRange({ startDate: '', endDate: '' });
    fetchTDSLedger('', '');
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
      received: { bg: '#d4edda', color: '#155724', label: 'Received' },
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
      key: 'tds_amount',
      label: 'TDS Amount',
      render: (item) => (
        <span style={{ fontWeight: '700', color: '#d32f2f' }}>
          {formatCurrency(item.tds_amount)}
        </span>
      )
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
          TDS Ledger
        </h2>
        <p style={{
          color: '#666',
          fontSize: '1rem',
          marginBottom: 0
        }}>
          Tax Deducted at Source - Track TDS deducted from orders
        </p>
      </div>

      {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* Date Range Filter */}
      <div style={{
        backgroundColor: '#fff',
        padding: '1.5rem',
        borderRadius: '12px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '2rem'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: '600', color: '#000' }}>
          Filter by Date Range
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0, minWidth: '200px' }}>
            <label htmlFor="startDate" style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              className="form-control"
              value={dateRange.startDate}
              onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
              style={{ fontSize: '1rem', padding: '0.75rem' }}
            />
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: '200px' }}>
            <label htmlFor="endDate" style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              className="form-control"
              value={dateRange.endDate}
              onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
              style={{ fontSize: '1rem', padding: '0.75rem' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleApplyDateFilter}
              className="btn btn-primary"
              style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}
            >
              Apply Filter
            </button>
            <button
              onClick={handleClearDateFilter}
              className="btn btn-secondary"
              style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>

          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '2px solid #dee2e6'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <FileText size={24} color="#495057" />
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#495057', fontWeight: '600' }}>
                Total TDS
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

export default TDSLedgerTab;
