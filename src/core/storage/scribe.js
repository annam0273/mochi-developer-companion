import { browserAPI } from '../browser';

const SCRIBE_KEY = 'mochi_scribe_notebooks';
const SCRIBE_TRASH_KEY = 'mochi_scribe_trash';

export async function getNotebooks() {
  let result = null;
  try {
    const data = await browserAPI.storage.local.get([SCRIBE_KEY]);
    if (data && data[SCRIBE_KEY] && typeof data[SCRIBE_KEY] === 'object' && Object.keys(data[SCRIBE_KEY]).length > 0) {
      result = data[SCRIBE_KEY];
    }
  } catch (err) {
    console.warn('[Scribe Storage] Error getting notebooks from browserAPI.storage.local:', err);
  }

  // Fallback to localStorage if extension storage is empty or failed
  if (!result || Object.keys(result).length === 0) {
    try {
      const local = localStorage.getItem(SCRIBE_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed && typeof parsed === 'object') {
          result = parsed;
        }
      }
    } catch {}
  }

  return result || { global: [] };
}

export async function saveNotebooks(notebooks) {
  if (!notebooks || typeof notebooks !== 'object') return;
  try {
    await browserAPI.storage.local.set({ [SCRIBE_KEY]: notebooks });
  } catch (err) {
    console.warn('[Scribe Storage] Error saving notebooks to browserAPI.storage.local:', err);
  }
  try {
    localStorage.setItem(SCRIBE_KEY, JSON.stringify(notebooks));
  } catch (err) {}
}

export async function getTrash() {
  let result = null;
  try {
    const data = await browserAPI.storage.local.get([SCRIBE_TRASH_KEY]);
    if (data && Array.isArray(data[SCRIBE_TRASH_KEY]) && data[SCRIBE_TRASH_KEY].length > 0) {
      result = data[SCRIBE_TRASH_KEY];
    }
  } catch (err) {
    console.warn('[Scribe Storage] Error getting trash from browserAPI.storage.local:', err);
  }

  // Fallback to localStorage if extension storage is empty or failed
  if (!result || result.length === 0) {
    try {
      const local = localStorage.getItem(SCRIBE_TRASH_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          result = parsed;
        }
      }
    } catch {}
  }

  return result || [];
}

export async function saveTrash(trash) {
  if (!Array.isArray(trash)) return;
  try {
    await browserAPI.storage.local.set({ [SCRIBE_TRASH_KEY]: trash });
  } catch (err) {
    console.warn('[Scribe Storage] Error saving trash to browserAPI.storage.local:', err);
  }
  try {
    localStorage.setItem(SCRIBE_TRASH_KEY, JSON.stringify(trash));
  } catch (err) {}
}

