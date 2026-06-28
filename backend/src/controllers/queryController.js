const { allQuery, runQuery, getQuery } = require('../database/db');

exports.executeQuery = async (req, res) => {
  const startTime = Date.now();
  let datasetId = null;
  let rawQuery = '';
  
  try {
    const { dataset_id, query } = req.body;
    const userId = req.user.userId;
    datasetId = dataset_id;
    rawQuery = query;

    if (!dataset_id || !query) {
      return res.status(400).json({ error: 'dataset_id and query are required' });
    }

    // Verify dataset ownership
    const dataset = await getQuery('SELECT * FROM datasets WHERE id = ? AND user_id = ?', [dataset_id, userId]);
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found or unauthorized' });
    }

    // Translate placeholder "data" or "dataset" or "my_data" or the original filename into the actual table name
    // e.g. FROM data -> FROM "data_user_..."
    let sqlToExecute = query
      .replace(/\bdata\b/gi, `"${dataset.table_name}"`)
      .replace(/\bdataset\b/gi, `"${dataset.table_name}"`)
      .replace(/\bmy_data\b/gi, `"${dataset.table_name}"`);

    // Basic SQL safety check (SQLite doesn't allow multiple statements if not configured, but we enforce read-only SELECT)
    const normalizedSql = sqlToExecute.trim().toUpperCase();
    if (!normalizedSql.startsWith('SELECT')) {
      return res.status(400).json({ 
        error: 'Security restriction: Only read-only SELECT queries are allowed.' 
      });
    }

    if (normalizedSql.includes('INSERT') || normalizedSql.includes('UPDATE') || 
        normalizedSql.includes('DELETE') || normalizedSql.includes('DROP') || 
        normalizedSql.includes('ALTER') || normalizedSql.includes('CREATE')) {
      return res.status(400).json({ 
        error: 'Security restriction: Mutating queries (INSERT, UPDATE, DELETE, DROP, ALTER, CREATE) are strictly prohibited.' 
      });
    }

    // Execute query
    const results = await allQuery(sqlToExecute);
    const executionTime = Date.now() - startTime;

    // Save query to history
    await runQuery(
      'INSERT INTO query_history (user_id, dataset_id, query_text, status, execution_time_ms) VALUES (?, ?, ?, ?, ?)',
      [userId, dataset_id, query, 'SUCCESS', executionTime]
    );

    // Format output
    let headers = [];
    if (results.length > 0) {
      headers = Object.keys(results[0]);
    }

    res.json({
      success: true,
      headers,
      rows: results,
      execution_time_ms: executionTime
    });

  } catch (err) {
    const executionTime = Date.now() - startTime;
    console.error('SQL query execution error:', err.message);

    // Log failure to history
    if (datasetId) {
      try {
        await runQuery(
          'INSERT INTO query_history (user_id, dataset_id, query_text, status, execution_time_ms) VALUES (?, ?, ?, ?, ?)',
          [req.user.userId, datasetId, rawQuery, 'FAILED', executionTime]
        );
      } catch (logErr) {
        console.error('Failed logging query error:', logErr);
      }
    }

    res.status(400).json({ 
      error: `SQL Error: ${err.message}` 
    });
  }
};

exports.getQueryHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { dataset_id } = req.query;

    let sql = 'SELECT h.id, h.query_text, h.status, h.execution_time_ms, h.created_at, d.original_name FROM query_history h JOIN datasets d ON h.dataset_id = d.id WHERE h.user_id = ?';
    const params = [userId];

    if (dataset_id) {
      sql += ' AND h.dataset_id = ?';
      params.push(dataset_id);
    }

    sql += ' ORDER BY h.created_at DESC LIMIT 50';

    const history = await allQuery(sql, params);
    res.json(history);
  } catch (err) {
    console.error('Get query history error:', err);
    res.status(500).json({ error: 'Internal server error fetching query history' });
  }
};
