const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/VIJESHVIJAYAN/Caveo_Sales/Caveo_sales_kra_sharepoint_master_q1_2026_27.xlsx');

// Full KRA_Targets sheet
const kraSheet = wb.Sheets['KRA_Targets'];
const kraData = XLSX.utils.sheet_to_json(kraSheet, { defval: '' });
console.log('=== KRA_Targets (all rows) ===');
console.log(JSON.stringify(kraData, null, 2));
