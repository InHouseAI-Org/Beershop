// Format YYYY-MM to readable month year format
export const formatMonthLabel = (monthStr) => {
  if (!monthStr) return '';

  const [year, month] = monthStr.split('-');
  const date = new Date(year, parseInt(month) - 1);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return `${monthNames[date.getMonth()]} ${year}`;
};
