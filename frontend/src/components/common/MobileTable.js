import React from 'react';

/**
 * Mobile-optimized table component that converts to cards on mobile
 * @param {Array} columns - Column definitions: [{ key, label, render }]
 * @param {Array} data - Data rows
 * @param {Function} onRowClick - Optional row click handler
 */
const MobileTable = ({ columns, data, onRowClick }) => {
  return (
    <>
      {/* Desktop table view */}
      <div className="desktop-table-view" style={{ display: 'none' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                    No data found
                  </td>
                </tr>
              ) : (
                data.map((row, idx) => (
                  <tr
                    key={idx}
                    onClick={() => onRowClick?.(row)}
                    style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                  >
                    {columns.map(col => (
                      <td key={col.key}>
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile card view */}
      <div className="mobile-card-view" style={{ display: 'block' }}>
        {data.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
            No data found
          </div>
        ) : (
          data.map((row, idx) => (
            <div
              key={idx}
              className="card"
              onClick={() => onRowClick?.(row)}
              style={{
                cursor: onRowClick ? 'pointer' : 'default',
                marginBottom: '1rem',
                padding: '1.25rem'
              }}
            >
              {columns.map(col => (
                <div
                  key={col.key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 0',
                    borderBottom: '1px solid #f0f0f0',
                    ':last-child': { borderBottom: 'none' }
                  }}
                >
                  <span style={{
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    color: '#666',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {col.label}
                  </span>
                  <span style={{ fontWeight: '500', textAlign: 'right', marginLeft: '1rem' }}>
                    {col.render ? col.render(row) : row[col.key]}
                  </span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <style>{`
        @media (min-width: 768px) {
          .desktop-table-view {
            display: block !important;
          }
          .mobile-card-view {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
};

export default MobileTable;
