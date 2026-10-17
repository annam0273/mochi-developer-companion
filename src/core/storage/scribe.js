import { browserAPI } from '../browser';

const SCRIBE_KEY = 'mochi_scribe_notebooks';
const SCRIBE_TRASH_KEY = 'mochi_scribe_trash';

export async function getNotebooks() {
  try {
    const data = await browserAPI.storage.local.get([SCRIBE_KEY]);
    return data[SCRIBE_KEY] || { global: '' };
  } catch {
    const local = localStorage.getItem(SCRIBE_KEY);
    return local ? JSON.parse(local) : { global: '' };
  }
}

export async function saveNotebooks(notebooks) {
  try {
    await browserAPI.storage.local.set({ [SCRIBE_KEY]: notebooks });
  } catch {
    localStorage.setItem(SCRIBE_KEY, JSON.stringify(notebooks));
  }
}

export async function getTrash() {
  try {
    const data = await browserAPI.storage.local.get([SCRIBE_TRASH_KEY]);
    return Array.isArray(data[SCRIBE_TRASH_KEY]) ? data[SCRIBE_TRASH_KEY] : [];
  } catch {
    const local = localStorage.getItem(SCRIBE_TRASH_KEY);
    return local ? JSON.parse(local) : [];
  }
}

export async function saveTrash(trash) {
  try {
    await browserAPI.storage.local.set({ [SCRIBE_TRASH_KEY]: trash });
  } catch {
    localStorage.setItem(SCRIBE_TRASH_KEY, JSON.stringify(trash));
  }
}

