const { allQuery, getQuery } = require('../database/db');
const { 
  getPearsonCorrelation, 
  calculateLinearRegression, 
  performKMeans, 
  detectOutliers 
} = require('../utils/statUtils');

// Helper to check if a column is numeric based on schema
function isNumeric(type) {
  return type === 'INTEGER' || type === 'REAL';
}

exports.getCorrelationMatrix = async (req, res) => {
  try {
    const { dataset_id } = req.body;
    const userId = req.user.userId;

    const dataset = await getQuery('SELECT * FROM datasets WHERE id = ? AND user_id = ?', [dataset_id, userId]);
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found or unauthorized' });
    }

    const schema = JSON.parse(dataset.schema_json);
    const numericCols = Object.keys(schema).filter(col => isNumeric(schema[col].type));

    if (numericCols.length < 2) {
      return res.status(400).json({ error: 'At least 2 numerical columns are required for correlation matrix' });
    }

    // Select only numeric columns
    const dbCols = numericCols.map(col => `"${schema[col].sanitized}"`).join(', ');
    const rows = await allQuery(`SELECT ${dbCols} FROM "${dataset.table_name}"`);

    // Prepare arrays of values for correlation
    const columnData = {};
    numericCols.forEach(col => {
      const dbCol = schema[col].sanitized;
      columnData[col] = rows.map(r => r[dbCol]);
    });

    // Compute matrix
    const matrix = [];
    for (let i = 0; i < numericCols.length; i++) {
      const rowCorr = [];
      for (let j = 0; j < numericCols.length; j++) {
        if (i === j) {
          rowCorr.push(1.0);
        } else {
          const r = getPearsonCorrelation(columnData[numericCols[i]], columnData[numericCols[j]]);
          rowCorr.push(parseFloat(r.toFixed(4)));
        }
      }
      matrix.push(rowCorr);
    }

    res.json({
      columns: numericCols,
      matrix
    });

  } catch (err) {
    console.error('Correlation matrix calculation error:', err);
    res.status(500).json({ error: 'Internal server error calculating correlation matrix' });
  }
};

exports.getRegression = async (req, res) => {
  try {
    const { dataset_id, col_x, col_y } = req.body;
    const userId = req.user.userId;

    const dataset = await getQuery('SELECT * FROM datasets WHERE id = ? AND user_id = ?', [dataset_id, userId]);
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found or unauthorized' });
    }

    const schema = JSON.parse(dataset.schema_json);
    const dbColX = schema[col_x]?.sanitized;
    const dbColY = schema[col_y]?.sanitized;

    if (!dbColX || !dbColY) {
      return res.status(400).json({ error: 'Invalid column selections' });
    }

    // Fetch data
    const rows = await allQuery(`SELECT "${dbColX}" as x, "${dbColY}" as y FROM "${dataset.table_name}" WHERE x IS NOT NULL AND y IS NOT NULL`);
    
    const xVals = rows.map(r => r.x);
    const yVals = rows.map(r => r.y);

    const stats = calculateLinearRegression(xVals, yVals);

    // Downsample points for scatter plot visual performance (limit to 400 points)
    let scatterPoints = rows.map(r => ({ x: r.x, y: r.y }));
    if (scatterPoints.length > 400) {
      const step = Math.ceil(scatterPoints.length / 400);
      scatterPoints = scatterPoints.filter((_, idx) => idx % step === 0);
    }

    res.json({
      ...stats,
      scatterPoints
    });

  } catch (err) {
    console.error('Regression error:', err);
    res.status(500).json({ error: 'Internal server error running linear regression' });
  }
};

