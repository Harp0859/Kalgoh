import Dexie from 'dexie';

export const db = new Dexie('KalgohTradingDB');

db.version(2).stores({
  trades: '++id, ticket, openTime, closeTime, type, symbol, volume, openPrice, closePrice, commission, swap, profit, comment, uploadBatch, account',
  uploads: '++id, fileName, uploadedAt, tradeCount, accountName',
});

export async function saveTrades(trades, fileName, meta) {
  const uploadBatch = Date.now();
  const accountName = meta?.accountName || fileName.replace(/\.[^.]+$/, '');

  const upload = await db.uploads.add({
    fileName,
    uploadedAt: new Date().toISOString(),
    tradeCount: trades.length,
    accountName,
  });

  const tradesWithBatch = trades.map((t) => ({
    ...t,
    uploadBatch,
    uploadId: upload,
    account: accountName,
  }));

  await db.trades.bulkAdd(tradesWithBatch);
  return upload;
}

export async function getAccounts() {
  const uploads = await db.uploads.toArray();
  const accounts = [...new Set(uploads.map((u) => u.accountName).filter(Boolean))];
  return accounts.sort();
}

export async function getAllTrades() {
  return db.trades.toArray();
}

export async function getUploads() {
  return db.uploads.reverse().toArray();
}

export async function deleteUpload(uploadId) {
  const upload = await db.uploads.get(uploadId);
  if (!upload) return;
  await db.trades.where('uploadId').equals(uploadId).delete();
  await db.uploads.delete(uploadId);
}

export async function clearAllData() {
  await db.trades.clear();
  await db.uploads.clear();
}
