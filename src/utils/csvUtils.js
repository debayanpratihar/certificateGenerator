import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export const validateCSV = async (file) => new Promise((resolve) => {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'csv') Papa.parse(file, { header: true, preview: 1, complete: (r) => resolve({ valid: !r.errors.length, error: r.errors[0]?.message }), error: () => resolve({ valid: false, error: 'Parse error' }) });
  else if (['xlsx', 'xls'].includes(ext)) resolve({ valid: true });
  else resolve({ valid: false, error: 'Invalid file type' });
});

export const processCSV = async (file) => new Promise((resolve, reject) => {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'csv') Papa.parse(file, { header: true, complete: (r) => resolve({ headers: r.meta.fields || [], data: r.data.filter(row => Object.values(row).some(v => v)) }), error: reject });
  else {
    const reader = new FileReader();
    reader.onload = (e) => {
      const workbook = XLSX.read(e.target.result, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);
      resolve({ headers: Object.keys(json[0] || {}), data: json });
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  }
});