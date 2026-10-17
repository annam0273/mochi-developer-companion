import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getNotebooks, saveNotebooks, getTrash, saveTrash } from '../../core/storage/scribe';
import './ScribePanel.css';

const HIGHLIGHT_COLORS = [
  { name: 'Warm Yellow', color: '#FFE066' },
  { name: 'Mint Green', color: '#B7EB8F' },
  { name: 'Sky Blue', color: '#91CAFF' },
  { name: 'Soft Pink', color: '#FFADD2' },
  { name: 'Peach Orange', color: '#FFD591' },
  { name: 'Lavender', color: '#D3ADF7' },
];

const TEXT_COLORS = [
  { name: 'Espresso (Default)', color: '#3C2B25' },
  { name: 'Rust Orange', color: '#E07A3F' },
  { name: 'Crimson Red', color: '#D9383A' },
  { name: 'Forest Green', color: '#2B8A3E' },
  { name: 'Ocean Blue', color: '#1971C2' },
  { name: 'Royal Purple', color: '#6741D9' },
];

export default function ScribePanel({ onClose, onDockChange }) {
  const savedCompose = (() => {
    try {
      const str = sessionStorage.getItem('nick_scribe_composing_state');
      if (str) {
        const parsed = JSON.parse(str);
        if (parsed && parsed.isComposing) return parsed;
      }
    } catch {}
    return null;
  })();

  const [notebooks, setNotebooks] = useState({ global: [] });
  const [trash, setTrash] = useState([]);
  const [activeTab, setActiveTab] = useState(() => savedCompose?.tab || window.location.hostname || 'global');
  const [newNoteTitle, setNewNoteTitle] = useState(() => savedCompose?.title || '');
  const [newNoteContent, setNewNoteContent] = useState(() => savedCompose?.content || '');
  const [editingNoteId, setEditingNoteId] = useState(() => savedCompose?.editingNoteId || null);
  const [isComposing, setIsComposing] = useState(() => Boolean(savedCompose?.isComposing));
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving'
  const autoSaveTimerRef = useRef(null);
  const isComposingRef = useRef(isComposing);
  isComposingRef.current = isComposing;
  const editingNoteIdRef = useRef(editingNoteId);
  editingNoteIdRef.current = editingNoteId;
  const newNoteTitleRef = useRef(newNoteTitle);
  newNoteTitleRef.current = newNoteTitle;
  const newNoteContentRef = useRef(newNoteContent);
  newNoteContentRef.current = newNoteContent;
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  // Undo & Redo History State
  const historyRef = useRef([{ title: savedCompose?.title || '', content: savedCompose?.content || '' }]);
  const historyIndexRef = useRef(0);
  const isUndoRedoingRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const typingTimerRef = useRef(null);

  const updateUndoRedoState = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  const pushHistorySnapshot = useCallback((title, content, forceImmediate = false) => {
    if (isUndoRedoingRef.current) return;

    const saveSnapshot = () => {
      const currentSnap = historyRef.current[historyIndexRef.current];
      if (currentSnap && currentSnap.title === title && currentSnap.content === content) {
        return;
      }

      const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
      nextHistory.push({ title, content });
      if (nextHistory.length > 50) {
        nextHistory.shift();
      }
      historyRef.current = nextHistory;
      historyIndexRef.current = nextHistory.length - 1;
      updateUndoRedoState();
    };

    if (forceImmediate) {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      saveSnapshot();
    } else {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(saveSnapshot, 350);
    }
  }, [updateUndoRedoState]);

  const initHistory = useCallback((title, content) => {
    historyRef.current = [{ title, content }];
    historyIndexRef.current = 0;
    updateUndoRedoState();
  }, [updateUndoRedoState]);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

    isUndoRedoingRef.current = true;
    historyIndexRef.current -= 1;
    const snap = historyRef.current[historyIndexRef.current];
    if (snap) {
      setNewNoteTitle(snap.title);
      setNewNoteContent(snap.content);
      if (editorRef.current) {
        editorRef.current.innerHTML = snap.content;
      }
    }
    updateUndoRedoState();
    setTimeout(() => {
      isUndoRedoingRef.current = false;
    }, 40);
  }, [updateUndoRedoState]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

    isUndoRedoingRef.current = true;
    historyIndexRef.current += 1;
    const snap = historyRef.current[historyIndexRef.current];
    if (snap) {
      setNewNoteTitle(snap.title);
      setNewNoteContent(snap.content);
      if (editorRef.current) {
        editorRef.current.innerHTML = snap.content;
      }
    }
    updateUndoRedoState();
    setTimeout(() => {
      isUndoRedoingRef.current = false;
    }, 40);
  }, [updateUndoRedoState]);

  const handleTitleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
      return;
    }
    if (
      ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
      ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
    ) {
      e.preventDefault();
      handleRedo();
      return;
    }
  };

  const [isDocked, setIsDocked] = useState(() => {
    try {
      const local = localStorage.getItem('mochiScribeDocked');
      if (local !== null) return local === 'true';
    } catch {}
    return false;
  });
  const [activeFormats, setActiveFormats] = useState({});
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [highlightColor, setHighlightColor] = useState('#FFE066');
  const [textColor, setTextColor] = useState('#3C2B25');
  const [activeDropdown, setActiveDropdown] = useState(null); // 'highlight' | 'text' | null
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const activeImageRef = useRef(null);
  const lastActiveTableRef = useRef(null);
  const lastActiveCellRef = useRef(null);
  const lastTableActionTimeRef = useRef(0);

  const currentDomain = window.location.hostname;

  // Load persistent Recycle Bin
  useEffect(() => {
    getTrash().then(trashItems => {
      setTrash(Array.isArray(trashItems) ? trashItems : []);
    });
  }, []);

  // Save persistent Recycle Bin on change
  useEffect(() => {
    saveTrash(trash);
  }, [trash]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      const target = e.target?.nodeType === 1 ? e.target : e.target?.parentElement;
      if (!target?.closest?.('.toolbar-dropdown-container')) {
        setActiveDropdown(null);
      }
    };
    window.addEventListener('pointerdown', handleOutsideClick, true);
    return () => window.removeEventListener('pointerdown', handleOutsideClick, true);
  }, []);

  useEffect(() => {
    if (!fullscreenImage) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setFullscreenImage(null);
        setImageZoom(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenImage]);

  const handleOpenFullscreenImage = (imgElementOrSrc) => {
    if (imgElementOrSrc && typeof imgElementOrSrc === 'object' && imgElementOrSrc.tagName === 'IMG') {
      activeImageRef.current = imgElementOrSrc;
      setFullscreenImage(imgElementOrSrc.src);
    } else {
      activeImageRef.current = null;
      setFullscreenImage(imgElementOrSrc);
    }
    setImageZoom(1);
  };

  const handleCloseFullscreenImage = () => {
    setFullscreenImage(null);
    setImageZoom(1);
    activeImageRef.current = null;
  };

  const handleZoomIn = (e) => {
    e.stopPropagation();
    setImageZoom(prev => Math.min(Math.round((prev + 0.25) * 100) / 100, 3));
  };

  const handleZoomOut = (e) => {
    e.stopPropagation();
    setImageZoom(prev => Math.max(Math.round((prev - 0.25) * 100) / 100, 0.5));
  };

  const handleResetZoom = (e) => {
    e.stopPropagation();
    setImageZoom(1);
  };

  const handleToggleZoom = (e) => {
    e.stopPropagation();
    setImageZoom(prev => (prev === 1 ? 1.75 : 1));
  };

  const handleDeleteFullscreenImage = (e) => {
    e.stopPropagation();
    if (activeImageRef.current && editorRef.current?.contains(activeImageRef.current)) {
      activeImageRef.current.remove();
    } else if (fullscreenImage && editorRef.current) {
      const allImgs = editorRef.current.querySelectorAll('img');
      allImgs.forEach(img => {
        if (img.src === fullscreenImage) {
          img.remove();
        }
      });
    }
    setFullscreenImage(null);
    setImageZoom(1);
    activeImageRef.current = null;
    setNewNoteContent(editorRef.current?.innerHTML || '');
    updateFormattingState();
  };

  useEffect(() => {
    try {
      chrome.storage.local.get(['mochiScribeDocked'], (res) => {
        if (res && res.mochiScribeDocked !== undefined) {
          setIsDocked(res.mochiScribeDocked);
          try {
            localStorage.setItem('mochiScribeDocked', String(res.mochiScribeDocked));
          } catch {}
        }
      });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      chrome.storage.local.set({ mochiScribeDocked: isDocked });
      localStorage.setItem('mochiScribeDocked', String(isDocked));
    } catch { /* ignore */ }

    if (isDocked) {
      document.documentElement.style.transition = 'padding-right 0.3s ease';
      document.documentElement.style.paddingRight = '420px'; // sidebar (60) + panel (360)
      document.body.classList.add('scribe-docked-active');
      document.documentElement.classList.add('scribe-docked-active');
      document.documentElement.classList.add('mochi-docked-active');
      onDockChange?.(true);
    } else {
      document.documentElement.style.paddingRight = '0px';
      document.body.classList.remove('scribe-docked-active');
      document.documentElement.classList.remove('scribe-docked-active');
      document.documentElement.classList.remove('mochi-docked-active');
      onDockChange?.(false);
    }

    return () => {
      document.documentElement.style.paddingRight = '0px';
      document.body.classList.remove('scribe-docked-active');
      document.documentElement.classList.remove('scribe-docked-active');
      document.documentElement.classList.remove('mochi-docked-active');
      onDockChange?.(false);
    };
  }, [isDocked, onDockChange]);

  useEffect(() => {
    if (isComposing && editorRef.current) {
      if (editorRef.current.innerHTML !== newNoteContent) {
        editorRef.current.innerHTML = newNoteContent;
      }
    }
  }, [isComposing, newNoteContent]);

  // Load saved content and position
  useEffect(() => {
    getNotebooks().then(data => {
      // Migrate old string data to array if necessary
      const loaded = {};
      for (const key in data) {
        if (typeof data[key] === 'string') {
          if (data[key].trim()) {
            loaded[key] = [{ id: Date.now().toString(), content: data[key], timestamp: Date.now() }];
          } else {
            loaded[key] = [];
          }
        } else {
          loaded[key] = data[key] || [];
        }
      }

      if (!loaded.global) loaded.global = [];

      const targetTab = savedCompose?.tab || currentDomain;
      if (targetTab && !loaded[targetTab]) {
        loaded[targetTab] = [];
      }

      // If we restored a note being edited, ensure it is in loaded notebooks
      if (savedCompose?.isComposing && savedCompose?.editingNoteId) {
        const tabList = loaded[targetTab] || [];
        const existingIdx = tabList.findIndex(n => n.id === savedCompose.editingNoteId);
        if (existingIdx !== -1) {
          if (savedCompose.title || savedCompose.content) {
            tabList[existingIdx] = {
              ...tabList[existingIdx],
              title: savedCompose.title !== undefined ? savedCompose.title : tabList[existingIdx].title,
              content: savedCompose.content !== undefined ? savedCompose.content : tabList[existingIdx].content,
              timestamp: Date.now()
            };
          }
        } else if (savedCompose.title || savedCompose.content) {
          tabList.unshift({
            id: savedCompose.editingNoteId,
            title: savedCompose.title || '',
            content: savedCompose.content || '',
            timestamp: Date.now()
          });
        }
        loaded[targetTab] = tabList;
      }

      setNotebooks(loaded);

      // Auto-switch to current domain ONLY if not actively composing
      if (!savedCompose?.isComposing && currentDomain) {
        setActiveTab(currentDomain);
        setNewNoteTitle('');
        setNewNoteContent('');
        setEditingNoteId(null);
        setIsComposing(false);
        if (!loaded[currentDomain]) {
          setNotebooks(prev => ({ ...prev, [currentDomain]: [] }));
        }
      }
    });
  }, [currentDomain]);

  // Save notebooks on change
  useEffect(() => {
    saveNotebooks(notebooks);
  }, [notebooks]);

  // Live auto-save whenever title or content changes while composing
  useEffect(() => {
    if (!isComposing) return;

    // Immediately persist current composing draft into sessionStorage
    try {
      sessionStorage.setItem('nick_scribe_composing_state', JSON.stringify({
        isComposing: true,
        editingNoteId: editingNoteIdRef.current,
        tab: activeTab,
        title: newNoteTitle,
        content: newNoteContent,
        timestamp: Date.now()
      }));
    } catch {}

    // Only auto-save to notebooks if there's actual title or content
    if (!newNoteTitle.trim() && !newNoteContent.trim()) {
      return;
    }

    setSaveStatus('saving');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(() => {
      // Ensure we have a persistent note ID
      let noteId = editingNoteIdRef.current;
      if (!noteId) {
        noteId = 'note_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
        setEditingNoteId(noteId);
        editingNoteIdRef.current = noteId;
        try {
          sessionStorage.setItem('nick_scribe_composing_state', JSON.stringify({
            isComposing: true,
            editingNoteId: noteId,
            tab: activeTab,
            title: newNoteTitle,
            content: newNoteContent,
            timestamp: Date.now()
          }));
        } catch {}
      }

      setNotebooks(prev => {
        const currentList = prev[activeTab] || [];
        const exists = currentList.some(n => n.id === noteId);
        if (exists) {
          return {
            ...prev,
            [activeTab]: currentList.map(n =>
              n.id === noteId
                ? { ...n, title: newNoteTitle, content: newNoteContent, timestamp: Date.now() }
                : n
            )
          };
        } else {
          return {
            ...prev,
            [activeTab]: [
              {
                id: noteId,
                title: newNoteTitle,
                content: newNoteContent,
                timestamp: Date.now()
              },
              ...currentList
            ]
          };
        }
      });

      setSaveStatus('saved');
    }, 350);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [isComposing, newNoteTitle, newNoteContent, activeTab]);

  // Flush composing state on page unload/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isComposingRef.current) {
        try {
          sessionStorage.setItem('nick_scribe_composing_state', JSON.stringify({
            isComposing: true,
            editingNoteId: editingNoteIdRef.current,
            tab: activeTabRef.current,
            title: newNoteTitleRef.current,
            content: newNoteContentRef.current,
            timestamp: Date.now()
          }));
        } catch {}
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setNewNoteTitle('');
    setNewNoteContent('');
    setEditingNoteId(null);
    setIsComposing(false);
    initHistory('', '');
    try {
      sessionStorage.removeItem('nick_scribe_composing_state');
    } catch {}
  };

  const handleAddNote = () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    if (!newNoteTitle.trim() && !newNoteContent.trim()) {
      cancelEdit();
      return;
    }

    const noteId = editingNoteIdRef.current || ('note_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5));

    setNotebooks(prev => {
      const currentList = prev[activeTab] || [];
      const exists = currentList.some(n => n.id === noteId);
      if (exists) {
        return {
          ...prev,
          [activeTab]: currentList.map(n =>
            n.id === noteId
              ? { ...n, title: newNoteTitle, content: newNoteContent, timestamp: Date.now() }
              : n
          )
        };
      } else {
        return {
          ...prev,
          [activeTab]: [
            {
              id: noteId,
              title: newNoteTitle,
              content: newNoteContent,
              timestamp: Date.now()
            },
            ...currentList
          ]
        };
      }
    });

    setNewNoteTitle('');
    setNewNoteContent('');
    setEditingNoteId(null);
    setIsComposing(false);
    initHistory('', '');
    try {
      sessionStorage.removeItem('nick_scribe_composing_state');
    } catch {}
  };

  const handleEditNote = (note, domain) => {
    if (activeTab === 'trash') return; // Cannot edit notes in Recycle Bin directly
    const targetDomain = (activeTab === 'all' && domain) ? domain : activeTab;
    if (activeTab === 'all' && domain) {
      setActiveTab(domain);
    }
    setNewNoteTitle(note.title || '');
    setNewNoteContent(note.content || '');
    initHistory(note.title || '', note.content || '');
    setEditingNoteId(note.id);
    setIsComposing(true);
    setSaveStatus('saved');
    try {
      sessionStorage.setItem('nick_scribe_composing_state', JSON.stringify({
        isComposing: true,
        editingNoteId: note.id,
        tab: targetDomain,
        title: note.title || '',
        content: note.content || '',
        timestamp: Date.now()
      }));
    } catch {}
  };

  const getFormatBlock = () => {
    const val = (document.queryCommandValue('formatBlock') || '').toLowerCase().replace(/[<>]/g, '');
    if (val) return val;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return '';
    let node = sel.getRangeAt(0).startContainer;
    while (node && node !== editorRef.current) {
      if (node.nodeType === 1) {
        const t = node.tagName.toLowerCase();
        if (['h1', 'h2', 'h3', 'p', 'div'].includes(t)) return t;
      }
      node = node.parentNode;
    }
    return '';
  };

  const isTextHighlighted = () => {
    const back = document.queryCommandValue('hiliteColor') || document.queryCommandValue('backColor');
    if (
      back &&
      back !== 'transparent' &&
      back !== 'rgba(0, 0, 0, 0)' &&
      back !== 'inherit' &&
      back !== 'rgb(253, 241, 230)' &&
      back !== 'rgb(255, 243, 227)'
    ) {
      return true;
    }
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return false;
    let node = sel.getRangeAt(0).startContainer;
    while (node && node !== editorRef.current) {
      if (node.nodeType === 1) {
        const bg = window.getComputedStyle(node).backgroundColor;
        if (
          bg &&
          bg !== 'transparent' &&
          bg !== 'rgba(0, 0, 0, 0)' &&
          bg !== 'rgb(253, 241, 230)' &&
          bg !== 'rgb(255, 243, 227)'
        ) {
          return true;
        }
      }
      node = node.parentNode;
    }
    return false;
  };

  const updateFormattingState = () => {
    const block = getFormatBlock();
    const highlighted = isTextHighlighted();
    const sel = window.getSelection();
    if (sel?.anchorNode) {
      const cell = sel.anchorNode.nodeType === 1 ? sel.anchorNode.closest('th, td') : sel.anchorNode.parentElement?.closest('th, td');
      if (cell) {
        lastActiveCellRef.current = cell;
        lastActiveTableRef.current = cell.closest('table');
      }
    }
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      h1: block === 'h1',
      h2: block === 'h2',
      highlight: highlighted,
      hiliteColor: document.queryCommandValue('hiliteColor') || document.queryCommandValue('backColor'),
      foreColor: document.queryCommandValue('foreColor')
    });
  };

  const handleFormat = (command, value = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    const updated = editorRef.current?.innerHTML || '';
    setNewNoteContent(updated);
    pushHistorySnapshot(newNoteTitleRef.current, updated, true);
    updateFormattingState();
  };

  const handleToggleHeading = (level) => {
    editorRef.current?.focus();
    const current = getFormatBlock();
    if (current === level.toLowerCase()) {
      // Revert heading back to normal paragraph
      document.execCommand('formatBlock', false, '<p>');
    } else {
      document.execCommand('formatBlock', false, `<${level.toUpperCase()}>`);
    }
    const updated = editorRef.current?.innerHTML || '';
    setNewNoteContent(updated);
    pushHistorySnapshot(newNoteTitleRef.current, updated, true);
    updateFormattingState();
  };

  const handleToggleHighlight = () => {
    editorRef.current?.focus();
    if (isTextHighlighted()) {
      // Toggle off / disable highlighting
      document.execCommand('hiliteColor', false, 'transparent');
    } else {
      // Toggle on with chosen highlight color
      document.execCommand('hiliteColor', false, highlightColor);
    }
    const updated = editorRef.current?.innerHTML || '';
    setNewNoteContent(updated);
    pushHistorySnapshot(newNoteTitleRef.current, updated, true);
    updateFormattingState();
  };

  const handleSelectHighlightColor = (color) => {
    editorRef.current?.focus();
    setHighlightColor(color);
    if (color === 'transparent') {
      document.execCommand('hiliteColor', false, 'transparent');
    } else {
      document.execCommand('hiliteColor', false, color);
    }
    setActiveDropdown(null);
    const updated = editorRef.current?.innerHTML || '';
    setNewNoteContent(updated);
    pushHistorySnapshot(newNoteTitleRef.current, updated, true);
    updateFormattingState();
  };

  const handleSelectTextColor = (color) => {
    editorRef.current?.focus();
    setTextColor(color);
    document.execCommand('foreColor', false, color);
    setActiveDropdown(null);
    const updated = editorRef.current?.innerHTML || '';
    setNewNoteContent(updated);
    pushHistorySnapshot(newNoteTitleRef.current, updated, true);
    updateFormattingState();
  };

  const handlePaste = (e) => {
    // If pasting an image from clipboard
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = items[i].getAsFile();
          const reader = new FileReader();
          reader.onload = (event) => {
            editorRef.current?.focus();
            document.execCommand('insertImage', false, event.target.result);
            setNewNoteContent(editorRef.current?.innerHTML || '');
          };
          reader.readAsDataURL(file);
          return;
        }
      }
    }

    e.preventDefault();
    const html = e.clipboardData?.getData('text/html');
    const text = e.clipboardData?.getData('text/plain');

    if (html) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // 1. Unwrap all <mark> tags into plain spans/nodes to destroy user-agent yellow highlight
      doc.querySelectorAll('mark').forEach(mark => {
        const span = doc.createElement('span');
        span.innerHTML = mark.innerHTML;
        mark.replaceWith(span);
      });

      const allElements = [doc.body, ...doc.body.querySelectorAll('*')];

      allElements.forEach(el => {
        // Strip class attributes so third-party highlight classes do not apply
        el.removeAttribute('class');
        el.removeAttribute('bgcolor');
        el.removeAttribute('background');

        if (el.style) {
          // Neutralize all background colors and styles
          el.style.backgroundColor = '';
          el.style.background = '';
          el.style.backgroundImage = '';
          el.style.boxShadow = '';
          el.style.textShadow = '';

          // If text was white or light gray from a dark mode site, clear it to inherit default text color
          const col = (el.style.color || '').toLowerCase().replace(/\s/g, '');
          if (
            col === 'white' ||
            col === '#fff' ||
            col === '#ffffff' ||
            col.startsWith('rgb(255,255,255') ||
            col.startsWith('rgba(255,255,255') ||
            col.startsWith('rgb(24') ||
            col.startsWith('rgb(25')
          ) {
            el.style.color = '';
          }
        }

        const styleAttr = el.getAttribute('style');
        if (styleAttr) {
          const cleaned = styleAttr
            .replace(/background(-color|-image)?\s*:[^;]+;?/gi, '')
            .replace(/color\s*:\s*(#fff(fff)?|white|rgba?\(\s*255\s*,\s*255\s*,\s*255[^)]*\))\s*;?/gi, '')
            .trim();
          if (cleaned) {
            el.setAttribute('style', cleaned);
          } else {
            el.removeAttribute('style');
          }
        }
      });

      // Unwrap redundant empty spans
      doc.querySelectorAll('span').forEach(span => {
        if (!span.getAttribute('style') && !span.attributes.length) {
          span.replaceWith(...Array.from(span.childNodes));
        }
      });

      const cleanHtml = doc.body.innerHTML;
      document.execCommand('insertHTML', false, cleanHtml);
    } else if (text) {
      document.execCommand('insertText', false, text);
    }
    setNewNoteContent(editorRef.current?.innerHTML || '');
  };

  const handleDownloadPdf = (note) => {
    const title = (note.title || 'Untitled Note').trim();
    const rawHtml = note.content || '<p>No content</p>';
    const dateFormatted = new Date(note.timestamp || Date.now()).toLocaleString();

    // Create an iframe to render clean printable PDF
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          @page {
            size: A4;
            margin: 20mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #2C1810;
            background: #FFFFFF;
            line-height: 1.6;
            margin: 0;
            padding: 24px;
          }
          .pdf-header {
            border-bottom: 2px solid #E07A3F;
            padding-bottom: 12px;
            margin-bottom: 24px;
          }
          h1 {
            font-size: 26px;
            font-weight: 800;
            color: #E07A3F;
            margin: 0 0 6px 0;
          }
          .pdf-meta {
            font-size: 12px;
            color: #8C7A6B;
            font-weight: 600;
          }
          h2 {
            font-size: 20px;
            color: #3C2B25;
            margin: 18px 0 8px 0;
            border-bottom: 1px dashed rgba(60, 43, 37, 0.2);
            padding-bottom: 4px;
          }
          p {
            margin: 8px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
            font-size: 13px;
          }
          th, td {
            border: 1.5px solid #3C2B25;
            padding: 8px 12px;
            text-align: left;
          }
          th {
            background: #E07A3F;
            color: #FFF;
            font-weight: bold;
          }
          tr:nth-child(even) td {
            background: #FAF5F0;
          }
          img {
            max-width: 100%;
            max-height: 320px;
            object-fit: contain;
            border-radius: 8px;
            border: 1px solid #CCC;
            margin: 10px 0;
          }
          ul, ol {
            padding-left: 24px;
            margin: 10px 0;
          }
          li {
            margin: 4px 0;
          }
          ul[data-pointer="square"], ul[data-list-type="square"], ul[style*="square"] { list-style-type: square !important; }
          ul[data-pointer="circle"], ul[data-list-type="circle"], ul[style*="circle"] { list-style-type: circle !important; }
          ul[data-pointer="arrow"], ul[data-list-type="arrow"], ul[style*="▸"] { list-style-type: "▸  " !important; }
          ol[data-pointer="alpha"], ol[type="a"], ol[style*="lower-alpha"] { list-style-type: lower-alpha !important; }
          .scribe-task-item {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 6px 0;
          }
          input[type="checkbox"] {
            accent-color: #E07A3F;
            width: 15px;
            height: 15px;
          }
          .table-header-controls-row, .table-scroll-buttons, .tbl-pan-btn, .tbl-action-pill-btn, .tbl-del-btn, .col-resizer {
            display: none !important;
          }
          .table-scroll-bar-top {
            display: block !important;
            border: none !important;
            padding: 4px 0 !important;
            margin-bottom: 4px !important;
          }
          .tbl-title-editable {
            font-size: 14px !important;
            font-weight: 800 !important;
            color: #E07A3F !important;
            background: transparent !important;
            border: none !important;
            padding: 0 !important;
          }
          .tbl-info {
            font-size: 11px !important;
            color: #8C7A6B !important;
            margin-left: 8px !important;
          }
        </style>
      </head>
      <body>
        <div class="pdf-header">
          <h1>${title}</h1>
          <div class="pdf-meta">Saved on: ${dateFormatted}</div>
        </div>
        <div class="pdf-body">
          ${rawHtml}
        </div>
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }, 250);
  };

  const handleList = (pointerType) => {
    editorRef.current?.focus();
    if (pointerType === 'numbered') {
      const sel = window.getSelection();
      let ul = sel?.anchorNode ? (sel.anchorNode.nodeType === 1 ? sel.anchorNode.closest('ul') : sel.anchorNode.parentElement?.closest('ul')) : null;
      let ol = sel?.anchorNode ? (sel.anchorNode.nodeType === 1 ? sel.anchorNode.closest('ol') : sel.anchorNode.parentElement?.closest('ol')) : null;
      if (ul || !ol) {
        document.execCommand('insertOrderedList');
        const selAfter = window.getSelection();
        ol = selAfter?.anchorNode ? (selAfter.anchorNode.nodeType === 1 ? selAfter.anchorNode.closest('ol') : selAfter.anchorNode.parentElement?.closest('ol')) : null;
      }
      if (ol) {
        ol.setAttribute('data-pointer', 'numbered');
        ol.setAttribute('data-list-type', 'numbered');
        ol.style.listStyleType = 'decimal';
        ol.removeAttribute('type');
        ol.querySelectorAll('li').forEach(li => {
          li.setAttribute('data-pointer', 'numbered');
          li.style.listStyleType = 'decimal';
          li.style.display = 'list-item';
        });
      }
    } else if (pointerType === 'alpha') {
      const sel = window.getSelection();
      let ul = sel?.anchorNode ? (sel.anchorNode.nodeType === 1 ? sel.anchorNode.closest('ul') : sel.anchorNode.parentElement?.closest('ul')) : null;
      let ol = sel?.anchorNode ? (sel.anchorNode.nodeType === 1 ? sel.anchorNode.closest('ol') : sel.anchorNode.parentElement?.closest('ol')) : null;
      if (ul || !ol) {
        document.execCommand('insertOrderedList');
        const selAfter = window.getSelection();
        ol = selAfter?.anchorNode ? (selAfter.anchorNode.nodeType === 1 ? selAfter.anchorNode.closest('ol') : selAfter.anchorNode.parentElement?.closest('ol')) : null;
      }
      if (ol) {
        ol.setAttribute('data-pointer', 'alpha');
        ol.setAttribute('data-list-type', 'alpha');
        ol.style.listStyleType = 'lower-alpha';
        ol.setAttribute('type', 'a');
        ol.querySelectorAll('li').forEach(li => {
          li.setAttribute('data-pointer', 'alpha');
          li.style.listStyleType = 'lower-alpha';
          li.style.display = 'list-item';
        });
      }
    } else if (pointerType === 'task') {
      document.execCommand('insertHTML', false, '<div class="scribe-task-item"><input type="checkbox" contenteditable="false" /><span class="task-text">&nbsp;</span></div>');
    } else {
      // Unordered list: 'disc', 'arrow', 'square', 'circle'
      const sel = window.getSelection();
      let ol = sel?.anchorNode ? (sel.anchorNode.nodeType === 1 ? sel.anchorNode.closest('ol') : sel.anchorNode.parentElement?.closest('ol')) : null;
      let ul = sel?.anchorNode ? (sel.anchorNode.nodeType === 1 ? sel.anchorNode.closest('ul') : sel.anchorNode.parentElement?.closest('ul')) : null;

      if (ol) {
        document.execCommand('insertUnorderedList');
        const selAfter = window.getSelection();
        ul = selAfter?.anchorNode ? (selAfter.anchorNode.nodeType === 1 ? selAfter.anchorNode.closest('ul') : selAfter.anchorNode.parentElement?.closest('ul')) : null;
      } else if (!ul) {
        document.execCommand('insertUnorderedList');
        const selAfter = window.getSelection();
        ul = selAfter?.anchorNode ? (selAfter.anchorNode.nodeType === 1 ? selAfter.anchorNode.closest('ul') : selAfter.anchorNode.parentElement?.closest('ul')) : null;
      }

      if (ul) {
        ul.setAttribute('data-pointer', pointerType);
        ul.setAttribute('data-list-type', pointerType);
        const styleVal = pointerType === 'arrow' ? '"▸  "' : pointerType;
        ul.style.listStyleType = styleVal;
        ul.querySelectorAll('li').forEach(li => {
          li.setAttribute('data-pointer', pointerType);
          li.style.listStyleType = styleVal;
          li.style.display = 'list-item';
        });
      }
    }
    setActiveDropdown(null);
    setNewNoteContent(editorRef.current?.innerHTML || '');
    updateFormattingState();
  };

  const handleInsertTable = (rows = 3, cols = 3) => {
    editorRef.current?.focus();
    const tableId = `tbl-${Date.now()}`;
    let html = `<div class="scribe-table-wrap" id="${tableId}" contenteditable="false">`;
    html += '<div class="table-scroll-bar-top" contenteditable="false">';
    html += '<div class="table-scroll-meta table-header-name-row">';
    html += '<span class="tbl-title-editable" contenteditable="true" data-placeholder="Type table title...">Table</span>';
    html += `<span class="tbl-info">${rows}×${cols}</span>`;
    html += '</div>';
    html += '<div class="table-header-controls-row table-scroll-buttons" contenteditable="false">';
    html += '<div class="table-controls-left">';
    html += '<button type="button" class="tbl-action-pill-btn" data-action="addRow" title="Add Row">＋ Row</button>';
    html += '<button type="button" class="tbl-action-pill-btn delete-action" data-action="deleteRow" title="Delete Row">− Row</button>';
    html += '<button type="button" class="tbl-action-pill-btn" data-action="addCol" title="Add Column">＋ Col</button>';
    html += '<button type="button" class="tbl-action-pill-btn delete-action" data-action="deleteCol" title="Delete Column">− Col</button>';
    html += '</div>';
    html += '<div class="table-controls-right">';
    html += '<button type="button" class="tbl-pan-btn" data-dir="left" title="Scroll columns left">◀</button>';
    html += '<button type="button" class="tbl-pan-btn" data-dir="right" title="Scroll columns right">▶</button>';
    html += '<button type="button" class="tbl-del-btn" title="Delete Table">✕</button>';
    html += '</div></div></div>';
    html += '<div class="table-scroll-inner" contenteditable="false">';
    html += '<table class="scribe-table" style="table-layout: fixed;" contenteditable="false"><thead><tr>';
    for (let c = 1; c <= cols; c++) {
      html += `<th contenteditable="true" style="width: 110px; min-width: 70px;">Header ${c}<span class="col-resizer" contenteditable="false"></span></th>`;
    }
    html += '</tr></thead><tbody>';
    for (let r = 1; r <= rows - 1; r++) {
      html += '<tr>';
      for (let c = 1; c <= cols; c++) {
        html += '<td contenteditable="true"><br></td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table></div></div><p class="scribe-after-table" contenteditable="true"><br></p>';
    document.execCommand('insertHTML', false, html);
    setActiveDropdown(null);

    // Place cursor in the paragraph right below the table so user can type immediately
    setTimeout(() => {
      const insertedWrap = editorRef.current?.querySelector(`#${tableId}`);
      if (insertedWrap) {
        insertedWrap.removeAttribute('id');
        const nextP = insertedWrap.nextElementSibling;
        if (nextP) {
          const range = document.createRange();
          range.setStart(nextP, 0);
          range.collapse(true);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }
      setNewNoteContent(editorRef.current?.innerHTML || '');
      updateFormattingState();
    }, 10);
  };

  const handleTableAction = (action, explicitTable = null) => {
    let table = explicitTable;
    if (!table) {
      const sel = window.getSelection();
      if (sel?.anchorNode) {
        table = sel.anchorNode.nodeType === 1
          ? sel.anchorNode.closest('table')
          : sel.anchorNode.parentElement?.closest('table');
      }
    }
    if (!table && lastActiveTableRef.current && editorRef.current?.contains(lastActiveTableRef.current)) {
      table = lastActiveTableRef.current;
    }
    if (!table && editorRef.current) {
      const allTables = editorRef.current.querySelectorAll('table');
      if (allTables.length > 0) {
        table = allTables[allTables.length - 1];
      }
    }
    if (!table) return;

    lastActiveTableRef.current = table;

    if (action === 'addRow') {
      const cols = table.querySelector('tr')?.children.length || 3;
      const tbody = table.querySelector('tbody') || table;
      const newTr = document.createElement('tr');
      let firstNewTd = null;
      for (let i = 0; i < cols; i++) {
        const td = document.createElement('td');
        td.setAttribute('contenteditable', 'true');
        td.innerHTML = '<br>';
        newTr.appendChild(td);
        if (i === 0) firstNewTd = td;
      }
      tbody.appendChild(newTr);

      const scroller = table.closest('.table-scroll-inner');
      if (scroller) {
        scroller.scrollTop = scroller.scrollHeight;
      }

      if (firstNewTd) {
        const range = document.createRange();
        range.setStart(firstNewTd, 0);
        range.collapse(true);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    } else if (action === 'addCol') {
      let firstNewHeader = null;
      table.querySelectorAll('tr').forEach((tr, index) => {
        const isHeader = index === 0 && table.querySelector('thead');
        const cell = isHeader ? document.createElement('th') : document.createElement('td');
        cell.setAttribute('contenteditable', 'true');
        const colNum = tr.children.length + 1;
        if (isHeader) {
          cell.style.width = '110px';
          cell.style.minWidth = '70px';
          cell.innerHTML = `Header ${colNum}<span class="col-resizer" contenteditable="false"></span>`;
          firstNewHeader = cell;
        } else {
          cell.innerHTML = '<br>';
        }
        tr.appendChild(cell);
      });

      // Update table layout width if fixed
      const allHeaders = Array.from(table.querySelectorAll('th'));
      const totalWidth = allHeaders.reduce((sum, h) => sum + (parseFloat(h.style.width) || h.offsetWidth || 110), 0);
      table.style.width = `${totalWidth}px`;
      table.style.minWidth = `${totalWidth}px`;

      // Scroll horizontal container so the new column is visible
      const scroller = table.closest('.table-scroll-inner');
      if (scroller) {
        scroller.scrollLeft = scroller.scrollWidth;
      }

      if (firstNewHeader) {
        const range = document.createRange();
        range.selectNodeContents(firstNewHeader);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    } else if (action === 'deleteRow') {
      const tbody = table.querySelector('tbody') || table;
      const rows = Array.from(tbody.querySelectorAll('tr'));
      if (rows.length <= 1) return; // Keep at least 1 data row

      let targetRow = null;
      if (lastActiveCellRef.current && table.contains(lastActiveCellRef.current)) {
        targetRow = lastActiveCellRef.current.closest('tbody tr');
      }
      if (!targetRow || !tbody.contains(targetRow)) {
        targetRow = rows[rows.length - 1]; // Fallback to last row
      }

      if (targetRow) {
        const focusNeighbor = targetRow.previousElementSibling || targetRow.nextElementSibling || rows.find(r => r !== targetRow);
        targetRow.remove();
        if (focusNeighbor) {
          const targetCell = focusNeighbor.querySelector('td, th');
          if (targetCell) {
            lastActiveCellRef.current = targetCell;
            const range = document.createRange();
            range.setStart(targetCell, 0);
            range.collapse(true);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
          }
        }
      }
    } else if (action === 'deleteCol') {
      const allRows = Array.from(table.querySelectorAll('tr'));
      if (allRows.length === 0) return;
      const firstRow = allRows[0];
      const colCount = firstRow.children.length;
      if (colCount <= 1) return; // Keep at least 1 column

      let targetColIndex = -1;
      if (lastActiveCellRef.current && table.contains(lastActiveCellRef.current)) {
        const cell = lastActiveCellRef.current;
        const parentTr = cell.parentElement;
        if (parentTr) {
          targetColIndex = Array.from(parentTr.children).indexOf(cell);
        }
      }
      if (targetColIndex < 0 || targetColIndex >= colCount) {
        targetColIndex = colCount - 1; // Fallback to last column
      }

      allRows.forEach(tr => {
        const cellToRemove = tr.children[targetColIndex];
        if (cellToRemove) cellToRemove.remove();
      });

      const allHeaders = Array.from(table.querySelectorAll('th'));
      if (allHeaders.length > 0) {
        const totalWidth = allHeaders.reduce((sum, h) => sum + (parseFloat(h.style.width) || h.offsetWidth || 110), 0);
        table.style.width = `${totalWidth}px`;
        table.style.minWidth = `${totalWidth}px`;
        const focusIndex = Math.min(targetColIndex, allHeaders.length - 1);
        const remainingHeader = allHeaders[focusIndex];
        if (remainingHeader) {
          lastActiveCellRef.current = remainingHeader;
        }
      }
    } else if (action === 'deleteTable') {
      const wrap = table.closest('.scribe-table-wrap');
      if (wrap) {
        let afterP = wrap.nextElementSibling;
        if (!afterP || !afterP.classList.contains('scribe-after-table')) {
          afterP = document.createElement('p');
          afterP.className = 'scribe-after-table';
          afterP.setAttribute('contenteditable', 'true');
          afterP.innerHTML = '<br>';
          wrap.parentElement?.insertBefore(afterP, wrap.nextSibling);
        }
        wrap.remove();
        lastActiveTableRef.current = null;
        lastActiveCellRef.current = null;
        const range = document.createRange();
        range.setStart(afterP, 0);
        range.collapse(true);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      } else {
        table.remove();
        lastActiveTableRef.current = null;
        lastActiveCellRef.current = null;
      }
      setActiveDropdown(null);
      setNewNoteContent(editorRef.current?.innerHTML || '');
      updateFormattingState();
      return;
    }

    const wrap = table.closest('.scribe-table-wrap');
    if (wrap) {
      const info = wrap.querySelector('.tbl-info');
      if (info) {
        const rCount = table.querySelectorAll('tr').length;
        const cCount = table.querySelector('tr')?.children.length || 0;
        info.textContent = `${rCount}×${cCount}`;
      }
    }

    setActiveDropdown(null);
    setNewNoteContent(editorRef.current?.innerHTML || '');
    updateFormattingState();
  };

  const handleTableButtonInteraction = (e) => {
    const target = e.target?.nodeType === 1 ? e.target : e.target?.parentElement;
    if (!target?.closest) return false;

    const pillBtn = target.closest('.tbl-action-pill-btn');
    const delBtn = target.closest('.tbl-del-btn');
    const panBtn = target.closest('.tbl-pan-btn');

    if (!pillBtn && !delBtn && !panBtn) return false;

    // Prevent contenteditable from hijacking focus or making atomic block selections
    e.preventDefault();
    e.stopPropagation();

    // Only execute the actual action on 'click' to guarantee exactly one trigger per user click
    if (e.type !== 'click') {
      return true;
    }

    const now = Date.now();
    if (now - lastTableActionTimeRef.current < 350) return true;
    lastTableActionTimeRef.current = now;

    if (pillBtn) {
      const action = pillBtn.getAttribute('data-action');
      const wrap = pillBtn.closest('.scribe-table-wrap');
      const table = wrap?.querySelector('table');
      if (table && action) {
        handleTableAction(action, table);
      }
      return true;
    }

    if (delBtn) {
      const wrap = delBtn.closest('.scribe-table-wrap');
      if (wrap) {
        let afterP = wrap.nextElementSibling;
        if (!afterP || !afterP.classList.contains('scribe-after-table')) {
          afterP = document.createElement('p');
          afterP.className = 'scribe-after-table';
          afterP.setAttribute('contenteditable', 'true');
          afterP.innerHTML = '<br>';
          wrap.parentElement?.insertBefore(afterP, wrap.nextSibling);
        }
        wrap.remove();
        lastActiveTableRef.current = null;
        lastActiveCellRef.current = null;
        const range = document.createRange();
        range.setStart(afterP, 0);
        range.collapse(true);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        setNewNoteContent(editorRef.current?.innerHTML || '');
        updateFormattingState();
      }
      return true;
    }

    if (panBtn) {
      const dir = panBtn.getAttribute('data-dir');
      const wrap = panBtn.closest('.scribe-table-wrap');
      const scroller = wrap?.querySelector('.table-scroll-inner') || wrap;
      if (scroller) {
        scroller.scrollBy({ left: dir === 'left' ? -180 : 180, behavior: 'smooth' });
      }
      return true;
    }

    return true;
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const onNativeEditorPointer = (e) => {
      const target = e.target?.nodeType === 1 ? e.target : e.target?.parentElement;
      const cell = target?.closest?.('th, td');
      if (cell) {
        lastActiveCellRef.current = cell;
        lastActiveTableRef.current = cell.closest('table');
      }
      handleTableButtonInteraction(e);
    };

    editor.addEventListener('pointerdown', onNativeEditorPointer, true);
    editor.addEventListener('click', onNativeEditorPointer, true);
    return () => {
      editor.removeEventListener('pointerdown', onNativeEditorPointer, true);
      editor.removeEventListener('click', onNativeEditorPointer, true);
    };
  }, [isComposing]);

  const handleEditorMouseDown = (e) => {
    // Check if dragging column resizer on table header
    const resizer = e.target.closest?.('.col-resizer');
    const th = resizer ? resizer.closest('th') : e.target.closest?.('th');
    if (!th) return;

    const thRect = th.getBoundingClientRect();
    // Allow clicking resizer or within 10px of right border
    const isNearBorder = (e.clientX >= thRect.right - 10) && (e.clientX <= thRect.right + 6);

    if (resizer || isNearBorder) {
      e.preventDefault();
      e.stopPropagation();

      const table = th.closest('table');
      if (!table) return;

      table.style.tableLayout = 'fixed';

      // Fix initial widths of all headers
      const allHeaders = Array.from(table.querySelectorAll('th'));
      allHeaders.forEach(header => {
        if (!header.style.width) {
          header.style.width = `${header.offsetWidth}px`;
        }
      });

      const startX = e.clientX;
      const startWidth = th.offsetWidth;
      const initialTableWidth = table.offsetWidth;
      const activeResizer = resizer || th.querySelector('.col-resizer');
      if (activeResizer) activeResizer.classList.add('is-resizing');

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const onMouseMove = (moveEvent) => {
        moveEvent.preventDefault();
        const diff = moveEvent.clientX - startX;
        const newWidth = Math.max(50, startWidth + diff);
        th.style.width = `${newWidth}px`;
        th.style.minWidth = `${newWidth}px`;

        // Expand total table width if needed so sibling columns are not squished
        const totalHeadersWidth = allHeaders.reduce((acc, h) => {
          return acc + (h === th ? newWidth : (parseFloat(h.style.width) || h.offsetWidth));
        }, 0);
        const finalTableWidth = Math.max(initialTableWidth, totalHeadersWidth);
        table.style.width = `${finalTableWidth}px`;
        table.style.minWidth = `${finalTableWidth}px`;
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        if (activeResizer) activeResizer.classList.remove('is-resizing');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        setNewNoteContent(editorRef.current?.innerHTML || '');
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      return;
    }
  };

  const handleEditorMouseMove = (e) => {
    const th = e.target.closest?.('th');
    if (th) {
      const thRect = th.getBoundingClientRect();
      if (e.clientX >= thRect.right - 10 && e.clientX <= thRect.right + 6) {
        th.style.cursor = 'col-resize';
      } else {
        th.style.cursor = '';
      }
    }
  };

  const handleEditorKeyDown = (e) => {
    updateFormattingState();

    // Undo (Ctrl+Z or Cmd+Z)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
      return;
    }

    // Redo (Ctrl+Y or Ctrl+Shift+Z or Cmd+Shift+Z)
    if (
      ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
      ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
    ) {
      e.preventDefault();
      handleRedo();
      return;
    }

    // Blur table title when Enter is pressed
    if (e.target?.classList?.contains('tbl-title-editable') && e.key === 'Enter') {
      e.preventDefault();
      e.target.blur();
      return;
    }

    // Move to next cell or blur when Enter is pressed in table header <th>
    if (e.key === 'Enter' && !e.shiftKey) {
      const sel = window.getSelection();
      const th = sel?.anchorNode?.nodeType === 1 ? sel?.anchorNode?.closest('th') : sel?.anchorNode?.parentElement?.closest('th');
      if (th) {
        e.preventDefault();
        const table = th.closest('table');
        const thIndex = Array.from(th.parentElement.children).indexOf(th);
        const firstBodyRow = table?.querySelector('tbody tr');
        if (firstBodyRow && firstBodyRow.children[thIndex]) {
          const targetCell = firstBodyRow.children[thIndex];
          const range = document.createRange();
          range.selectNodeContents(targetCell);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        } else {
          th.blur();
        }
        return;
      }

      // If Enter in the last row and last cell of the table, transition smoothly out of table
      const td = sel?.anchorNode?.nodeType === 1 ? sel?.anchorNode?.closest('td') : sel?.anchorNode?.parentElement?.closest('td');
      if (td) {
        const tr = td.closest('tr');
        const tbody = tr?.parentElement;
        const isLastRow = tr && tr === tbody?.lastElementChild;
        const isLastCell = td === tr?.lastElementChild;

        if (isLastRow && isLastCell) {
          const wrap = td.closest('.scribe-table-wrap');
          if (wrap) {
            e.preventDefault();
            let afterP = wrap.nextElementSibling;
            if (!afterP || !afterP.classList.contains('scribe-after-table')) {
              afterP = document.createElement('p');
              afterP.className = 'scribe-after-table';
              afterP.setAttribute('contenteditable', 'true');
              afterP.innerHTML = '<br>';
              wrap.parentElement?.insertBefore(afterP, wrap.nextSibling);
            }
            const range = document.createRange();
            range.setStart(afterP, 0);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            setNewNoteContent(editorRef.current?.innerHTML || '');
            updateFormattingState();
            return;
          }
        }
      }
    }

    // Down arrow at the bottom of the table moves to typing area below table
    if (e.key === 'ArrowDown') {
      const sel = window.getSelection();
      const td = sel?.anchorNode?.nodeType === 1 ? sel?.anchorNode?.closest('td') : sel?.anchorNode?.parentElement?.closest('td');
      if (td) {
        const tr = td.closest('tr');
        const tbody = tr?.parentElement;
        const isLastRow = tr && tr === tbody?.lastElementChild;
        if (isLastRow) {
          const wrap = td.closest('.scribe-table-wrap');
          if (wrap) {
            let afterP = wrap.nextElementSibling;
            if (!afterP || !afterP.classList.contains('scribe-after-table')) {
              afterP = document.createElement('p');
              afterP.className = 'scribe-after-table';
              afterP.setAttribute('contenteditable', 'true');
              afterP.innerHTML = '<br>';
              wrap.parentElement?.insertBefore(afterP, wrap.nextSibling);
            }
            const range = document.createRange();
            range.setStart(afterP, 0);
            range.collapse(true);
            sel?.removeAllRanges();
            sel?.addRange(range);
            return;
          }
        }
      }
    }

    // Ctrl+Enter to save
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleAddNote();
      return;
    }

    // Handle Backspace
    if (e.key === 'Backspace') {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        let node = sel.anchorNode;

        // Check if inside a checklist task item
        let taskItem = node?.nodeType === 1 ? node.closest('.scribe-task-item') : node?.parentElement?.closest('.scribe-task-item');
        if (taskItem) {
          const rawText = taskItem.textContent.replace(/[\u200B\u00A0\s]/g, '');
          const textSpan = taskItem.querySelector('.task-text');
          const isAtStart = (sel.anchorNode === textSpan && sel.anchorOffset === 0) ||
                            (sel.anchorNode === textSpan?.firstChild && sel.anchorOffset === 0) ||
                            (sel.anchorNode === taskItem && sel.anchorOffset <= 1);

          if (!rawText || isAtStart) {
            e.preventDefault();
            const p = document.createElement('p');
            p.innerHTML = !rawText ? '<br>' : (textSpan?.innerHTML || '<br>');
            taskItem.replaceWith(p);

            const range = document.createRange();
            range.setStart(p, 0);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);

            setNewNoteContent(editorRef.current?.innerHTML || '');
            updateFormattingState();
            return;
          }
        }

        // Handle Backspace inside empty list item to remove the bullet/pointer
        let li = node?.nodeType === 1 ? node.closest('li') : node?.parentElement?.closest('li');
        if (li) {
          const text = li.textContent.replace(/[\u200B\u00A0\s]/g, '');
          if (!text || text === '') {
            e.preventDefault();
            const parentList = li.closest('ul, ol');
            const p = document.createElement('p');
            p.innerHTML = '<br>';

            if (parentList) {
              if (parentList.children.length <= 1) {
                parentList.replaceWith(p);
              } else if (li === parentList.lastElementChild) {
                parentList.parentElement?.insertBefore(p, parentList.nextSibling);
                li.remove();
              } else if (li === parentList.firstElementChild) {
                parentList.parentElement?.insertBefore(p, parentList);
                li.remove();
              } else {
                li.remove();
                parentList.parentElement?.insertBefore(p, parentList.nextSibling);
              }
            }

            // Move cursor to the new line
            const range = document.createRange();
            range.setStart(p, 0);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);

            setNewNoteContent(editorRef.current?.innerHTML || '');
            updateFormattingState();
            return;
          }
        }
      }
    }

    // Handle Enter (without shiftKey)
    if (e.key === 'Enter' && !e.shiftKey) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        let node = sel.anchorNode;

        // Check if inside a checklist task item
        let taskItem = node?.nodeType === 1 ? node.closest('.scribe-task-item') : node?.parentElement?.closest('.scribe-task-item');
        if (taskItem) {
          e.preventDefault();
          const rawText = taskItem.textContent.replace(/[\u200B\u00A0\s]/g, '');
          if (!rawText) {
            // Empty task item: exit checklist into a normal paragraph
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            taskItem.replaceWith(p);

            const range = document.createRange();
            range.setStart(p, 0);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
          } else {
            // Insert a new task item right below
            const newTask = document.createElement('div');
            newTask.className = 'scribe-task-item';
            newTask.innerHTML = '<input type="checkbox" contenteditable="false" /><span class="task-text"><br></span>';

            if (taskItem.nextSibling) {
              taskItem.parentElement?.insertBefore(newTask, taskItem.nextSibling);
            } else {
              taskItem.parentElement?.appendChild(newTask);
            }

            const textSpan = newTask.querySelector('.task-text') || newTask;
            const range = document.createRange();
            range.setStart(textSpan, 0);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
          }

          setNewNoteContent(editorRef.current?.innerHTML || '');
          updateFormattingState();
          return;
        }

        // Handle Enter inside an empty list item to exit list
        let li = node?.nodeType === 1 ? node.closest('li') : node?.parentElement?.closest('li');
        if (li) {
          const text = li.textContent.replace(/[\u200B\u00A0\s]/g, '');
          if (!text || text === '') {
            e.preventDefault();
            const parentList = li.closest('ul, ol');
            const p = document.createElement('p');
            p.innerHTML = '<br>';

            if (parentList) {
              if (parentList.children.length <= 1) {
                parentList.replaceWith(p);
              } else {
                parentList.parentElement?.insertBefore(p, parentList.nextSibling);
                li.remove();
              }
            }

            const range = document.createRange();
            range.setStart(p, 0);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);

            setNewNoteContent(editorRef.current?.innerHTML || '');
            updateFormattingState();
            return;
          }
        }
      }
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        editorRef.current?.focus();
        document.execCommand('insertImage', false, dataUrl);
        setNewNoteContent(editorRef.current?.innerHTML || '');
      };
      reader.readAsDataURL(file);
    } else {
      // Treat as text
      const reader = new FileReader();
      reader.onload = (event) => {
        const textContent = event.target.result;
        editorRef.current?.focus();
        document.execCommand('insertText', false, textContent);
        setNewNoteContent(editorRef.current?.innerHTML || '');
      };
      reader.readAsText(file);
    }

    e.target.value = null;
  };

  const cancelEdit = () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setNewNoteTitle('');
    setNewNoteContent('');
    initHistory('', '');
    setEditingNoteId(null);
    setIsComposing(false);
    try {
      sessionStorage.removeItem('nick_scribe_composing_state');
    } catch {}
  };

  const handleDeleteNote = (tab, id, e) => {
    e?.stopPropagation?.(); // prevent edit trigger
    const noteToDelete = (notebooks[tab] || []).find(n => n.id === id);
    if (!noteToDelete) return;

    const trashedNote = {
      ...noteToDelete,
      originalTab: tab,
      deletedAt: Date.now()
    };

    setTrash(prev => [trashedNote, ...prev.filter(n => n.id !== id)]);

    setNotebooks(prev => ({
      ...prev,
      [tab]: (prev[tab] || []).filter(n => n.id !== id)
    }));

    if (editingNoteIdRef.current === id) cancelEdit();
  };

  const handleRestoreNote = (id, e) => {
    e?.stopPropagation?.();
    const noteToRestore = trash.find(n => n.id === id);
    if (!noteToRestore) return;

    const targetTab = noteToRestore.originalTab || 'global';
    const cleanNote = {
      id: noteToRestore.id,
      title: noteToRestore.title || '',
      content: noteToRestore.content || '',
      timestamp: noteToRestore.timestamp || Date.now()
    };

    setNotebooks(prev => ({
      ...prev,
      [targetTab]: [cleanNote, ...(prev[targetTab] || [])]
    }));

    setTrash(prev => prev.filter(n => n.id !== id));
  };

  const handlePermanentDelete = (id, e) => {
    e?.stopPropagation?.();
    setTrash(prev => prev.filter(n => n.id !== id));
  };

  const handleEmptyTrash = () => {
    if (trash.length === 0) return;
    if (window.confirm('Are you sure you want to permanently empty the Recycle Bin? All deleted notes will be permanently removed.')) {
      setTrash([]);
    }
  };

  const tabs = Object.keys(notebooks);

  // Compute all notes for the 'all' tab
  const allNotes = [];
  Object.entries(notebooks).forEach(([domain, notes]) => {
    notes.forEach(n => {
      allNotes.push({ ...n, domain });
    });
  });
  allNotes.sort((a, b) => b.timestamp - a.timestamp);

  const activeNotes = activeTab === 'all'
    ? allNotes
    : activeTab === 'trash'
      ? trash
      : (notebooks[activeTab] || []);

  return createPortal(
    <div
      className={`mochi-scribe-panel-large ${isDocked ? 'docked' : ''}`}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="mochi-scribe-header-large">
        <div className="mochi-scribe-title-wrap">
          <span className="mochi-scribe-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </span>
          <h2>The Scribe</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="mochi-scribe-close-large"
            onClick={() => setIsDocked(!isDocked)}
            title={isDocked ? "Float" : "Dock to Sidebar"}
          >
            {isDocked ? (
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M3 9h18"></path></svg>
            ) : (
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M9 3v18"></path></svg>
            )}
          </button>
          <button className="mochi-scribe-close-large" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>

      <div className="mochi-scribe-body-large">
        {!isComposing && (
          <div className="mochi-scribe-sidebar-large">
            <div className="mochi-scribe-nav-section">
              <button
                className={`mochi-scribe-nav-item ${activeTab === 'global' ? 'active' : ''}`}
                onClick={() => handleTabChange('global')}
                title="Global Scratchpad"
              >
                <span className="site-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                </span>
              </button>
              <button
                className={`mochi-scribe-nav-item ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => handleTabChange('all')}
                title="All Notes"
              >
                <span className="site-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                  </svg>
                </span>
              </button>
            </div>

            <div className="mochi-scribe-nav-section">
              <div className="mochi-scribe-sidebar-divider" />
              <div className="mochi-scribe-site-list">
                {currentDomain && !tabs.includes(currentDomain) && (
                  <button
                    className={`mochi-scribe-nav-item site-item ${activeTab === currentDomain ? 'active' : ''}`}
                    onClick={() => handleTabChange(currentDomain)}
                    title={currentDomain}
                  >
                    <img src={`https://www.google.com/s2/favicons?domain=${currentDomain}&sz=32`} className="site-favicon" alt={currentDomain} />
                    <span className="site-badge-tiny current"></span>
                  </button>
                )}

                {tabs.filter(t => t !== 'global' && t !== 'trash').map(tab => {
                  const count = (notebooks[tab] || []).length;
                  if (count === 0 && tab !== currentDomain) return null;
                  return (
                    <button
                      key={tab}
                      className={`mochi-scribe-nav-item site-item ${activeTab === tab ? 'active' : ''}`}
                      onClick={() => handleTabChange(tab)}
                      title={`${tab} (${count})`}
                    >
                      <img src={`https://www.google.com/s2/favicons?domain=${tab}&sz=32`} className="site-favicon" alt={tab} />
                      {tab === currentDomain ? (
                        <span className="site-badge-tiny current"></span>
                      ) : (
                        <span className="site-badge-tiny">{count > 9 ? '9+' : count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mochi-scribe-nav-section mochi-scribe-nav-bottom">
              <div className="mochi-scribe-sidebar-divider" />
              <button
                className={`mochi-scribe-nav-item trash-item ${activeTab === 'trash' ? 'active' : ''}`}
                onClick={() => handleTabChange('trash')}
                title={`Recycle Bin (${trash.length})`}
              >
                <span className="site-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </span>
                {trash.length > 0 && (
                  <span className="site-badge-tiny trash-badge">{trash.length > 9 ? '9+' : trash.length}</span>
                )}
              </button>
            </div>
          </div>
        )}

        <div className="mochi-scribe-main-large">
          {!isComposing && (
            <div className="mochi-scribe-main-header">
              <h3>
                {activeTab === 'trash' ? 'Recycle Bin' :
                  activeTab === 'all' ? 'All Notes' :
                  activeTab === 'global' ? 'Global Scratchpad' :
                  activeTab}
              </h3>
              {activeTab === 'trash' ? (
                trash.length > 0 && (
                  <button
                    className="mochi-scribe-empty-trash-btn"
                    onClick={handleEmptyTrash}
                    title="Empty Recycle Bin"
                  >
                    <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Empty Trash
                  </button>
                )
              ) : activeTab !== 'all' ? (
                <button
                  className="mochi-scribe-add-small"
                  onClick={() => {
                    setIsComposing(true);
                    setNewNoteTitle('');
                    setNewNoteContent('');
                    initHistory('', '');
                    setEditingNoteId(null);
                    setSaveStatus('saved');
                    try {
                      sessionStorage.setItem('nick_scribe_composing_state', JSON.stringify({
                        isComposing: true,
                        editingNoteId: null,
                        tab: activeTab,
                        title: '',
                        content: '',
                        timestamp: Date.now()
                      }));
                    } catch {}
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  New
                </button>
              ) : null}
            </div>
          )}

          <div className="mochi-scribe-scroll-area">
            {isComposing && activeTab !== 'all' ? (
              <div className="mochi-scribe-composer-block full-height">
                <div className="mochi-scribe-composer-header-row">
                  <input
                    className="mochi-scribe-title-input"
                    value={newNoteTitle}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewNoteTitle(val);
                      pushHistorySnapshot(val, newNoteContent, false);
                    }}
                    onKeyDown={handleTitleKeyDown}
                    placeholder="Note Heading..."
                    autoFocus
                  />
                  {(newNoteTitle.trim() || newNoteContent.trim()) && (
                    <span className={`mochi-scribe-autosave-tag ${saveStatus}`}>
                      {saveStatus === 'saving' ? 'Saving...' : '✓ Saved'}
                    </span>
                  )}
                </div>
                <div className="mochi-scribe-rich-toolbar">
                  <button className={activeFormats.bold ? 'active' : ''} onClick={() => handleFormat('bold')} title="Bold"><strong>B</strong></button>
                  <button className={activeFormats.italic ? 'active' : ''} onClick={() => handleFormat('italic')} title="Italic"><em>I</em></button>
                  <button className={activeFormats.underline ? 'active' : ''} onClick={() => handleFormat('underline')} title="Underline"><u>U</u></button>
                  <div className="toolbar-divider" />
                  <button
                    className={activeFormats.h1 ? 'active' : ''}
                    onClick={() => handleToggleHeading('h1')}
                    title={activeFormats.h1 ? "H1 Active (Click to toggle off to normal text)" : "Heading 1 (Click again to turn off)"}
                  >
                    H1
                  </button>
                  <button
                    className={activeFormats.h2 ? 'active' : ''}
                    onClick={() => handleToggleHeading('h2')}
                    title={activeFormats.h2 ? "H2 Active (Click to toggle off to normal text)" : "Heading 2 (Click again to turn off)"}
                  >
                    H2
                  </button>
                  <div className="toolbar-divider" />

                  {/* Text / Heading Color Picker */}
                  <div className="toolbar-dropdown-container align-left">
                    <button
                      className={`toolbar-color-btn ${activeDropdown === 'text' ? 'open' : ''}`}
                      onClick={() => setActiveDropdown(activeDropdown === 'text' ? null : 'text')}
                      title="Text & Heading Color"
                    >
                      <span className="color-btn-letter">A</span>
                      <span className="color-strip" style={{ background: textColor }} />
                    </button>
                    {activeDropdown === 'text' && (
                      <div className="toolbar-palette-popover">
                        <div className="palette-title">Text Color</div>
                        <div className="palette-grid">
                          {TEXT_COLORS.map(c => (
                            <button
                              key={c.color}
                              className={`palette-swatch ${textColor === c.color ? 'selected' : ''}`}
                              style={{ background: c.color }}
                              title={c.name}
                              onClick={() => handleSelectTextColor(c.color)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Highlight Color Button & Dropdown */}
                  <div className="toolbar-dropdown-container align-left">
                    <div className="highlight-split-btn">
                      <button
                        className={`toolbar-highlight-main ${activeFormats.highlight ? 'active-highlight' : ''}`}
                        onClick={handleToggleHighlight}
                        title={activeFormats.highlight ? "Highlight active (Click again to disable)" : `Highlight (Color: ${highlightColor})`}
                        style={{
                          background: activeFormats.highlight ? highlightColor : '#FFF3E3'
                        }}
                      >
                        <span className="highlight-icon-glyph">✦</span>
                        <span className="color-strip" style={{ background: highlightColor }} />
                      </button>
                      <button
                        className={`highlight-arrow-btn ${activeDropdown === 'highlight' ? 'open' : ''}`}
                        onClick={() => setActiveDropdown(activeDropdown === 'highlight' ? null : 'highlight')}
                        title="Highlight Color Palette"
                      >
                        ▾
                      </button>
                    </div>
                    {activeDropdown === 'highlight' && (
                      <div className="toolbar-palette-popover">
                        <div className="palette-title">Highlight Color</div>
                        <div className="palette-grid">
                          {HIGHLIGHT_COLORS.map(c => (
                            <button
                              key={c.color}
                              className={`palette-swatch ${highlightColor === c.color ? 'selected' : ''}`}
                              style={{ background: c.color }}
                              title={c.name}
                              onClick={() => handleSelectHighlightColor(c.color)}
                            />
                          ))}
                          <button
                            className="palette-swatch clear-swatch"
                            title="Remove / Disable Highlight"
                            onClick={() => handleSelectHighlightColor('transparent')}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="toolbar-divider" />

                  {/* List & Pointer Styles */}
                  <div className="toolbar-dropdown-container align-right">
                    <div className="highlight-split-btn">
                      <button
                        className={`toolbar-highlight-main ${activeFormats.ul || activeFormats.ol ? 'active-highlight' : ''}`}
                        onClick={() => handleList('disc')}
                        title="Bullet List (•)"
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="9" y1="6" x2="20" y2="6"></line>
                          <line x1="9" y1="12" x2="20" y2="12"></line>
                          <line x1="9" y1="18" x2="20" y2="18"></line>
                          <circle cx="4" cy="6" r="1.5" fill="currentColor"></circle>
                          <circle cx="4" cy="12" r="1.5" fill="currentColor"></circle>
                          <circle cx="4" cy="18" r="1.5" fill="currentColor"></circle>
                        </svg>
                      </button>
                      <button
                        className={`highlight-arrow-btn ${activeDropdown === 'list' ? 'open' : ''}`}
                        onClick={() => setActiveDropdown(activeDropdown === 'list' ? null : 'list')}
                        title="Pointer & List Styles"
                      >
                        ▾
                      </button>
                    </div>
                    {activeDropdown === 'list' && (
                      <div className="toolbar-menu-popover">
                        <div className="palette-title">Bullet Pointers</div>
                        <button className="toolbar-menu-item" onClick={() => handleList('disc')}>
                          <span className="menu-icon">•</span> Bullet Point
                        </button>
                        <button className="toolbar-menu-item" onClick={() => handleList('arrow')}>
                          <span className="menu-icon">▸</span> Arrow Pointer
                        </button>
                        <button className="toolbar-menu-item" onClick={() => handleList('square')}>
                          <span className="menu-icon">■</span> Square Pointer
                        </button>
                        <button className="toolbar-menu-item" onClick={() => handleList('circle')}>
                          <span className="menu-icon">○</span> Circle Pointer
                        </button>
                        <button className="toolbar-menu-item" onClick={() => handleList('task')}>
                          <span className="menu-icon">☐</span> Task Checklist
                        </button>
                        <div className="toolbar-menu-divider" />
                        <div className="palette-title">Numbered</div>
                        <button className="toolbar-menu-item" onClick={() => handleList('numbered')}>
                          <span className="menu-icon">1.</span> 1, 2, 3...
                        </button>
                        <button className="toolbar-menu-item" onClick={() => handleList('alpha')}>
                          <span className="menu-icon">a.</span> a, b, c...
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Table Option */}
                  <div className="toolbar-dropdown-container align-right">
                    <button
                      className={`toolbar-btn-icon ${activeDropdown === 'table' ? 'open active' : ''}`}
                      onClick={() => setActiveDropdown(activeDropdown === 'table' ? null : 'table')}
                      title="Insert Table"
                    >
                      <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="3" y1="9" x2="21" y2="9"></line>
                        <line x1="3" y1="15" x2="21" y2="15"></line>
                        <line x1="12" y1="3" x2="12" y2="21"></line>
                      </svg>
                    </button>
                    {activeDropdown === 'table' && (
                      <div className="toolbar-menu-popover">
                        <div className="palette-title">Insert Table</div>
                        <button className="toolbar-menu-item" onClick={() => handleInsertTable(2, 2)}>
                          <span className="menu-icon">⊞</span> 2 × 2 Table
                        </button>
                        <button className="toolbar-menu-item" onClick={() => handleInsertTable(3, 3)}>
                          <span className="menu-icon">▦</span> 3 × 3 Table
                        </button>
                        <button className="toolbar-menu-item" onClick={() => handleInsertTable(4, 3)}>
                          <span className="menu-icon">▤</span> 4 × 3 Table
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="toolbar-divider" />

                  {/* Undo & Redo Options (After Table Option) */}
                  <button
                    type="button"
                    className="toolbar-btn-icon"
                    onClick={handleUndo}
                    disabled={!canUndo}
                    title="Undo (Ctrl+Z)"
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 7v6h6"></path>
                      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn-icon"
                    onClick={handleRedo}
                    disabled={!canRedo}
                    title="Redo (Ctrl+Y)"
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 7v6h-6"></path>
                      <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"></path>
                    </svg>
                  </button>

                  <div className="toolbar-divider" />

                  <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*,.txt,.md,.csv,.js,.jsx,.json" onChange={handleFileUpload} />
                  <button onClick={() => fileInputRef.current.click()} title="Add Attachment / Image" className="add-file-btn">
                    <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </button>
                </div>
                <div
                  className="mochi-scribe-textarea full-height-textarea rich-editor"
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => {
                    const html = e.currentTarget.innerHTML;
                    setNewNoteContent(html);
                    pushHistorySnapshot(newNoteTitle, html, false);
                  }}
                  onPaste={handlePaste}
                  onKeyUp={updateFormattingState}
                  onMouseUp={updateFormattingState}
                  onMouseDown={(e) => {
                    const target = e.target?.nodeType === 1 ? e.target : e.target?.parentElement;
                    const cell = target?.closest?.('th, td');
                    if (cell) {
                      lastActiveCellRef.current = cell;
                      lastActiveTableRef.current = cell.closest('table');
                    }
                    if (handleTableButtonInteraction(e)) return;
                    handleEditorMouseDown(e);
                  }}
                  onPointerDown={(e) => {
                    const target = e.target?.nodeType === 1 ? e.target : e.target?.parentElement;
                    const cell = target?.closest?.('th, td');
                    if (cell) {
                      lastActiveCellRef.current = cell;
                      lastActiveTableRef.current = cell.closest('table');
                    }
                    if (handleTableButtonInteraction(e)) return;
                  }}
                  onMouseMove={handleEditorMouseMove}
                  onClick={(e) => {
                    const target = e.target?.nodeType === 1 ? e.target : e.target?.parentElement;
                    const clickedCell = target?.closest?.('th, td');
                    if (clickedCell) {
                      lastActiveCellRef.current = clickedCell;
                      lastActiveTableRef.current = clickedCell.closest('table');
                    } else {
                      const clickedTable = target?.closest?.('table');
                      if (clickedTable) {
                        lastActiveTableRef.current = clickedTable;
                      }
                    }

                    if (handleTableButtonInteraction(e)) return;

                    if (target?.matches?.('input[type="checkbox"]')) {
                      if (target.checked) {
                        target.setAttribute('checked', 'checked');
                      } else {
                        target.removeAttribute('checked');
                      }
                      setNewNoteContent(editorRef.current?.innerHTML || '');
                      return;
                    }

                    if (target?.tagName === 'IMG') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleOpenFullscreenImage(target);
                      return;
                    }

                    // If clicked on editor container below a table, or on scribe-after-table
                    if (e.target === editorRef.current || e.target.classList.contains('scribe-after-table')) {
                      let targetP = e.target.classList.contains('scribe-after-table') ? e.target : null;
                      if (!targetP) {
                        const wraps = editorRef.current.querySelectorAll('.scribe-table-wrap');
                        if (wraps.length > 0) {
                          const lastWrap = wraps[wraps.length - 1];
                          let p = lastWrap.nextElementSibling;
                          if (!p || !p.classList.contains('scribe-after-table')) {
                            p = document.createElement('p');
                            p.className = 'scribe-after-table';
                            p.setAttribute('contenteditable', 'true');
                            p.innerHTML = '<br>';
                            lastWrap.parentElement?.insertBefore(p, lastWrap.nextSibling);
                          }
                          targetP = p;
                        }
                      }
                      if (targetP) {
                        const range = document.createRange();
                        range.selectNodeContents(targetP);
                        range.collapse(false);
                        const sel = window.getSelection();
                        sel?.removeAllRanges();
                        sel?.addRange(range);
                        setNewNoteContent(editorRef.current?.innerHTML || '');
                      }
                    }
                  }}
                  onKeyDown={handleEditorKeyDown}
                  data-placeholder="Start typing..."
                  spellCheck="false"
                />

                <div className="mochi-scribe-composer-footer">
                  <button
                    type="button"
                    className="download-footer-btn icon-only"
                    onClick={() => handleDownloadPdf({
                      title: newNoteTitle || 'Untitled Note',
                      content: newNoteContent,
                      timestamp: Date.now()
                    })}
                    title="Export Note as PDF"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                  </button>
                  <div className="mochi-scribe-actions">
                    <button className="mochi-scribe-btn secondary" onClick={cancelEdit}>Back</button>
                    <button className="mochi-scribe-btn primary" onClick={handleAddNote}>
                      Done
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mochi-scribe-notes-grid">
                {activeNotes.length === 0 ? (
                  <div className="mochi-scribe-empty-state">
                    <div className="empty-icon">{activeTab === 'trash' ? '🗑️' : '🍃'}</div>
                    <p>{activeTab === 'trash' ? 'Recycle Bin is empty.' : 'No notes exist in this space yet.'}</p>
                  </div>
                ) : (
                  activeNotes.map(note => (
                    <div
                      key={note.id}
                      className={`mochi-scribe-card-rich ${activeTab === 'trash' ? 'trash-card' : ''}`}
                      onClick={() => activeTab !== 'trash' && handleEditNote(note, note.domain)}
                    >
                      <div className="card-rich-header">
                        <h4 className="card-rich-title">
                          {note.title || (note.content ? note.content.replace(/<[^>]*>?/gm, '').substring(0, 30) + '...' : 'Untitled Note')}
                        </h4>
                      </div>
                      {note.content && (
                        <div className="card-rich-preview">
                          {note.content.replace(/<[^>]*>?/gm, ' ').trim().substring(0, 80) || (note.content.includes('<img') ? '📷 [Image attachment]' : '')}
                        </div>
                      )}
                      <div className="card-rich-footer">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="card-rich-date">
                            {activeTab === 'trash'
                              ? `Deleted ${new Date(note.deletedAt || note.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                              : new Date(note.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {(activeTab === 'all' || activeTab === 'trash') && (
                            <>
                              <span style={{ color: '#D4C4B7' }}>•</span>
                              <span className="card-rich-domain">
                                {activeTab === 'trash'
                                  ? (note.originalTab === 'global' ? 'Global' : note.originalTab)
                                  : (note.domain === 'global' ? 'Global' : note.domain)}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="card-rich-actions" onClick={(e) => e.stopPropagation()}>
                          {activeTab === 'trash' ? (
                            <>
                              <button
                                className="card-rich-action-btn card-rich-restore"
                                onClick={(e) => handleRestoreNote(note.id, e)}
                                title="Restore Note"
                              >
                                <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="1 4 1 10 7 10"></polyline>
                                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                                </svg>
                              </button>
                              <button
                                className="card-rich-action-btn card-rich-delete-perm"
                                onClick={(e) => handlePermanentDelete(note.id, e)}
                                title="Delete Permanently"
                              >
                                <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="18" y1="6" x2="6" y2="18"></line>
                                  <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="card-rich-action-btn card-rich-download"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadPdf(note);
                                }}
                                title="Download Note (PDF)"
                              >
                                <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                  <polyline points="7 10 12 15 17 10"></polyline>
                                  <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                              </button>
                              <button
                                className="card-rich-action-btn card-rich-delete"
                                onClick={(e) => handleDeleteNote(note.domain || activeTab, note.id, e)}
                                title="Move to Recycle Bin"
                              >
                                <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {fullscreenImage && (
        <div
          className="mochi-scribe-lightbox"
          onClick={handleCloseFullscreenImage}
        >
          <div className="mochi-scribe-lightbox-header" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-title">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <span>Image Full View</span>
            </div>
            <div className="lightbox-actions">
              <button
                type="button"
                className="lightbox-tool-btn"
                onClick={handleZoomOut}
                title="Zoom Out (−)"
              >
                −
              </button>
              <button
                type="button"
                className="lightbox-tool-btn zoom-indicator"
                onClick={handleResetZoom}
                title="Reset Zoom (Fit to View)"
              >
                {Math.round(imageZoom * 100)}%
              </button>
              <button
                type="button"
                className="lightbox-tool-btn"
                onClick={handleZoomIn}
                title="Zoom In (＋)"
              >
                ＋
              </button>
              <button
                type="button"
                className="lightbox-tool-btn delete-btn"
                onClick={handleDeleteFullscreenImage}
                title="Delete Image from Note"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
              <button
                type="button"
                className="lightbox-tool-btn close-btn"
                onClick={handleCloseFullscreenImage}
                title="Close (Esc)"
              >
                ✕
              </button>
            </div>
          </div>
          <div
            className="mochi-scribe-lightbox-content"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={fullscreenImage}
              alt="Full view attachment"
              style={{ transform: `scale(${imageZoom})` }}
              onDoubleClick={handleToggleZoom}
              title="Double-click to toggle zoom"
            />
          </div>
          <div className="lightbox-footer-tip" onClick={(e) => e.stopPropagation()}>
            Double-click to zoom • Esc or click backdrop to close
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
