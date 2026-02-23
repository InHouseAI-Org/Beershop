import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const UserDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchSales();
  }, [currentDate]);

  const fetchSales = async () => {
    try {
      const response = await api.get('/sales');
      setSales(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch sales data');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const hasSaleOnDate = (day) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Create local date string (YYYY-MM-DD)
    const localYear = year;
    const localMonth = String(month + 1).padStart(2, '0');
    const localDay = String(day).padStart(2, '0');
    const dateStr = `${localYear}-${localMonth}-${localDay}`;

    return sales.some(sale => {
      if (!sale.date) return false;

      // Parse database date to local date string
      const dbDate = new Date(sale.date);
      const dbYear = dbDate.getFullYear();
      const dbMonth = String(dbDate.getMonth() + 1).padStart(2, '0');
      const dbDay = String(dbDate.getDate()).padStart(2, '0');
      const dbDateStr = `${dbYear}-${dbMonth}-${dbDay}`;

      return dbDateStr === dateStr;
    });
  };

  const changeMonth = (offset) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthNamesHindi = ['जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayNamesHindi = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];

  return (
    <>
      <div className="header">
        <div className="header-content">
          <div>
            <h1>User Dashboard | उपयोगकर्ता डैशबोर्ड</h1>
            <p style={{ color: '#ccc', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Welcome | स्वागत है, {user?.username}
            </p>
          </div>
          <button onClick={logout} className="btn btn-secondary">
            Logout | लॉगआउट
          </button>
        </div>
      </div>

      <div className="container">
        {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={() => navigate('/add-sales')}
            className="btn btn-success"
            style={{ width: '100%', fontSize: '1.25rem', padding: '1rem' }}
          >
            Add Sales | बिक्री जोड़ें
          </button>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1.5rem' }}>
            <button onClick={() => changeMonth(-1)} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
              ←
            </button>
            <h2 style={{fontSize: '1.2rem', color: '#000', margin: 0, textAlign: 'center' }}>
              {monthNames[month]} {year}<br/>
              <span style={{ fontSize: '0.8rem', fontWeight: '400' }}>{monthNamesHindi[month]} {year}</span>
            </h2>
            <button onClick={() => changeMonth(1)} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
              →
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', width: '100%', overflowX: 'auto', gap: '0.5rem' }}>
            {dayNames.map((day, idx) => (
              <div key={day} style={{
                textAlign: 'center',
                fontWeight: '700',
                borderBottom: '2px solid #000'
              }}>
                {day}<br/>
                <span style={{ fontSize: '0.75rem', fontWeight: '400' }}>{dayNamesHindi[idx]}</span>
              </div>
            ))}

            {Array.from({ length: startingDayOfWeek }).map((_, idx) => (
              <div key={`empty-${idx}`} style={{ padding: '0rem' }}></div>
            ))}

            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const hasSale = hasSaleOnDate(day);
              return (
                <div
                  key={day}
                  style={{
                    textAlign: 'center',
                    padding: '0.5rem',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    backgroundColor: hasSale ? '#000' : 'white',
                    color: hasSale ? 'white' : '#000',
                    fontWeight: hasSale ? '700' : '400',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {day}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>
              <span style={{ display: 'inline-block', width: '20px', height: '20px', backgroundColor: '#000', marginRight: '0.5rem', verticalAlign: 'middle' }}></span>
              Sale recorded on this date | इस तारीख को बिक्री दर्ज की गई
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserDashboard;
