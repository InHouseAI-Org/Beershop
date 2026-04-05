/**
 * Performance timing utility for measuring database and API performance
 */

/**
 * Creates a timing context for measuring execution time
 * @param {string} endpoint - The endpoint name (e.g., 'GET /api/sales')
 * @returns {object} Timing object with methods to track DB time and finish
 */
const createTimer = (endpoint) => {
  const startTime = Date.now();
  let dbTime = 0;

  return {
    /**
     * Measure a database operation
     * @param {Function} operation - Async function to execute
     * @returns {Promise<any>} Result of the operation
     */
    async measureDb(operation) {
      const dbStart = Date.now();
      try {
        const result = await operation();
        dbTime += Date.now() - dbStart;
        return result;
      } catch (error) {
        dbTime += Date.now() - dbStart;
        throw error;
      }
    },

    /**
     * Log the final timing results
     */
    finish() {
      const totalTime = Date.now() - startTime;
      const computeTime = totalTime - dbTime;

      console.log({
        endpoint,
        totalTime: `${totalTime}ms`,
        dbTime: `${dbTime}ms`,
        computeTime: `${computeTime}ms`,
        dbPercentage: `${((dbTime / totalTime) * 100).toFixed(1)}%`
      });
    }
  };
};

module.exports = { createTimer };
