const fs = require('fs');
const csv = require('csv-parser');

// Helper to infer SQL data type from string values
function inferType(val) {
  if (val === null || val === undefined || val === '') return 'TEXT';
  
  // Try integer
  if (/^-?\d+$/.test(val)) {
    // Avoid marking leading zero numbers as integers (except 0 itself)
    if (val.length > 1 && val[0] === '0') return 'TEXT';
    return 'INTEGER';
  }
  
  // Try real (float)
  if (/^-?\d*\.\d+$/.test(val)) {
    return 'REAL';
  }
  
  return 'TEXT';
}

function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        if (results.length === 0) {
          return reject(new Error('CSV file is empty'));
        }
        
        const headers = Object.keys(results[0]);
        // Determine types by inspecting the first 50 rows
        const columnTypes = {};
        headers.forEach(header => {
          let determinedType = 'INTEGER'; // Start optimistic
          for (let i = 0; i < Math.min(results.length, 50); i++) {
            const val = results[i][header];
            if (val === undefined || val === null || val === '') continue;
            const currentType = inferType(val);
            if (currentType === 'TEXT') {
              determinedType = 'TEXT';
              break;
            } else if (currentType === 'REAL' && determinedType === 'INTEGER') {
              determinedType = 'REAL';
            }
          }
          columnTypes[header] = determinedType;
        });

        resolve({ headers, rows: results, columnTypes });
      })
      .on('error', (err) => reject(err));
  });
}

function parseJSON(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) return reject(err);
      try {
        const results = JSON.parse(data);
        const jsonArray = Array.isArray(results) ? results : [results];
        
        if (jsonArray.length === 0) {
          return reject(new Error('JSON file is empty'));
        }

        // Get union of all keys across objects to handle sparse objects
        const headers = Array.from(
          new Set(jsonArray.reduce((acc, obj) => acc.concat(Object.keys(obj)), []))
        );

        const columnTypes = {};
        headers.forEach(header => {
          let determinedType = 'INTEGER';
          for (let i = 0; i < Math.min(jsonArray.length, 50); i++) {
            const val = jsonArray[i][header];
            if (val === undefined || val === null || val === '') continue;
            const currentType = inferType(String(val));
            if (currentType === 'TEXT') {
              determinedType = 'TEXT';
              break;
            } else if (currentType === 'REAL' && determinedType === 'INTEGER') {
              determinedType = 'REAL';
            }
          }
          columnTypes[header] = determinedType;
        });

        // Normalize rows to strings/numbers
        const normalizedRows = jsonArray.map(obj => {
          const rowObj = {};
          headers.forEach(header => {
            rowObj[header] = obj[header] !== undefined ? String(obj[header]) : '';
          });
          return rowObj;
        });

        resolve({ headers, rows: normalizedRows, columnTypes });
      } catch (parseErr) {
        reject(parseErr);
      }
    });
  });
}

module.exports = {
  parseCSV,
  parseJSON
};
