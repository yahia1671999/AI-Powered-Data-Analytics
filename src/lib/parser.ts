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

  Object.keys(firstRow).forEach(key => {
    const val = firstRow[key];
    let type: ColumnMetadata['type'] = 'string';
    
    if (typeof val === 'number') type = 'number';
    else if (typeof val === 'boolean') type = 'boolean';
    else if (val instanceof Date || !isNaN(Date.parse(val))) {
      // Check if it's a date string
      if (typeof val === 'string' && val.length > 5 && !isNaN(Date.parse(val))) {
         type = 'date';
      }
    }

    // Heuristic for categorical: string with relatively few unique values
    const uniqueValues = new Set(data.map(row => row[key])).size;
    const isCategorical = type === 'string' && uniqueValues < data.length * 0.5 && uniqueValues < 20;

    columns.push({ name: key, type, isCategorical });
  });

  return columns;
}
