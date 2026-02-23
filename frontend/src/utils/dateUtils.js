/**
 * Group data by month
 * @param {Array} data - Array of objects with date field
 * @param {string} dateField - Name of the date field
 * @returns {Object} - Grouped data by month
 */
export const groupByMonth = (data, dateField = 'created_at') => {
  const grouped = {};

  data.forEach(item => {
    if (!item[dateField]) return;

    const date = new Date(item[dateField]);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    if (!grouped[monthKey]) {
      grouped[monthKey] = {
        label: monthLabel,
        data: []
      };
    }
    grouped[monthKey].data.push(item);
  });

  // Sort months in descending order (most recent first)
  const sortedMonths = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  const sortedGrouped = {};
  sortedMonths.forEach(key => {
    sortedGrouped[key] = grouped[key];
  });

  return sortedGrouped;
};

/**
 * Get month options for dropdown/tabs
 * @param {Object} groupedData - Data grouped by month
 * @returns {Array} - Array of {key, label} for month selection
 */
export const getMonthOptions = (groupedData) => {
  return Object.keys(groupedData).map(key => ({
    key,
    label: groupedData[key].label
  }));
};

/**
 * Format date for display
 * @param {string|Date} date
 * @returns {string}
 */
export const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format datetime for display
 * @param {string|Date} datetime
 * @returns {string}
 */
export const formatDateTime = (datetime) => {
  if (!datetime) return '-';
  return new Date(datetime).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