exports.getKMeans = async (req, res) => {
  try {
    const { dataset_id, columns, k } = req.body;
    const userId = req.user.userId;

    const dataset = await getQuery('SELECT * FROM datasets WHERE id = ? AND user_id = ?', [dataset_id, userId]);
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found or unauthorized' });
    }

    if (!columns || !Array.isArray(columns) || columns.length < 2) {
      return res.status(400).json({ error: 'Please select at least 2 numerical columns for clustering' });
    }

    const kVal = parseInt(k, 10) || 3;
    if (kVal < 2 || kVal > 8) {
      return res.status(400).json({ error: 'Number of clusters k must be between 2 and 8' });
    }

    const schema = JSON.parse(dataset.schema_json);
    const dbCols = columns.map(col => {
      const sanitized = schema[col]?.sanitized;
      if (!sanitized) throw new Error(`Column ${col} not found in dataset schema`);
      return `"${sanitized}" as "${sanitized}"`;
    });

    const dbQueryCols = columns.map(col => `"${schema[col].sanitized}"`).join(', ');

    // Fetch records
    const rows = await allQuery(`SELECT ${dbQueryCols} FROM "${dataset.table_name}"`);

    // Construct data points: [{ [col1]: val1, [col2]: val2 }]
    const dataPoints = rows.map(r => {
      const obj = {};
      columns.forEach(col => {
        const sanitized = schema[col].sanitized;
        obj[col] = parseFloat(r[sanitized]);
      });
      return obj;
    }).filter(p => {
      // Ensure all features are numerical
      return columns.every(col => !isNaN(p[col]));
    });

    if (dataPoints.length < kVal) {
      return res.status(400).json({ error: 'Not enough valid numerical records for clustering' });
    }

    const clusterResults = performKMeans(dataPoints, kVal);

    // Downsample points for scatter plot visual performance (limit to 400 points)
    let points = dataPoints.map((p, idx) => ({
      x: p[columns[0]],
      y: p[columns[1]],
      cluster: clusterResults.assignments[idx]
    }));

    if (points.length > 400) {
      const step = Math.ceil(points.length / 400);
      points = points.filter((_, idx) => idx % step === 0);
    }

    // Format centroids to match X and Y columns
    const centroids = clusterResults.centroids.map(c => ({
      x: c[columns[0]],
      y: c[columns[1]]
    }));

    res.json({
      centroids,
      points,
      iterations: clusterResults.iterations,
      k: kVal,
      columns
    });

  } catch (err) {
    console.error('KMeans clustering error:', err);
    res.status(500).json({ error: `Internal server error performing clustering: ${err.message}` });
  }
};

exports.getAnomalies = async (req, res) => {
  try {
    const { dataset_id, column, threshold } = req.body;
    const userId = req.user.userId;

    const dataset = await getQuery('SELECT * FROM datasets WHERE id = ? AND user_id = ?', [dataset_id, userId]);
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found or unauthorized' });
    }

    const schema = JSON.parse(dataset.schema_json);
    const dbCol = schema[column]?.sanitized;

    if (!dbCol) {
      return res.status(400).json({ error: 'Selected column does not exist' });
    }

    const zThresh = parseFloat(threshold) || 2.0;

    // Fetch column data plus index/ID (we can fetch secondary values to make it interesting, or just return anomalous rows)
    const rows = await allQuery(`SELECT id, "${dbCol}" as val FROM "${dataset.table_name}"`);

    const values = rows.map(r => r.val);
    const anomalyResults = detectOutliers(values, zThresh);

    // Retrieve full rows of outliers (up to 100 outliers for presentation)
    const outlierIndices = anomalyResults.outliers.slice(0, 100).map(o => rows[o.index].id);
    
    let outlierRows = [];
    if (outlierIndices.length > 0) {
      const placeholders = outlierIndices.map(() => '?').join(', ');
      outlierRows = await allQuery(`SELECT * FROM "${dataset.table_name}" WHERE id IN (${placeholders})`, outlierIndices);
      
      // Attach Z-scores
      outlierRows = outlierRows.map(row => {
        const item = rows.find(r => r.id === row.id);
        const idx = rows.indexOf(item);
        return {
          ...row,
          _zScore: parseFloat(anomalyResults.zScores[idx].toFixed(3))
        };
      });
    }

    // Generate distributions of standard points for histogram
    let valuesDist = rows.map(r => parseFloat(r.val)).filter(v => !isNaN(v));
    if (valuesDist.length > 500) {
      const step = Math.ceil(valuesDist.length / 500);
      valuesDist = valuesDist.filter((_, idx) => idx % step === 0);
    }

    res.json({
      mean: parseFloat(anomalyResults.mean.toFixed(4)),
      stdDev: parseFloat(anomalyResults.stdDev.toFixed(4)),
      totalAnomalies: anomalyResults.outliers.length,
      outlierRows,
      values: valuesDist,
      column
    });

  } catch (err) {
    console.error('Anomaly detection error:', err);
    res.status(500).json({ error: 'Internal server error detecting anomalies' });
  }
};
