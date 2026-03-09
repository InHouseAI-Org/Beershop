import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatMonthLabel } from '../../../utils/formatMonth';

// Color palette for different distributors
const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#000000'
];

const DistributorOrdersChart = ({ data, distributorNames }) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // State to track which lines are visible
  const [hiddenLines, setHiddenLines] = useState({});

  // Toggle line visibility
  const handleLegendClick = (dataKey) => {
    setHiddenLines(prev => ({
      ...prev,
      [dataKey]: !prev[dataKey]
    }));
  };

  // Calculate average value for each distributor and sort by average (high to low)
  const sortedDistributorNames = data.length > 0
    ? [...distributorNames.filter(name => name)].sort((a, b) => {
        const avgA = data.reduce((sum, month) => sum + (parseFloat(month[a]) || 0), 0) / data.length;
        const avgB = data.reduce((sum, month) => sum + (parseFloat(month[b]) || 0), 0) / data.length;
        return avgB - avgA; // Sort descending (high to low)
      })
    : distributorNames.filter(name => name);

  // Calculate minimum visible months (12) and total months
  const totalMonths = data.length;
  const minVisibleMonths = 12;
  const shouldScroll = totalMonths > minVisibleMonths;

  // Calculate chart width based on number of months
  const monthWidth = isMobile ? 60 : 80;
  const chartWidth = Math.max(totalMonths * monthWidth, minVisibleMonths * monthWidth);

  // Custom legend renderer to maintain sorted order
  const renderLegend = (props) => {
    const { payload } = props;

    // Sort legend payload by the sorted distributor names order
    const sortedPayload = [...payload].sort((a, b) => {
      const indexA = sortedDistributorNames.indexOf(a.value);
      const indexB = sortedDistributorNames.indexOf(b.value);
      return indexA - indexB;
    });

    return (
      <ul style={{
        listStyle: 'none',
        padding: 0,
        margin: '10px 0 0 0',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '10px',
        fontSize: isMobile ? '10px' : '12px'
      }}>
        {sortedPayload.map((entry, index) => (
          <li
            key={`legend-${index}`}
            onClick={() => handleLegendClick(entry.dataKey)}
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              opacity: hiddenLines[entry.dataKey] ? 0.4 : 1,
              textDecoration: hiddenLines[entry.dataKey] ? 'line-through' : 'none'
            }}
          >
            <span style={{
              display: 'inline-block',
              width: isMobile ? '10px' : '14px',
              height: isMobile ? '10px' : '14px',
              backgroundColor: entry.color,
              marginRight: '6px',
              borderRadius: '2px'
            }} />
            <span>{entry.value}</span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="card" style={{ marginBottom: '2rem' }}>
      <h3 style={{ marginBottom: '1rem', fontSize: isMobile ? '1.125rem' : '1.25rem' }}>Distributor Orders by Month</h3>
      <div style={{
        width: '100%',
        overflowX: shouldScroll ? 'auto' : 'visible',
        overflowY: 'visible'
      }}>
        <div style={{ width: shouldScroll ? `${chartWidth}px` : '100%', minWidth: '100%' }}>
          <ResponsiveContainer width="100%" height={isMobile ? 250 : 350}>
            <LineChart
              data={data}
              margin={{
                top: 5,
                right: 30,
                left: isMobile ? 10 : 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                height={60}
                tick={{ fontSize: isMobile ? 11 : 13, fontWeight: 500 }}
                tickFormatter={formatMonthLabel}
                tickMargin={10}
              />
              <YAxis
                tick={{ fontSize: isMobile ? 10 : 12 }}
                label={{
                  value: 'Order Value (₹)',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: isMobile ? 10 : 12 }
                }}
              />
              <Tooltip
                formatter={(value) => `₹${value.toLocaleString()}`}
                contentStyle={{ fontSize: isMobile ? 11 : 14 }}
                wrapperStyle={{ zIndex: 1000 }}
              />
              <Legend content={renderLegend} />
              {sortedDistributorNames.map((name, index) => (
                <Line
                  key={`distributor-${name}-${index}`}
                  type="monotone"
                  dataKey={name}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  name={name}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  hide={hiddenLines[name]}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p style={{ fontSize: '0.875rem', marginTop: '1rem', color: '#666', textAlign: 'center' }}>
        Click on legend items to show/hide distributor lines
      </p>

      {shouldScroll && (
        <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', fontStyle: 'italic', textAlign: 'center' }}>
          ← Scroll horizontally to view all months →
        </p>
      )}
    </div>
  );
};

export default DistributorOrdersChart;
