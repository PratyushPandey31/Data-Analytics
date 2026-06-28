const fs = require('fs');
const path = require('path');
const { db, runQuery, allQuery, getQuery } = require('../database/db');
const { parseCSV, parseJSON } = require('../utils/dataParser');

// Clean column names to be SQLite safe
function sanitizeColumnName(name) {
  let cleaned = name.trim()
    .replace(/[^a-zA-Z0-9_]/g, '_') // Replace non-alphanumeric with _
    .replace(/^(\d)/, '_$1'); // Prefix with _ if starts with number
  return cleaned || 'column_val';
}

exports.uploadDataset = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, filename, path: filePath, size } = req.file;
    const ext = path.extname(originalname).toLowerCase();
    const userId = req.user.userId;

    let parseResult;
    try {
      if (ext === '.csv') {
        parseResult = await parseCSV(filePath);
      } else if (ext === '.json') {
        parseResult = await parseJSON(filePath);
      } else {
        fs.unlinkSync(filePath);
        return res.status(400).json({ error: 'Unsupported file format. Use CSV or JSON' });
      }
    } catch (parseErr) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: `Parsing error: ${parseErr.message}` });
    }

    const { headers, rows, columnTypes } = parseResult;
    const sanitizedHeaders = headers.map(sanitizeColumnName);

    // Ensure we don't have duplicate headers after sanitization
    const seen = new Set();
    const uniqueHeaders = [];
    sanitizedHeaders.forEach((h, idx) => {
      let finalH = h;
      let counter = 1;
      while (seen.has(finalH)) {
        finalH = `${h}_${counter}`;
        counter++;
      }
      seen.add(finalH);
      uniqueHeaders.push(finalH);
    });

    // Create unique table name: data_user_{userId}_{timestamp}
    const tableName = `data_user_${userId}_${Date.now()}`;

    // Create column SQL definition
    const columnDefinitions = uniqueHeaders.map((col, idx) => {
      const type = columnTypes[headers[idx]];
      return `"${col}" ${type}`;
    }).join(', ');

    const createTableSql = `CREATE TABLE "${tableName}" (id INTEGER PRIMARY KEY AUTOINCREMENT, ${columnDefinitions})`;

    // Run table creation
    await runQuery(createTableSql);

    // Insert rows in a transaction for extreme speed
    const insertHeaders = uniqueHeaders.map(h => `"${h}"`).join(', ');
    const placeholders = uniqueHeaders.map(() => '?').join(', ');
    const insertSql = `INSERT INTO "${tableName}" (${insertHeaders}) VALUES (${placeholders})`;

    // Process rows insertion
    await new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        const stmt = db.prepare(insertSql);
        
        try {
          rows.forEach((row) => {
            const values = headers.map(header => {
              const val = row[header];
              if (val === undefined || val === null || val === '') return null;
              
              // Cast numeric types
              const type = columnTypes[header];
              if (type === 'INTEGER') {
                return parseInt(val, 10);
              } else if (type === 'REAL') {
                return parseFloat(val);
              }
              return val;
            });
            stmt.run(values);
          });
          stmt.finalize();
          db.run('COMMIT', (err) => {
            if (err) reject(err);
            else resolve();
          });
        } catch (insertErr) {
          db.run('ROLLBACK');
          stmt.finalize();
          reject(insertErr);
        }
      });
    });

    // Map original headers to sanitized headers for frontend mapping
    const schemaMap = headers.reduce((acc, original, idx) => {
      acc[original] = {
        sanitized: uniqueHeaders[idx],
        type: columnTypes[original]
      };
      return acc;
    }, {});

    // Save dataset info in DB
    const datasetResult = await runQuery(
      `INSERT INTO datasets (user_id, filename, table_name, original_name, row_count, col_count, file_size, schema_json) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        filename,
        tableName,
        originalname,
        rows.length,
        headers.length,
        size,
        JSON.stringify(schemaMap)
      ]
    );

    res.status(201).json({
      message: 'Dataset uploaded and processed successfully',
      dataset: {
        id: datasetResult.id,
        original_name: originalname,
        table_name: tableName,
        row_count: rows.length,
        col_count: headers.length,
        file_size: size,
        schema: schemaMap
      }
    });

  } catch (err) {
    console.error('Dataset upload error:', err);
    res.status(500).json({ error: 'Internal server error during dataset processing' });
  }
};

exports.getDatasets = async (req, res) => {
  try {
    const userId = req.user.userId;
    const datasets = await allQuery(
      'SELECT id, original_name, table_name, row_count, col_count, file_size, schema_json, created_at FROM datasets WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    const formatted = datasets.map(d => ({
      ...d,
      schema: JSON.parse(d.schema_json)
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Get datasets error:', err);
    res.status(500).json({ error: 'Internal server error listing datasets' });
  }
};

exports.deleteDataset = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Check ownership
    const dataset = await getQuery('SELECT * FROM datasets WHERE id = ? AND user_id = ?', [id, userId]);
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found or unauthorized' });
    }

    // Drop table
    await runQuery(`DROP TABLE IF EXISTS "${dataset.table_name}"`);

    // Remove file if exists
    const filePath = path.join(__dirname, '..', '..', 'uploads', dataset.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete database entry
    await runQuery('DELETE FROM datasets WHERE id = ?', [id]);

    res.json({ message: 'Dataset deleted successfully' });
  } catch (err) {
    console.error('Delete dataset error:', err);
    res.status(500).json({ error: 'Internal server error deleting dataset' });
  }
};

exports.getDatasetDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const dataset = await getQuery('SELECT * FROM datasets WHERE id = ? AND user_id = ?', [id, userId]);
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    // Fetch sample data (first 200 rows)
    const rows = await allQuery(`SELECT * FROM "${dataset.table_name}" LIMIT 200`);

    res.json({
      dataset: {
        id: dataset.id,
        original_name: dataset.original_name,
        table_name: dataset.table_name,
        row_count: dataset.row_count,
        col_count: dataset.col_count,
        file_size: dataset.file_size,
        schema: JSON.parse(dataset.schema_json)
      },
      preview_rows: rows
    });
  } catch (err) {
    console.error('Get dataset details error:', err);
    res.status(500).json({ error: 'Internal server error fetching preview' });
  }
};

const { generateAll } = require('../utils/generateMockData');

exports.loadSamples = async (req, res) => {
  try {
    const userId = req.user.userId;
    const samplesDir = path.join(__dirname, '..', '..', 'samples');
    
    // Ensure samples are generated
    if (!fs.existsSync(samplesDir) || fs.readdirSync(samplesDir).length < 3) {
      generateAll();
    }

    const sampleFiles = [
      { name: 'Sales Performance Data', file: 'sales_data.csv' },
      { name: 'Customer K-Means Segments', file: 'customer_segments.csv' },
      { name: 'Server Telemetry Logs', file: 'server_telemetry.csv' }
    ];

    const loaded = [];

    for (const sample of sampleFiles) {
      const srcPath = path.join(samplesDir, sample.file);
      
      // Check if already loaded for this user
      const existing = await getQuery(
        'SELECT * FROM datasets WHERE user_id = ? AND original_name = ?', 
        [userId, sample.name]
      );
      
      if (existing) {
        loaded.push({
          id: existing.id,
          original_name: existing.original_name,
          table_name: existing.table_name,
          row_count: existing.row_count,
          col_count: existing.col_count
        });
        continue;
      }

      // Copy file to uploads
      const uniqueFilename = `sample-${Date.now()}-${sample.file}`;
      const destPath = path.join(__dirname, '..', '..', 'uploads', uniqueFilename);
      fs.copyFileSync(srcPath, destPath);
      const stat = fs.statSync(destPath);

      // Parse and load
      const parseResult = await parseCSV(destPath);
      const { headers, rows, columnTypes } = parseResult;
      const sanitizedHeaders = headers.map(sanitizeColumnName);

      // Deduplicate headers
      const seen = new Set();
      const uniqueHeaders = [];
      sanitizedHeaders.forEach((h, idx) => {
        let finalH = h;
        let counter = 1;
        while (seen.has(finalH)) {
          finalH = `${h}_${counter}`;
          counter++;
        }
        seen.add(finalH);
        uniqueHeaders.push(finalH);
      });

      const tableName = `data_user_${userId}_sample_${path.basename(sample.file, '.csv')}_${Date.now()}`;
      const columnDefinitions = uniqueHeaders.map((col, idx) => {
        const type = columnTypes[headers[idx]];
        return `"${col}" ${type}`;
      }).join(', ');

      const createTableSql = `CREATE TABLE "${tableName}" (id INTEGER PRIMARY KEY AUTOINCREMENT, ${columnDefinitions})`;
      await runQuery(createTableSql);

      const insertHeaders = uniqueHeaders.map(h => `"${h}"`).join(', ');
      const placeholders = uniqueHeaders.map(() => '?').join(', ');
      const insertSql = `INSERT INTO "${tableName}" (${insertHeaders}) VALUES (${placeholders})`;

      await new Promise((resolve, reject) => {
        db.serialize(() => {
          db.run('BEGIN TRANSACTION');
          const stmt = db.prepare(insertSql);
          try {
            rows.forEach((row) => {
              const values = headers.map(header => {
                const val = row[header];
                if (val === undefined || val === null || val === '') return null;
                const type = columnTypes[header];
                if (type === 'INTEGER') return parseInt(val, 10);
                if (type === 'REAL') return parseFloat(val);
                return val;
              });
              stmt.run(values);
            });
            stmt.finalize();
            db.run('COMMIT', (err) => {
              if (err) reject(err);
              else resolve();
            });
          } catch (err) {
            db.run('ROLLBACK');
            stmt.finalize();
            reject(err);
          }
        });
      });

      const schemaMap = headers.reduce((acc, original, idx) => {
        acc[original] = {
          sanitized: uniqueHeaders[idx],
          type: columnTypes[original]
        };
        return acc;
      }, {});

      const datasetResult = await runQuery(
        `INSERT INTO datasets (user_id, filename, table_name, original_name, row_count, col_count, file_size, schema_json) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, uniqueFilename, tableName, sample.name, rows.length, headers.length, stat.size, JSON.stringify(schemaMap)]
      );

      loaded.push({
        id: datasetResult.id,
        user_id: userId,
        filename: uniqueFilename,
        table_name: tableName,
        original_name: sample.name,
        row_count: rows.length,
        col_count: headers.length,
        file_size: stat.size,
        schema: schemaMap
      });
    }

    res.json({
      message: 'Demo datasets loaded successfully',
      datasets: loaded
    });

  } catch (err) {
    console.error('Load samples error:', err);
    res.status(500).json({ error: 'Internal server error loading sample datasets' });
  }
};

