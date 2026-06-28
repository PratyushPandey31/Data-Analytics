// Pearson Correlation Coefficient calculation
function getPearsonCorrelation(x, y) {
  const n = x.length;
  if (n === 0 || n !== y.length) return 0;

  let sumX = 0, sumY = 0, sumXY = 0;
  let sumX2 = 0, sumY2 = 0;

  for (let i = 0; i < n; i++) {
    const xi = parseFloat(x[i]);
    const yi = parseFloat(y[i]);
    
    if (isNaN(xi) || isNaN(yi)) continue;

    sumX += xi;
    sumY += yi;
    sumXY += xi * yi;
    sumX2 += xi * xi;
    sumY2 += yi * yi;
  }

  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (den === 0) return 0;
  return num / den;
}

// Linear Regression: y = mx + c
function calculateLinearRegression(x, y) {
  const n = x.length;
  if (n === 0 || n !== y.length) {
    return { slope: 0, intercept: 0, r2: 0, points: [] };
  }

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  let validCount = 0;
  const validX = [];
  const validY = [];

  for (let i = 0; i < n; i++) {
    const xi = parseFloat(x[i]);
    const yi = parseFloat(y[i]);

    if (isNaN(xi) || isNaN(yi)) continue;

    validX.push(xi);
    validY.push(yi);
    sumX += xi;
    sumY += yi;
    sumXY += xi * yi;
    sumX2 += xi * xi;
    sumY2 += yi * yi;
    validCount++;
  }

  if (validCount < 2) {
    return { slope: 0, intercept: 0, r2: 0, points: [] };
  }

  const slope = (validCount * sumXY - sumX * sumY) / (validCount * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / validCount;

  // Calculate R-squared
  const meanY = sumY / validCount;
  let ssTot = 0; // Total sum of squares
  let ssRes = 0; // Residual sum of squares

  for (let i = 0; i < validCount; i++) {
    const yi = validY[i];
    const fi = slope * validX[i] + intercept; // Predicted value
    ssTot += Math.pow(yi - meanY, 2);
    ssRes += Math.pow(yi - fi, 2);
  }

  const r2 = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);

  // Generate trend line boundary points
  const minX = Math.min(...validX);
  const maxX = Math.max(...validX);
  const trendPoints = [
    { x: minX, y: slope * minX + intercept },
    { x: maxX, y: slope * maxX + intercept }
  ];

  return {
    slope,
    intercept,
    r2,
    trendPoints,
    count: validCount
  };
}

// K-Means Clustering
function performKMeans(dataPoints, k, maxIterations = 100) {
  // dataPoints is an array of objects, e.g. [{x: 10, y: 20}, {x: 12, y: 19}]
  const n = dataPoints.length;
  if (n === 0 || k <= 0) return { centroids: [], assignments: [] };
  if (k > n) k = n;

  // Determine features (keys)
  const keys = Object.keys(dataPoints[0]);
  
  // 1. Min-max normalization values to prevent scale dominance
  const minMax = {};
  keys.forEach(key => {
    const values = dataPoints.map(p => p[key]);
    minMax[key] = {
      min: Math.min(...values),
      max: Math.max(...values)
    };
  });

  const normalize = (point) => {
    const norm = {};
    keys.forEach(key => {
      const { min, max } = minMax[key];
      const range = max - min;
      norm[key] = range === 0 ? 0 : (point[key] - min) / range;
    });
    return norm;
  };

  const normalizedPoints = dataPoints.map(normalize);

  // 2. Initialize centroids randomly from points
  let centroids = [];
  const indices = new Set();
  while (indices.size < k) {
    indices.add(Math.floor(Math.random() * n));
  }
  centroids = Array.from(indices).map(idx => ({ ...normalizedPoints[idx] }));

  let assignments = new Array(n).fill(-1);
  let changed = true;
  let iteration = 0;

  const distance = (p1, p2) => {
    return Math.sqrt(keys.reduce((sum, key) => sum + Math.pow(p1[key] - p2[key], 2), 0));
  };

  while (changed && iteration < maxIterations) {
    changed = false;
    iteration++;

    // Assign points to closest centroid
    for (let i = 0; i < n; i++) {
      let minDist = Infinity;
      let closestCentroid = -1;

      for (let c = 0; c < k; c++) {
        const d = distance(normalizedPoints[i], centroids[c]);
        if (d < minDist) {
          minDist = d;
          closestCentroid = c;
        }
      }

      if (assignments[i] !== closestCentroid) {
        assignments[i] = closestCentroid;
        changed = true;
      }
    }

    // Recalculate centroids
    const newCentroids = Array.from({ length: k }, () => {
      const obj = {};
      keys.forEach(key => obj[key] = 0);
      obj._count = 0;
      return obj;
    });

    for (let i = 0; i < n; i++) {
      const clusterIdx = assignments[i];
      keys.forEach(key => {
        newCentroids[clusterIdx][key] += normalizedPoints[i][key];
      });
      newCentroids[clusterIdx]._count++;
    }

    for (let c = 0; c < k; c++) {
      const count = newCentroids[c]._count;
      if (count > 0) {
        keys.forEach(key => {
          centroids[c][key] = newCentroids[c][key] / count;
        });
      } else {
        // Reinitialize empty cluster centroid to random point
        const randomIdx = Math.floor(Math.random() * n);
        centroids[c] = { ...normalizedPoints[randomIdx] };
      }
    }
  }

  // Denormalize centroids for presentation
  const denormalizedCentroids = centroids.map(c => {
    const denorm = {};
    keys.forEach(key => {
      const { min, max } = minMax[key];
      denorm[key] = c[key] * (max - min) + min;
    });
    return denorm;
  });

  return {
    centroids: denormalizedCentroids,
    assignments,
    iterations: iteration
  };
}

// Z-Score Outlier Detection
function detectOutliers(values, threshold = 2) {
  const n = values.length;
  if (n === 0) return { outliers: [], mean: 0, stdDev: 0 };

  const parsedValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
  const count = parsedValues.length;
  if (count === 0) return { outliers: [], mean: 0, stdDev: 0 };

  // Calculate mean
  const mean = parsedValues.reduce((sum, v) => sum + v, 0) / count;

  // Calculate variance
  const variance = parsedValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / count;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    return { outliers: [], mean, stdDev, zScores: new Array(n).fill(0) };
  }

  const zScores = values.map(v => {
    const parsed = parseFloat(v);
    if (isNaN(parsed)) return null;
    return (parsed - mean) / stdDev;
  });

  const outliers = [];
  zScores.forEach((z, idx) => {
    if (z !== null && Math.abs(z) > threshold) {
      outliers.push({
        index: idx,
        value: values[idx],
        zScore: z
      });
    }
  });

  return {
    mean,
    stdDev,
    outliers,
    zScores
  };
}

module.exports = {
  getPearsonCorrelation,
  calculateLinearRegression,
  performKMeans,
  detectOutliers
};
