import Papa from 'papaparse';
import * as XLSX from 'xlsx';

function parseNumber(val) {
  if (val === undefined || val === null || val === '') return 0;
  const num = parseFloat(String(val).replace(/[^0-9.\-]/g, ''));
  return isNaN(num) ? 0 : num;
}

// Build an ISO string that preserves the wall-clock value exactly as it
// appears in the MT5 report, regardless of the user's browser timezone.
// MT5 shows broker server time; we treat that string as the canonical
// timestamp and store it verbatim (no timezone conversion).
function wallClockIso(y, m, d, h, min, sec) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.000Z`;
}

function parseMT5Date(val) {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;

  // MT5 format: "2026.02.27 15:07:27"
  const match = str.match(/(\d{4})[.\-/](\d{2})[.\-/](\d{2})\s+(\d{2}):(\d{2}):?(\d{2})?/);
  if (match) {
    const [, y, m, day, h, min, sec] = match;
    return wallClockIso(+y, +m, +day, +h, +min, +(sec || 0));
  }

  // DD.MM.YYYY format
  const match2 = str.match(/(\d{2})[.\-/](\d{2})[.\-/](\d{4})\s+(\d{2}):(\d{2}):?(\d{2})?/);
  if (match2) {
    const [, day, m, y, h, min, sec] = match2;
    return wallClockIso(+y, +m, +day, +h, +min, +(sec || 0));
  }

  // Fallback: try native parse then strip timezone by reading UTC fields.
  // This keeps the wall-clock semantics consistent even for edge formats.
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return wallClockIso(
      d.getUTCFullYear(),
      d.getUTCMonth() + 1,
      d.getUTCDate(),
      d.getUTCHours(),
      d.getUTCMinutes(),
      d.getUTCSeconds(),
    );
  }

  return null;
}

// Extract account metadata from the top rows of MT5 report
function extractMetadata(allRows) {
  const meta = { accountName: '', accountNumber: '', company: '', startingBalance: 0, balanceOperations: [] };
  for (let i = 0; i < Math.min(6, allRows.length); i++) {
    const label = String(allRows[i]?.[0] || '').trim().toLowerCase();
    const value = String(allRows[i]?.[3] || '').trim();
    if (label.startsWith('name')) meta.accountName = value;
    else if (label.startsWith('account')) meta.accountNumber = value;
    else if (label.startsWith('company')) meta.company = value;
  }

  // Extract ALL balance operations from Deals section (deposits, withdrawals, transfers)
  for (let i = 0; i < allRows.length; i++) {
    if (String(allRows[i]?.[0]).trim().toLowerCase() === 'deals') {
      // Scan all rows in Deals for "balance" type entries
      for (let j = i + 2; j < allRows.length; j++) {
        const firstCell = String(allRows[j]?.[0] || '').trim().toLowerCase();
        // Stop at next section
        if (firstCell === 'open positions' || firstCell === 'working orders' || firstCell === 'results' || firstCell === '') {
          if (firstCell !== '') break;
          continue;
        }

        const type = String(allRows[j]?.[3] || '').trim().toLowerCase();
        if (type === 'balance') {
          const time = parseMT5Date(allRows[j]?.[0]);
          const amount = parseNumber(allRows[j]?.[11]); // Profit column = deposit/withdrawal amount
          const balanceAfter = parseNumber(allRows[j]?.[12]); // Balance column = running balance
          const comment = String(allRows[j]?.[13] || '').trim();

          meta.balanceOperations.push({ time, amount, balanceAfter, comment });

          // First balance entry = starting balance
          if (meta.startingBalance === 0 && balanceAfter > 0) {
            meta.startingBalance = balanceAfter;
          }
        }
      }
      break;
    }
  }

  return meta;
}

// Handle MT5's raw array format (header row has duplicate column names)
function processRawRows(allRows) {
  // Find header row - look for row containing "Time" and "Symbol" and "Profit"
  let headerIdx = -1;
  for (let i = 0; i < Math.min(20, allRows.length); i++) {
    const row = allRows[i].map((c) => String(c).toLowerCase().trim());
    if (row.includes('time') && (row.includes('symbol') || row.includes('profit'))) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) return { trades: null, meta: null };

  const meta = extractMetadata(allRows);

  const headerRow = allRows[headerIdx].map((c) => String(c).trim());

  // Build unique headers for duplicate names (Time, Price appear twice)
  const uniqueHeaders = [];
  const seen = {};
  for (const h of headerRow) {
    if (!h) { uniqueHeaders.push(''); continue; }
    if (seen[h]) {
      uniqueHeaders.push(h + '_close');
    } else {
      uniqueHeaders.push(h);
      seen[h] = true;
    }
  }

  // Map to our internal field names
  const FIELD_MAP = {
    'Time': 'openTime',
    'Time_close': 'closeTime',
    'Position': 'ticket',
    'Deal': 'ticket',
    'Order': 'ticket',
    'Symbol': 'symbol',
    'Type': 'type',
    'Volume': 'volume',
    'Price': 'openPrice',
    'Price_close': 'closePrice',
    'S / L': 'sl',
    'S/L': 'sl',
    'T / P': 'tp',
    'T/P': 'tp',
    'Commission': 'commission',
    'Swap': 'swap',
    'Profit': 'profit',
    'Comment': 'comment',
  };

  const trades = [];

  for (let i = headerIdx + 1; i < allRows.length; i++) {
    const row = allRows[i];
    if (!row || row.length === 0) continue;

    // Stop at section breaks (MT5 reports have: Positions, Orders, Deals, Open Positions, etc.)
    const firstCell = String(row[0] || '').trim().toLowerCase();
    if (!firstCell) continue;
    const SECTION_HEADERS = ['orders', 'deals', 'open positions', 'working orders', 'results',
      'balance:', 'credit facility:', 'floating p/l:', 'equity:', 'margin:'];
    if (SECTION_HEADERS.some((s) => firstCell === s || firstCell.startsWith(s))) {
      break;
    }
    // Skip summary rows at the bottom
    if (firstCell.includes('profit factor') || firstCell.includes('total trades') ||
        firstCell.includes('recovery') || firstCell.includes('sharpe') ||
        firstCell.includes('balance drawdown') || firstCell.includes('largest') ||
        firstCell.includes('average') || firstCell.includes('maximum') ||
        firstCell.includes('maximal')) {
      continue;
    }

    // Must have a valid date in the first column
    const dateVal = parseMT5Date(row[0]);
    if (!dateVal) continue;

    const trade = {};
    for (let j = 0; j < uniqueHeaders.length; j++) {
      const header = uniqueHeaders[j];
      if (!header) continue;
      const field = FIELD_MAP[header];
      if (!field) continue;

      const val = row[j];
      if (['openTime', 'closeTime'].includes(field)) {
        trade[field] = parseMT5Date(val);
      } else if (['volume', 'openPrice', 'closePrice', 'commission', 'swap', 'profit', 'sl', 'tp'].includes(field)) {
        trade[field] = parseNumber(val);
      } else {
        trade[field] = val != null ? String(val).trim() : '';
      }
    }

    // Skip non-trade rows
    const type = (trade.type || '').toLowerCase();
    if (type === 'balance' || type === 'credit' || type === 'deposit' || type === 'withdrawal') {
      continue;
    }

    if (trade.openTime || trade.profit !== undefined) {
      trades.push(trade);
    }
  }

  return { trades, meta };
}

// Handle CSV / named-column format
function processNamedRows(rows) {
  if (!rows || rows.length === 0) return [];

  const COLUMN_MAP = {
    'ticket': 'ticket', 'order': 'ticket', 'deal': 'ticket', 'position': 'ticket',
    'open time': 'openTime', 'time': 'openTime', 'open date': 'openTime',
    'close time': 'closeTime', 'close date': 'closeTime',
    'type': 'type', 'action': 'type',
    'symbol': 'symbol', 'instrument': 'symbol',
    'volume': 'volume', 'size': 'volume', 'lots': 'volume', 'lot': 'volume',
    'open price': 'openPrice', 'price': 'openPrice',
    'close price': 'closePrice',
    's/l': 'sl', 'sl': 'sl', 'stop loss': 'sl', 's / l': 'sl',
    't/p': 'tp', 'tp': 'tp', 'take profit': 'tp', 't / p': 'tp',
    'commission': 'commission', 'swap': 'swap',
    'profit': 'profit', 'net profit': 'profit',
    'comment': 'comment', 'pips': 'pips',
  };

  const headers = Object.keys(rows[0]);
  const colMapping = {};
  headers.forEach((h) => {
    const normalized = h.trim().toLowerCase();
    if (COLUMN_MAP[normalized]) {
      colMapping[h] = COLUMN_MAP[normalized];
    }
  });

  if (Object.keys(colMapping).length === 0) {
    throw new Error('Could not identify any MT5 columns. Please check the file format.');
  }

  const trades = [];
  for (const row of rows) {
    const trade = {};
    for (const [originalCol, field] of Object.entries(colMapping)) {
      const val = row[originalCol];
      if (['openTime', 'closeTime'].includes(field)) {
        trade[field] = parseMT5Date(val);
      } else if (['volume', 'openPrice', 'closePrice', 'commission', 'swap', 'profit', 'pips', 'sl', 'tp'].includes(field)) {
        trade[field] = parseNumber(val);
      } else {
        trade[field] = val != null ? String(val).trim() : '';
      }
    }

    const type = (trade.type || '').toLowerCase();
    if (type === 'balance' || type === 'credit' || type === 'deposit' || type === 'withdrawal') continue;
    if (trade.profit !== undefined || trade.openTime) trades.push(trade);
  }

  return trades;
}

export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const trades = processNamedRows(results.data);
          resolve({ trades, meta: null });
        } catch (e) {
          reject(e);
        }
      },
      error: reject,
    });
  });
}

export function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: false });

        let allTrades = [];
        let fileMeta = null;
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];

          // First try raw array format (handles duplicate headers like MT5 reports)
          const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '', header: 1 });
          const result = processRawRows(rawRows);

          if (result.trades && result.trades.length > 0) {
            allTrades = allTrades.concat(result.trades);
            if (result.meta) fileMeta = result.meta;
          } else {
            // Fallback to named column format
            const namedRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
            const namedTrades = processNamedRows(namedRows);
            allTrades = allTrades.concat(namedTrades);
          }
        }

        if (allTrades.length === 0) {
          reject(new Error('No trades found in the file. Check if the format is correct.'));
        } else {
          resolve({ trades: allTrades, meta: fileMeta });
        }
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function parseFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    return parseCSV(file);
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return parseExcel(file);
  }
  return Promise.reject(new Error('Unsupported file type. Please upload CSV or Excel files.'));
}