exports.cleanDataset = async (req, res) => {
  const { dataset_id, operation, column, strategy, custom_value, threshold } = req.body;
  const userId = req.user.userId;

  if (!dataset_id || !operation) {
    return res.status(400).json({ error: 'dataset_id and operation are required' });
  }

  try {
    // 1. Verify dataset ownership
    const dataset = await getQuery('SELECT * FROM datasets WHERE id = ? AND user_id = ?', [dataset_id, userId]);
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found or unauthorized' });
    }

    const tableName = dataset.table_name;
    let schemaMap = JSON.parse(dataset.schema_json);
    let rowCount = dataset.row_count;
    let colCount = dataset.col_count;

    // Check if column exists in schema
    let dbCol = '';
    if (column && schemaMap[column]) {
      dbCol = schemaMap[column].sanitized;
    }

    if (operation === 'drop_column') {
      if (!column || !dbCol) {
        return res.status(400).json({ error: 'Valid column name is required to drop' });
      }

      // Drop column in SQLite
      await runQuery(`ALTER TABLE "${tableName}" DROP COLUMN "${dbCol}"`);

      // Update schema metadata
      delete schemaMap[column];
      colCount = Object.keys(schemaMap).length;

      await runQuery(
        'UPDATE datasets SET schema_json = ?, col_count = ? WHERE id = ?',
        [JSON.stringify(schemaMap), colCount, dataset_id]
      );

      return res.json({
        message: `Column "${column}" successfully dropped`,
        dataset: { id: dataset_id, col_count: colCount, schema: schemaMap }
      });
    }

    if (operation === 'fill_nulls') {
      if (!column || !dbCol) {
        return res.status(400).json({ error: 'Column is required to fill null values' });
      }

      let fillVal = null;
      const type = schemaMap[column].type;

      if (strategy === 'mean' || strategy === 'median') {
        const rows = await allQuery(`SELECT "${dbCol}" as val FROM "${tableName}" WHERE "${dbCol}" IS NOT NULL`);
        const values = rows.map(r => parseFloat(r.val)).filter(v => !isNaN(v));

        if (values.length === 0) {
          return res.status(400).json({ error: 'No numerical records present to compute imputation stats' });
        }

        if (strategy === 'mean') {
          const sum = values.reduce((a, b) => a + b, 0);
          fillVal = sum / values.length;
        } else {
          const sorted = [...values].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          fillVal = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        }
      } else if (strategy === 'custom') {
        if (custom_value === undefined || custom_value === '') {
          return res.status(400).json({ error: 'custom_value is required for custom strategy' });
        }
        fillVal = type === 'INTEGER' ? parseInt(custom_value, 10) : type === 'REAL' ? parseFloat(custom_value) : custom_value;
      } else {
        return res.status(400).json({ error: 'Invalid imputation strategy' });
      }

      // Execute UPDATE
      await runQuery(`UPDATE "${tableName}" SET "${dbCol}" = ? WHERE "${dbCol}" IS NULL`, [fillVal]);

      return res.json({
        message: `Null values in column "${column}" filled with ${strategy} value (${fillVal})`,
        fill_value: fillVal
      });
    }

    if (operation === 'remove_outliers') {
      if (!column || !dbCol) {
        return res.status(400).json({ error: 'Column is required to scan outliers' });
      }

      const zThresh = parseFloat(threshold) || 2.0;

      // Fetch column stats
      const statsRows = await allQuery(`SELECT "${dbCol}" as val FROM "${tableName}" WHERE "${dbCol}" IS NOT NULL`);
      const values = statsRows.map(r => parseFloat(r.val)).filter(v => !isNaN(v));

      if (values.length === 0) {
        return res.status(400).json({ error: 'No numerical values to calculate outliers' });
      }

      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev === 0) {
        return res.status(400).json({ error: 'Standard deviation is zero; cannot isolate outliers' });
      }

      // Run DELETE
      const deleteResult = await runQuery(
        `DELETE FROM "${tableName}" WHERE ABS(("${dbCol}" - ?) / ?) > ?`,
        [mean, stdDev, zThresh]
      );

      // Re-count rows
      const countRow = await getQuery(`SELECT COUNT(*) as cnt FROM "${tableName}"`);
      rowCount = countRow.cnt;

      await runQuery(
        'UPDATE datasets SET row_count = ? WHERE id = ?',
        [rowCount, dataset_id]
      );

      return res.json({
        message: `Outlier rows successfully removed. Deleted ${deleteResult.changes} rows.`,
        deleted_count: deleteResult.changes,
        new_row_count: rowCount
      });
    }

    res.status(400).json({ error: 'Unsupported cleaning operation' });

  } catch (err) {
    console.error('Clean dataset error:', err);
    res.status(500).json({ error: `Imputation/refining failure: ${err.message}` });
  }
};


