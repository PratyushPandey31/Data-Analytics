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

exports.copilotQuery = async (req, res) => {
  const startTime = Date.now();
  const { dataset_id, question } = req.body;
  const userId = req.user.userId;

  if (!dataset_id || !question) {
    return res.status(400).json({ error: 'dataset_id and question are required' });
  }

  try {
    // Verify dataset
    const dataset = await getQuery('SELECT * FROM datasets WHERE id = ? AND user_id = ?', [dataset_id, userId]);
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found or unauthorized' });
    }

    const schema = JSON.parse(dataset.schema_json);
    const qLower = question.toLowerCase();

    // 1. Identify columns in the question
    const matchedCols = [];
    Object.keys(schema).forEach(original => {
      const sanitized = schema[original].sanitized;
      // Check if user mentioned original header or sanitized name
      if (qLower.includes(original.toLowerCase()) || qLower.includes(sanitized.toLowerCase())) {
        matchedCols.push({ original, sanitized, type: schema[original].type });
      }
    });

    // 2. Identify aggregates
    let aggFunc = ''; // SUM, AVG, MIN, MAX, COUNT
    let aggLabel = '';
    if (qLower.includes('average') || qLower.includes('mean') || qLower.includes('avg')) {
      aggFunc = 'AVG';
      aggLabel = 'avg';
    } else if (qLower.includes('total') || qLower.includes('sum')) {
      aggFunc = 'SUM';
      aggLabel = 'total';
    } else if (qLower.includes('maximum') || qLower.includes('max') || qLower.includes('highest') || qLower.includes('peak')) {
      aggFunc = 'MAX';
      aggLabel = 'max';
    } else if (qLower.includes('minimum') || qLower.includes('min') || qLower.includes('lowest')) {
      aggFunc = 'MIN';
      aggLabel = 'min';
    } else if (qLower.includes('count') || qLower.includes('number of') || qLower.includes('how many')) {
      aggFunc = 'COUNT';
      aggLabel = 'count';
    }

    // 3. Identify grouping columns
    let groupByCol = null;
    const hasGroupByKeywords = qLower.includes('by') || qLower.includes('each') || qLower.includes('per') || qLower.includes('group');
    if (hasGroupByKeywords) {
      groupByCol = matchedCols.find(c => c.type === 'TEXT') || matchedCols[0];
    }

    // 4. Identify limits
    let limit = 20;
    const topMatch = qLower.match(/top\s+(\d+)/);
    const limitMatch = qLower.match(/limit\s+(\d+)/);
    if (topMatch) {
      limit = parseInt(topMatch[1], 10);
    } else if (limitMatch) {
      limit = parseInt(limitMatch[1], 10);
    }

    // 5. Construct query
    let selectFields = [];
    let groupByClause = '';
    let orderByClause = '';
    let whereClause = '';

    // Numerical target for aggregate
    const numCol = matchedCols.find(c => c.type === 'INTEGER' || c.type === 'REAL');

    if (aggFunc && aggFunc !== 'COUNT' && numCol) {
      const alias = `${aggLabel}_${numCol.sanitized}`;
      if (groupByCol && groupByCol.sanitized !== numCol.sanitized) {
        selectFields.push(`"${groupByCol.sanitized}"`);
        selectFields.push(`${aggFunc}("${numCol.sanitized}") as "${alias}"`);
        groupByClause = ` GROUP BY "${groupByCol.sanitized}"`;
        orderByClause = ` ORDER BY "${alias}" DESC`;
      } else {
        selectFields.push(`${aggFunc}("${numCol.sanitized}") as "${alias}"`);
      }
    } else if (aggFunc === 'COUNT') {
      if (groupByCol) {
        selectFields.push(`"${groupByCol.sanitized}"`);
        selectFields.push(`COUNT(*) as "count"`);
        groupByClause = ` GROUP BY "${groupByCol.sanitized}"`;
        orderByClause = ` ORDER BY "count" DESC`;
      } else {
        selectFields.push(`COUNT(*) as "count"`);
      }
    } else {
      if (matchedCols.length > 0) {
        selectFields = matchedCols.map(c => `"${c.sanitized}"`);
      } else {
        selectFields = ['*'];
      }
      
      if (numCol && (qLower.includes('highest') || qLower.includes('top') || qLower.includes('max'))) {
        orderByClause = ` ORDER BY "${numCol.sanitized}" DESC`;
      }
    }

    // Filters
    matchedCols.forEach(c => {
      if (c.type === 'TEXT') {
        const regex = new RegExp(`${c.original.toLowerCase()}\\s+(?:is|equals|=)\\s+([a-zA-Z0-9_\\s]+)`);
        const filterMatch = qLower.match(regex);
        if (filterMatch) {
          const val = filterMatch[1].split(' ')[0].trim();
          whereClause = ` WHERE "${c.sanitized}" LIKE '%${val}%'`;
        }
      }
    });

    const fieldsSql = selectFields.join(', ');
    const sqlToRun = `SELECT ${fieldsSql} FROM "${dataset.table_name}"${whereClause}${groupByClause}${orderByClause} LIMIT ${limit}`;

    // Execute query
    const results = await allQuery(sqlToRun);
    const executionTime = Date.now() - startTime;

    // Log to history
    await runQuery(
      'INSERT INTO query_history (user_id, dataset_id, query_text, status, execution_time_ms) VALUES (?, ?, ?, ?, ?)',
      [userId, dataset_id, `/* AI COPILOT */ ${sqlToRun}`, 'SUCCESS', executionTime]
    );

    // Suggest chart type
    let suggestedChart = 'none';
    if (results.length > 0) {
      const keys = Object.keys(results[0]);
      if (keys.length >= 2) {
        const isTemporal = keys.some(k => k.toLowerCase().includes('date') || k.toLowerCase().includes('time') || k.toLowerCase().includes('year'));
        if (isTemporal) {
          suggestedChart = 'line';
        } else if (keys.length === 2 && typeof results[0][keys[1]] === 'number') {
          suggestedChart = results.length <= 6 ? 'pie' : 'bar';
        } else {
          suggestedChart = 'bar';
        }
      }
    }

    res.json({
      success: true,
      sql: sqlToRun,
      headers: results.length > 0 ? Object.keys(results[0]) : [],
      rows: results,
      suggested_chart: suggestedChart,
      execution_time_ms: executionTime
    });

  } catch (err) {
    console.error('AI Copilot query error:', err);
    res.status(400).json({ error: `AI Copilot SQL compile failure: ${err.message}` });
  }
};
