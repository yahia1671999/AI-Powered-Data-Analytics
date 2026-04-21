import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { DataRecord, ColumnMetadata } from '../types';

export async function parseFile(file: File): Promise<DataRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const data = e.target?.result;
      if (!data) return reject('No data found');

      if (file.name.endsWith('.csv')) {
        Papa.parse(data as string, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data as DataRecord[]),
          error: (err) => reject(err.message)
        });
      } else {
        const workbook = XLSX.read(data, { type: 'binary' });
        let allData: DataRecord[] = [];
        
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet) as DataRecord[];
          // Add sheet name to each row to distinguish data source
          const dataWithSheetName = json.map(row => ({ ...row, _sheetName: sheetName }));
          allData = [...allData, ...dataWithSheetName];
        });
        
        resolve(allData);
      }
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  });
}

export function analyzeColumns(data: DataRecord[]): ColumnMetadata[] {
  if (data.length === 0) return [];
  
  const firstRow = data[0];
  const columns: ColumnMetadata[] = [];
  
  // Use a sample for metadata analysis if the dataset is large
  const sampleSize = Math.min(data.length, 1000);
  const sampleData = data.slice(0, sampleSize);

  Object.keys(firstRow).forEach(key => {
    if (key === '_sheetName') return; // Skip internal field

    const val = firstRow[key];
    let type: ColumnMetadata['type'] = 'string';
    
    if (typeof val === 'number') type = 'number';
    else if (typeof val === 'boolean') type = 'boolean';
    else if (val instanceof Date || !isNaN(Date.parse(val))) {
      if (typeof val === 'string' && val.length > 5 && !isNaN(Date.parse(val))) {
         type = 'date';
      }
    }

    // Heuristic for categorical: string with relatively few unique values in the sample
    const uniqueValues = new Set(sampleData.map(row => row[key])).size;
    const isCategorical = type === 'string' && uniqueValues < sampleSize * 0.5 && uniqueValues < 30;

    columns.push({ name: key, type, isCategorical });
  });

  return columns;
}

export function generateDataSummary(data: DataRecord[], columns: ColumnMetadata[]): string {
  const summary: any = {
    totalRows: data.length,
    columns: columns.map(col => {
      const colData = data.map(r => r[col.name]).filter(v => v !== null && v !== undefined && v !== '');
      const nullCount = data.length - colData.length;
      
      if (col.type === 'number') {
        const nums = colData.map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
        if (nums.length === 0) return { name: col.name, type: 'number', nullCount };

        const sum = nums.reduce((a, b) => a + b, 0);
        const avg = sum / nums.length;
        const median = nums[Math.floor(nums.length / 2)];
        
        // Standard Deviation
        const squareDiffs = nums.map(n => Math.pow(n - avg, 2));
        const stdDev = Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / nums.length);

        return {
          name: col.name,
          type: 'number',
          min: nums[0],
          max: nums[nums.length - 1],
          avg: avg.toFixed(2),
          median: median.toFixed(2),
          stdDev: stdDev.toFixed(2),
          nullCount
        };
      } else if (col.isCategorical || col.type === 'string') {
        const counts: Record<string, number> = {};
        colData.forEach(v => {
          const s = String(v);
          counts[s] = (counts[s] || 0) + 1;
        });
        const sortedEntries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const topValues = sortedEntries
          .slice(0, 8)
          .map(([val, count]) => `${val} (${count} occurrences, ${((count/data.length)*100).toFixed(1)}%)`);
        
        return {
          name: col.name,
          type: col.isCategorical ? 'categorical' : 'string',
          uniqueCount: sortedEntries.length,
          topValues,
          nullCount
        };
      }
      return { name: col.name, type: col.type, nullCount };
    })
  };
  
  return JSON.stringify(summary, null, 2);
}
