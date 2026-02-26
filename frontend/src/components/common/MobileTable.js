import React, { useState, useMemo } from 'react';
import { Search, SortAsc, SortDesc, Filter } from 'lucide-react';

/**
 * Mobile-optimized table component that converts to cards on mobile
 * @param {Array} columns - Column definitions: [{ key, label, render, sortable: boolean, filterable: boolean }]
 * @param {Array} data - Data rows
 * @param {Function} onRowClick - Optional row click handler
 * @param {Boolean} enableSearch - Enable search bar (default: true)
 * @param {Boolean} enableSort - Enable sorting (default: true)
 * @param {String} defaultSortKey - Default sort column key
 * @param {String} defaultSortOrder - Default sort order ('asc' or 'desc')
 */
const MobileTable = ({
  columns,
  data,
  onRowClick,
  enableSearch = true,
  enableSort = true,
  defaultSortKey = null,
  defaultSortOrder = 'asc'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState(defaultSortKey);
  const [sortOrder, setSortOrder] = useState(defaultSortOrder);

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = [...data];

    // Apply search filter
    if (searchTerm && enableSearch) {
      filtered = filtered.filter(row =>
        columns.some(col => {
          const value = col.key.split('.').reduce((obj, key) => obj?.[key], row);
          return value?.toString().toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Apply sorting
    if (sortKey && enableSort) {
      filtered.sort((a, b) => {
        const aValue = sortKey.split('.').reduce((obj, key) => obj?.[key], a);
        const bValue = sortKey.split('.').reduce((obj, key) => obj?.[key], b);

        if (aValue == null) return 1;
        if (bValue == null) return -1;

        const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [data, searchTerm, sortKey, sortOrder, columns, enableSearch, enableSort]);

  const handleSort = (key) => {
    if (!enableSort) return;

    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  return (
    <>
      {/* Search and Filter Bar */}
      {(enableSearch || enableSort) && (
        <div style={{
          marginBottom: '1rem',
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          {enableSearch && (
            <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
              <Search
                size={18}
                style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#666'
                }}
              />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-control"
                style={{
                  paddingLeft: '2.75rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          )}

          {enableSort && sortKey && (
            <div style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#f5f5f5',
              borderRadius: '6px',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Filter size={16} />
              <span style={{ fontWeight: '500' }}>
                {columns.find(col => col.key === sortKey)?.label}
              </span>
              {sortOrder === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
            </div>
          )}
        </div>
      )}

      {/* Desktop table view */}
      <div className="desktop-table-view" style={{ display: 'none' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                    style={{
                      cursor: col.sortable !== false && enableSort ? 'pointer' : 'default',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {col.label}
                      {col.sortable !== false && enableSort && sortKey === col.key && (
                        sortOrder === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {processedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                    {searchTerm ? 'No results found' : 'No data found'}
                  </td>
                </tr>
              ) : (
                processedData.map((row, idx) => (
                  <tr
                    key={idx}
                    onClick={() => onRowClick?.(row)}
                    style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                  >
                    {columns.map(col => (
                      <td key={col.key}>
                        {col.render ? col.render(row) : col.key.split('.').reduce((obj, key) => obj?.[key], row)}
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
        {processedData.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
            {searchTerm ? 'No results found' : 'No data found'}
          </div>
        ) : (
          processedData.map((row, idx) => (
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
              {columns.map((col, colIdx) => (
                <div
                  key={col.key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    padding: '0.75rem 0',
                    borderBottom: colIdx === columns.length - 1 ? 'none' : '1px solid #f0f0f0'
                  }}
                >
                  <span style={{
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    color: '#666',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    flex: '0 0 40%'
                  }}>
                    {col.label}
                  </span>
                  <span style={{
                    fontWeight: '500',
                    textAlign: 'right',
                    marginLeft: '1rem',
                    flex: '1',
                    wordBreak: 'break-word'
                  }}>
                    {col.render ? col.render(row) : col.key.split('.').reduce((obj, key) => obj?.[key], row)}
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
