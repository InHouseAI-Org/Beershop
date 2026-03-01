import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatMonthLabel } from '../../../utils/formatMonth';

const MonthlySalesChart = ({ data }) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Calculate minimum visible months (12) and total months
  const totalMonths = data.length;
  const minVisibleMonths = 12;
  const shouldScroll = totalMonths > minVisibleMonths;

  // Calculate chart width based on number of months
  const monthWidth = isMobile ? 60 : 80;
  const chartWidth = Math.max(totalMonths * monthWidth, minVisibleMonths * monthWidth);

  return (
    <div className="card" style={{ marginBottom: '2rem' }}>
      <h3 style={{ marginBottom: '1rem', fontSize: isMobile ? '1.125rem' : '1.25rem' }}>Monthly Total Sales</h3>
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
                  value: 'Sales (₹)',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: isMobile ? 10 : 12 }
                }}
              />
              <Tooltip
                formatter={(value) => `₹${value.toLocaleString()}`}
                contentStyle={{ fontSize: isMobile ? 11 : 14 }}
              />
              <Legend wrapperStyle={{ fontSize: isMobile ? 11 : 14 }} />
              <Line
                type="monotone"
                dataKey="totalSales"
                stroke="#8884d8"
                strokeWidth={2}
                name="Total Sales"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {shouldScroll && (
        <p style={{ fontSize: '0.875rem', marginTop: '1rem', fontStyle: 'italic', textAlign: 'center' }}>
          ← Scroll horizontally to view all months →
        </p>
      )}
    </div>
  );
};

export default MonthlySalesChart;
