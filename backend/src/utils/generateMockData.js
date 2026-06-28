const fs = require('fs');
const path = require('path');

const samplesDir = path.join(__dirname, '..', '..', 'samples');
if (!fs.existsSync(samplesDir)) {
  fs.mkdirSync(samplesDir, { recursive: true });
}

// 1. Sales Data
function generateSalesData() {
  const headers = ['Date', 'Segment', 'Region', 'Product', 'Sales', 'Quantity', 'Profit', 'Discount'];
  const segments = ['Consumer', 'Corporate', 'Home Office'];
  const regions = ['North', 'East', 'South', 'West'];
  const products = ['Smart Watch', 'Wireless Earbuds', 'Mechanical Keyboard', 'Ergonomic Mouse', '4K Monitor'];
  const basePrices = {
    'Smart Watch': 199.99,
    'Wireless Earbuds': 89.99,
    'Mechanical Keyboard': 129.99,
    'Ergonomic Mouse': 59.99,
    '4K Monitor': 349.99
  };

  const rows = [headers.join(',')];
  const startDate = new Date('2025-01-01');

  for (let i = 0; i < 200; i++) {
    const dateObj = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const date = dateObj.toISOString().split('T')[0];
    const segment = segments[Math.floor(Math.random() * segments.length)];
    const region = regions[Math.floor(Math.random() * regions.length)];
    const product = products[Math.floor(Math.random() * products.length)];
    
    const qty = Math.floor(Math.random() * 5) + 1;
    const discount = Math.random() < 0.3 ? parseFloat((Math.random() * 0.2).toFixed(2)) : 0;
    const unitPrice = basePrices[product];
    const sales = parseFloat((qty * unitPrice * (1 - discount)).toFixed(2));
    const cost = parseFloat((qty * unitPrice * 0.6).toFixed(2));
    const profit = parseFloat((sales - cost).toFixed(2));

    rows.push([date, segment, region, product, sales, qty, profit, discount].join(','));
  }

  fs.writeFileSync(path.join(samplesDir, 'sales_data.csv'), rows.join('\n'));
}

// 2. Customer Segments (K-Means candidate)
function generateCustomerSegments() {
  const headers = ['CustomerID', 'Age', 'Annual_Income_k', 'Spending_Score', 'Visits_Per_Month'];
  const rows = [headers.join(',')];

  // Generate clusters intentionally
  // Cluster 1: Young, Low Income, High Spending
  // Cluster 2: Middle-aged, High Income, High Spending
  // Cluster 3: Older, High Income, Low Spending
  // Cluster 4: General Average
  
  for (let i = 1; i <= 150; i++) {
    let age, income, spending, visits;
    const r = Math.random();

    if (r < 0.25) { // Cluster 1
      age = Math.floor(Math.random() * 10) + 18; // 18-28
      income = Math.floor(Math.random() * 20) + 15; // 15-35k
      spending = Math.floor(Math.random() * 30) + 70; // 70-100
      visits = Math.floor(Math.random() * 3) + 6; // 6-9 visits
    } else if (r < 0.5) { // Cluster 2
      age = Math.floor(Math.random() * 15) + 30; // 30-45
      income = Math.floor(Math.random() * 40) + 80; // 80-120k
      spending = Math.floor(Math.random() * 25) + 75; // 75-100
      visits = Math.floor(Math.random() * 4) + 5; // 5-8 visits
    } else if (r < 0.75) { // Cluster 3
      age = Math.floor(Math.random() * 25) + 45; // 45-70
      income = Math.floor(Math.random() * 50) + 75; // 75-125k
      spending = Math.floor(Math.random() * 20) + 10; // 10-30
      visits = Math.floor(Math.random() * 3) + 1; // 1-4 visits
    } else { // Cluster 4 (Standard/Random)
      age = Math.floor(Math.random() * 40) + 20; // 20-60
      income = Math.floor(Math.random() * 40) + 40; // 40-80k
      spending = Math.floor(Math.random() * 30) + 35; // 35-65
      visits = Math.floor(Math.random() * 3) + 2; // 2-5 visits
    }

    rows.push([1000 + i, age, income, spending, visits].join(','));
  }

  fs.writeFileSync(path.join(samplesDir, 'customer_segments.csv'), rows.join('\n'));
}

// 3. Server Telemetry (Anomaly detection candidate)
function generateServerTelemetry() {
  const headers = ['Timestamp', 'CPU_Utilization', 'Memory_Usage', 'Latency_ms', 'Requests_Per_Sec'];
  const rows = [headers.join(',')];
  const startTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

  for (let i = 0; i < 288; i++) { // 5-minute intervals
    const timestamp = new Date(startTime + i * 5 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
    
    // Normal fluctuations
    let cpu = parseFloat((Math.sin(i / 10) * 15 + 40 + Math.random() * 10).toFixed(2));
    let memory = parseFloat((55 + Math.random() * 5).toFixed(2));
    let latency = parseFloat((120 + Math.random() * 30).toFixed(2));
    let requests = Math.floor(Math.sin(i / 10) * 100 + 250 + Math.random() * 50);

    // Introduce artificial outliers/anomalies (e.g. server spikes)
    if (i === 42) { // CPU & Latency spike
      cpu = 98.4;
      latency = 1250.0;
      requests = 620;
    } else if (i === 115) { // Memory leak spike
      memory = 95.8;
      cpu = 88.2;
    } else if (i === 201) { // Latency spike due to DB lock
      latency = 2450.5;
      cpu = 15.2; // Idle wait
    }

    rows.push([timestamp, cpu, memory, latency, requests].join(','));
  }

  fs.writeFileSync(path.join(samplesDir, 'server_telemetry.csv'), rows.join('\n'));
}

function generateAll() {
  console.log('Generating sample CSV data files...');
  generateSalesData();
  generateCustomerSegments();
  generateServerTelemetry();
  console.log('Sample datasets generated in "samples/" directory.');
}

// Run if executed directly
if (require.main === module) {
  generateAll();
}

module.exports = { generateAll };
