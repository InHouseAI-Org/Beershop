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
  let dbCallCount = 0;

  return {
    /**
     * Measure a database operation
     * @param {Function} operation - Async function to execute
     * @returns {Promise<any>} Result of the operation
     */
    async measureDb(operation) {
      const dbStart = Date.now();
      dbCallCount++;
      try {
        const result = await operation();
        const callTime = Date.now() - dbStart;
        dbTime += callTime;

        // Log individual slow queries (>500ms)
        if (callTime > 500) {
          console.log(`⚠️ SLOW QUERY #${dbCallCount}: ${callTime}ms in ${endpoint}`);
        }

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
      const avgDbTime = dbCallCount > 0 ? Math.round(dbTime / dbCallCount) : 0;

      console.log({
        endpoint,
        totalTime: `${totalTime}ms`,
        dbTime: `${dbTime}ms`,
        computeTime: `${computeTime}ms`,
        dbPercentage: `${((dbTime / totalTime) * 100).toFixed(1)}%`,
        dbCalls: dbCallCount,
        avgDbCallTime: `${avgDbTime}ms`
      });

      // Flag extremely slow endpoints
      if (totalTime > 2000) {
        console.log(`🚨 CRITICAL: ${endpoint} took ${totalTime}ms - possible Neon cold start or missing indexes`);
      }
    }
  };
};

module.exports = { createTimer };
