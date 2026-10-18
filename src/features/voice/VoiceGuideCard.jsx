import React, { useState } from 'react';
import './VoiceGuideCard.css';

// Crisp, themed SVG icons matching Nick's 2D retro aesthetic
const IconBook = ({ size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    <line x1="8" y1="7" x2="16" y2="7"/>
    <line x1="8" y1="11" x2="13" y2="11"/>
  </svg>
);

const IconKeyboard = ({ size = 14 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="3" ry="3"/>
    <line x1="6" y1="8" x2="6" y2="8.01"/>
    <line x1="10" y1="8" x2="10" y2="8.01"/>
    <line x1="14" y1="8" x2="14" y2="8.01"/>
    <line x1="18" y1="8" x2="18" y2="8.01"/>
    <line x1="6" y1="12" x2="6" y2="12.01"/>
    <line x1="18" y1="12" x2="18" y2="12.01"/>
    <line x1="9" y1="16" x2="15" y2="16"/>
  </svg>
);

const IconMic = ({ size = 14 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="22"/>
    <line x1="8" y1="22" x2="16" y2="22"/>
  </svg>
);

const IconTools = ({ size = 15 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>
);

const IconPalette = ({ size = 15 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="13.5" cy="6.5" r="1.5" fill="currentColor"/>
    <circle cx="17.5" cy="10.5" r="1.5" fill="currentColor"/>
    <circle cx="8.5" cy="7.5" r="1.5" fill="currentColor"/>
    <circle cx="6.5" cy="12.5" r="1.5" fill="currentColor"/>
    <path d="M12 2C6.5 2 2 6.5 2 12c0 3.6 2 5.5 4 5.5 1.1 0 2.1-.5 2.5-1.5.3-.8 1-1.5 2-1.5h1.5c4.4 0 8-3.6 8-8 0-4.4-3.6-4.5-8-4.5z"/>
  </svg>
);

const IconFox = ({ size = 15 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3 5 8 19 12 15 16 19 21 5 16 9 8 9 3 5"/>
    <line x1="9" y1="12" x2="9.01" y2="12"/>
    <line x1="15" y1="12" x2="15.01" y2="12"/>
  </svg>
);

const IconPlay = ({ size = 10 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    <polygon points="6 4 20 12 6 20 6 4"/>
  </svg>
);

const IconBulb = ({ size = 14 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18h6"/>
    <path d="M10 22h4"/>
    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5h6.18z"/>
  </svg>
);

const IconCheck = ({ size = 11 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const COMMAND_CATEGORIES = [
  {
    category: 'Developer Tools',
    icon: <IconTools />,
    items: [
      {
        phrases: ['"open scribe"', '"notes"', '"notepad"'],
        desc: 'Open persistent scratchpad & tables',
        action: 'SCRIBE',
        payload: null
      },
      {
        phrases: ['"scout"', '"inspect"', '"analyze"'],
        desc: 'SEO, performance & meta audits',
        action: 'SCOUT',
        payload: null
      },
      {
        phrases: ['"take screenshot"', '"sketcher"', '"draw"'],
        desc: 'Capture screen & annotate canvas',
        action: 'SKETCHER',
        payload: null
      },
      {
        phrases: ['"compressor"', '"compress image"', '"avif"'],
        desc: 'Ultra-fast in-browser AVIF squashing',
        action: 'COMPRESSOR',
        payload: null
      }
    ]
  },
  {
    category: 'Design & Inspection',
    icon: <IconPalette />,
    items: [
      {
        phrases: ['"colors"', '"palette"', '"swatches"'],
        desc: 'Sniff all page colors & copy hexes',
        action: 'FORAGER',
        payload: 'palette'
      },
      {
        phrases: ['"tech stack"', '"frameworks"', '"libraries"'],
        desc: 'Detect libraries, bundlers & engines',
        action: 'FORAGER',
        payload: 'stack'
      },
      {
        phrases: ['"assets"', '"svgs"', '"extract images"'],
        desc: 'Download icons, SVGs & raster images',
        action: 'FORAGER',
        payload: 'assets'
      },
      {
        phrases: ['"x-ray"', '"illusionist"'],
        desc: 'Toggle interactive layout hover inspector',
        action: 'TYPOGRAPHER',
        payload: 'illusionist'
      },
      {
        phrases: ['"wireframe"', '"blueprint"'],
        desc: 'Transform site into clean wireframes',
        action: 'TYPOGRAPHER',
        payload: 'wireframer'
      }
    ]
  },
  {
    category: 'Nick & Companion',
    icon: <IconFox />,
    items: [
      {
        phrases: ['"go to sleep"', '"rest"', '"nap"'],
        desc: 'Put Nick into quiet snoozing rest',
        action: 'TOGGLE_SLEEP',
        payload: null
      },
      {
        phrases: ['"wake up"', '"awake"'],
        desc: 'Wake Nick up to active mode',
        action: 'TOGGLE_SLEEP',
        payload: null
      },
      {
        phrases: ['"come here"', '"home"', '"den"'],
        desc: 'Call Nick back to bottom dock corner',
        action: 'COME_HERE',
        payload: null
      },
      {
        phrases: ['"close"', '"hide"', '"dismiss"'],
        desc: 'Close open panels or overlays',
        action: 'CLOSE',
        payload: null
      }
    ]
  }
];

export default function VoiceGuideCard({ onClose, onAction, align = 'right' }) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'keys' | 'commands'
  const [copiedPhrase, setCopiedPhrase] = useState(null);

  const handleRunCommand = (action, payload) => {
    if (onAction) {
      onAction(action, payload);
    }
  };

  const handleCopyPhrase = (phrase) => {
    const cleanText = phrase.replace(/^"|"$/g, '');
    try {
      navigator.clipboard.writeText(cleanText);
      setCopiedPhrase(phrase);
      setTimeout(() => setCopiedPhrase(null), 1500);
    } catch {
      // Ignore clipboard write failures
    }
  };

  return (
    <div
      className={`mochi-voice-guide-wrapper ${align === 'left' ? 'align-left' : ''}`}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mochi-voice-guide-card">
        {/* Header */}
        <div className="mochi-guide-header">
          <div className="mochi-guide-title">
            <span className="mochi-guide-icon">
              <IconBook size={18} />
            </span>
            <span>Nick's Command Guide</span>
          </div>
          <button
            type="button"
            className="mochi-guide-close-btn"
            onClick={onClose}
            title="Close guide"
          >
            ✕
          </button>
        </div>

        {/* Tab filters */}
        <div className="mochi-guide-tabs">
          <button
            type="button"
            className={`mochi-guide-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Guide
          </button>
          <button
            type="button"
            className={`mochi-guide-tab ${activeTab === 'keys' ? 'active' : ''}`}
            onClick={() => setActiveTab('keys')}
          >
            <IconKeyboard size={13} />
            <span>Shortcuts</span>
          </button>
          <button
            type="button"
            className={`mochi-guide-tab ${activeTab === 'commands' ? 'active' : ''}`}
            onClick={() => setActiveTab('commands')}
          >
            <IconMic size={13} />
            <span>Voice Sayables</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="mochi-guide-scroll-body">
          {/* Section 1: Keyboard Shortcuts */}
          {(activeTab === 'all' || activeTab === 'keys') && (
            <div className="mochi-guide-section">
              <div className="mochi-section-heading">
                <span className="mochi-heading-with-icon">
                  <IconKeyboard size={14} />
                  <span>Keyboard Shortcuts</span>
                </span>
              </div>

              <div className="mochi-shortcuts-grid">
                <div className="mochi-shortcut-item">
                  <div className="mochi-keys-combo">
                    <kbd>Alt</kbd> + <kbd>V</kbd>
                  </div>
                  <div className="mochi-shortcut-desc">
                    <strong>Voice Listening:</strong> Tap to toggle listening, or hold down to talk (push-to-talk).
                  </div>
                </div>

                <div className="mochi-shortcut-item">
                  <div className="mochi-keys-combo">
                    <kbd>Alt</kbd> + <kbd>S</kbd>
                  </div>
                  <div className="mochi-shortcut-desc">
                    <strong>Sleep / Wake:</strong> Toggle Nick's sleep mode anytime.
                  </div>
                </div>

                <div className="mochi-shortcut-item">
                  <div className="mochi-keys-combo">
                    <kbd>Alt</kbd> + <kbd>C</kbd>
                  </div>
                  <div className="mochi-shortcut-desc">
                    <strong>Call Home:</strong> Return Nick back to his comfortable corner dock.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Voice Sayable Commands */}
          {(activeTab === 'all' || activeTab === 'commands') && (
            <div className="mochi-guide-section">
              <div className="mochi-section-heading">
                <span className="mochi-heading-with-icon">
                  <IconMic size={14} />
                  <span>What You Can Say to Nick</span>
                </span>
                <span className="mochi-section-sub">Click any command to try it now!</span>
              </div>

              {COMMAND_CATEGORIES.map((cat) => (
                <div key={cat.category} className="mochi-cat-group">
                  <div className="mochi-cat-title">
                    <span className="mochi-cat-icon">{cat.icon}</span>
                    <span>{cat.category}</span>
                  </div>

                  <div className="mochi-cmd-items-list">
                    {cat.items.map((item, idx) => (
                      <div key={idx} className="mochi-cmd-row">
                        <div className="mochi-cmd-phrases-col">
                          <div className="mochi-phrases-wrap">
                            {item.phrases.map((phrase, pIdx) => (
                              <button
                                key={pIdx}
                                type="button"
                                className="mochi-phrase-pill"
                                onClick={() => handleCopyPhrase(phrase)}
                                title="Click to copy voice phrase"
                              >
                                {copiedPhrase === phrase ? (
                                  <span className="mochi-copied-inner">
                                    <IconCheck size={10} /> Copied
                                  </span>
                                ) : (
                                  phrase
                                )}
                              </button>
                            ))}
                          </div>
                          <div className="mochi-cmd-desc">{item.desc}</div>
                        </div>

                        <button
                          type="button"
                          className="mochi-cmd-try-btn"
                          onClick={() => handleRunCommand(item.action, item.payload)}
                          title="Try this action now"
                        >
                          <IconPlay size={9} />
                          <span>Try</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer tip */}
        <div className="mochi-guide-footer">
          <IconBulb size={14} />
          <span>Tip: You can say <em>Help</em> or <em>Commands</em> while Nick is listening!</span>
        </div>
      </div>
    </div>
  );
}
