import React, { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

const MonthTabs = ({ months, activeMonth, onMonthChange }) => {
  const [showDropdown, setShowDropdown] = useState(false);

  if (!months || months.length === 0) return null;

  const activeMonthLabel = months.find(m => m.key === activeMonth)?.label || '';

  return (
    <>
      {/* Desktop view - horizontal tabs */}
      <div
        className="month-tabs-desktop"
        style={{
          display: 'none',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          overflowX: 'auto',
          padding: '1rem',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          borderBottom: '3px solid #000'
        }}
      >
        {months.map(month => (
          <button
            key={month.key}
            onClick={() => onMonthChange(month.key)}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeMonth === month.key ? '#000' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: activeMonth === month.key ? 'white' : '#666',
              fontWeight: activeMonth === month.key ? '700' : '600',
              cursor: 'pointer',
              fontSize: '0.875rem',
              transition: 'all 0.3s',
              whiteSpace: 'nowrap',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Calendar size={16} />
            {month.label}
          </button>
        ))}
      </div>

      {/* Mobile view - dropdown */}
      <div
        className="month-tabs-mobile"
        style={{
          display: 'block',
          marginBottom: '1.5rem',
          position: 'relative'
        }}
      >
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          style={{
            width: '100%',
            padding: '1rem 1.25rem',
            backgroundColor: '#000',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Calendar size={20} />
            <span>{activeMonthLabel}</span>
          </div>
          <ChevronDown
            size={20}
            style={{
              transition: 'transform 0.2s',
              transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)'
            }}
          />
        </button>

        {showDropdown && (
          <>
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                zIndex: 999
              }}
              onClick={() => setShowDropdown(false)}
            />
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '0.5rem',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
                overflow: 'hidden',
                zIndex: 1000,
                maxHeight: '300px',
                overflowY: 'auto'
              }}
            >
              {months.map((month, index) => (
                <button
                  key={month.key}
                  onClick={() => {
                    onMonthChange(month.key);
                    setShowDropdown(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '1rem 1.25rem',
                    backgroundColor: month.key === activeMonth ? '#f0f0f0' : 'white',
                    border: 'none',
                    borderBottom: index < months.length - 1 ? '1px solid #e0e0e0' : 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: month.key === activeMonth ? '700' : '400',
                    transition: 'background-color 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}
                >
                  <Calendar size={18} />
                  {month.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <style>{`
        @media (min-width: 768px) {
          .month-tabs-desktop {
            display: flex !important;
          }
          .month-tabs-mobile {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
};

export default MonthTabs;
