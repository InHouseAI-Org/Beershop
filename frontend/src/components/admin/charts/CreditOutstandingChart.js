import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatMonthLabel } from '../../../utils/formatMonth';

// Color palette for different credit holders
const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#000000'
];

const CreditOutstandingChart = ({ data, creditHolderNames }) => {
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

  // Calculate minimum visible months (12) and total months
  const totalMonths = data.length;
  const minVisibleMonths = 12;
  const shouldScroll = totalMonths > minVisibleMonths;

  // Calculate chart width based on number of months
  const monthWidth = isMobile ? 60 : 80;
  const chartWidth = Math.max(totalMonths * monthWidth, minVisibleMonths * monthWidth);

  return (
    <div className="card" style={{ marginBottom: '2rem' }}>
      <h3 style={{ marginBottom: '1rem', fontSize: isMobile ? '1.125rem' : '1.25rem' }}>Credit Outstanding Over Time</h3>
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
                  value: 'Outstanding (₹)',
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
              <Legend
                wrapperStyle={{ fontSize: isMobile ? 10 : 12, cursor: 'pointer' }}
                iconSize={isMobile ? 10 : 14}
                onClick={(e) => handleLegendClick(e.dataKey)}
              />
              {creditHolderNames && creditHolderNames.filter(name => name).map((name, index) => (
                <Line
                  key={`credit-holder-${name}-${index}`}
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
        Click on legend items to show/hide credit holder lines
      </p>

      {shouldScroll && (
        <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', fontStyle: 'italic', textAlign: 'center' }}>
          ← Scroll horizontally to view all months →
        </p>
      )}
    </div>
  );
};

export default CreditOutstandingChart;
