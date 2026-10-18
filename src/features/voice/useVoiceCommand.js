import { useState, useEffect, useCallback, useRef } from 'react';

const CONFIRMATION_MESSAGES = {
  SCRIBE: "Got it, opening Scribe!",
  SKETCHER: "On it, snapshot time!",
  SCOUT: "Inspecting the page!",
  FORAGER_PALETTE: "Hunting down colors!",
  FORAGER_ASSETS: "Grabbing all the assets!",
  FORAGER_STACK: "Checking the tech stack!",
  FORAGER: "Sniffing the site out!",
  TYPOGRAPHER_XRAY: "X-Ray goggles on!",
  TYPOGRAPHER_WIREFRAME: "Wireframe mode on!",
  TYPOGRAPHER_TYPOGRAPHY: "Checking your fonts!",
  TYPOGRAPHER: "Opening Designer!",
  COMPRESSOR: "Squashing images!",
  TOGGLE_SLEEP: "Nap time! Wake me anytime",
  WAKE: "I'm awake and ready!",
  CLOSE: "Closed that for you!",
  COME_HERE: "Right here beside you!",
  GUIDE: "Opening command guide!"
};

// Casual helpful hints when speech is not understood
const RETRY_MESSAGES = [
  "Missed that! Try: Open Scribe or Screenshot",
  "Didn't catch that, say it again?",
  "Try saying: Colors, Notes, or Inspect!"
];

// Normalize common spelling & speech variants
function normalizeText(str) {
  return str
    .toLowerCase()
    .replace(/\bcolours?\b/g, 'color')
    .replace(/\banalyse\b/g, 'analyze')
    .replace(/\boptimise\b/g, 'optimize')
    .trim();
}

// Intelligent voice command matcher with natural phrases, plurals, and phonetic whisper aliases
function matchVoiceCommand(rawTranscript) {
  if (!rawTranscript || typeof rawTranscript !== 'string') return null;
  const text = normalizeText(rawTranscript);

  // 1. Scribe / Notes (including soft phonetic whisper aliases: describe, skype, subscribe, tribe, skribe, scry, write, bribe, jot)
  if (
    text.includes('scribe') ||
    /\bnotes?\b/.test(text) ||
    text.includes('notepad') ||
    text.includes('scratchpad') ||
    text.includes('write note') ||
    text.includes('take note') ||
    text.includes('take a note') ||
    text.includes('make note') ||
    text.includes('jot down') ||
    text.includes('notebook') ||
    text.includes('jot') ||
    /\b(describe|skype|subscribe|subscriber|tribe|skribe|scry|bribe)\b/.test(text)
  ) {
    return {
      action: 'SCRIBE',
      payload: null,
      feedback: CONFIRMATION_MESSAGES.SCRIBE
    };
  }

  // 2. Sketcher / Screenshot / Draw (including whisper aliases: snap, shoot, screen capture, catch)
  if (
    text.includes('sketcher') ||
    text.includes('screenshot') ||
    text.includes('screen shot') ||
    text.includes('capture screen') ||
    text.includes('screen capture') ||
    text.includes('take a screenshot') ||
    text.includes('take screenshot') ||
    text.includes('capture') ||
    text.includes('stretcher') ||
    text.includes('snapshot') ||
    /\b(snap|photo|picture|draw|shoot)\b/.test(text)
  ) {
    return {
      action: 'SKETCHER',
      payload: null,
      feedback: CONFIRMATION_MESSAGES.SKETCHER
    };
  }

  // 3. Scout / SEO / Audit / Inspector (including whisper aliases: inspect, stout, scald, audit)
  if (
    text.includes('scout') ||
    text.includes('analyze') ||
    text.includes('analysis') ||
    text.includes('inspect') ||
    text.includes('inspector') ||
    /\bseo\b/.test(text) ||
    text.includes('audit') ||
    text.includes('stout') ||
    text.includes('scald') ||
    text.includes('check page')
  ) {
    return {
      action: 'SCOUT',
      payload: null,
      feedback: CONFIRMATION_MESSAGES.SCOUT
    };
  }

  // 4. Sniffer / Media / Assets / Colors / Tech Stack
  // Check sub-features of Sniffer first:
  if (
    text.includes('palette') ||
    /\bcolors?\b/.test(text) ||
    text.includes('pallet') ||
    /\bshades?\b/.test(text) ||
    text.includes('swatch')
  ) {
    return {
      action: 'FORAGER',
      payload: 'palette',
      feedback: CONFIRMATION_MESSAGES.FORAGER_PALETTE
    };
  }
  if (
    /\bassets?\b/.test(text) ||
    /\bsvgs?\b/.test(text) ||
    /\bicons?\b/.test(text) ||
    /\bimages?\b/.test(text) ||
    text.includes('extract media') ||
    text.includes('extract image')
  ) {
    return {
      action: 'FORAGER',
      payload: 'assets',
      feedback: CONFIRMATION_MESSAGES.FORAGER_ASSETS
    };
  }
  if (
    text.includes('tech stack') ||
    text.includes('framework') ||
    text.includes('technologies') ||
    text.includes('technology') ||
    /\bstack\b/.test(text) ||
    text.includes('libraries') ||
    text.includes('dependencies')
  ) {
    return {
      action: 'FORAGER',
      payload: 'stack',
      feedback: CONFIRMATION_MESSAGES.FORAGER_STACK
    };
  }
  if (
    text.includes('sniffer') ||
    text.includes('forager') ||
    text.includes('extract') ||
    text.includes('sneaker') ||
    text.includes('snapper') ||
    /\bsniff\b/.test(text)
  ) {
    return {
      action: 'FORAGER',
      payload: null,
      feedback: CONFIRMATION_MESSAGES.FORAGER
    };
  }

  // 5. Designer / Typography / X-Ray / Wireframe
  if (
    text.includes('xray') ||
    text.includes('x-ray') ||
    text.includes('x ray') ||
    text.includes('illusionist')
  ) {
    return {
      action: 'TYPOGRAPHER',
      payload: 'illusionist',
      feedback: CONFIRMATION_MESSAGES.TYPOGRAPHER_XRAY
    };
  }
  if (
    text.includes('wireframe') ||
    text.includes('wireframer') ||
    text.includes('wire framing') ||
    text.includes('wire frames') ||
    /\bblueprint\b/.test(text)
  ) {
    return {
      action: 'TYPOGRAPHER',
      payload: 'wireframer',
      feedback: CONFIRMATION_MESSAGES.TYPOGRAPHER_WIREFRAME
    };
  }
  if (
    text.includes('typography') ||
    /\bfonts?\b/.test(text) ||
    /\btype\b/.test(text)
  ) {
    return {
      action: 'TYPOGRAPHER',
      payload: 'typography',
      feedback: CONFIRMATION_MESSAGES.TYPOGRAPHER_TYPOGRAPHY
    };
  }
  if (
    text.includes('designer') ||
    /\bdesigns?\b/.test(text) ||
    text.includes('diner')
  ) {
    return {
      action: 'TYPOGRAPHER',
      payload: null,
      feedback: CONFIRMATION_MESSAGES.TYPOGRAPHER
    };
  }

  // 6. Compressor
  if (
    text.includes('compressor') ||
    text.includes('compress') ||
    text.includes('compression') ||
    text.includes('avif') ||
    text.includes('optimize image') ||
    text.includes('professor') ||
    /\bsquash\b/.test(text) ||
    text.includes('shrink image')
  ) {
    return {
      action: 'COMPRESSOR',
      payload: null,
      feedback: CONFIRMATION_MESSAGES.COMPRESSOR
    };
  }

  // 7. Sleep / Wake Mode
  if (
    text.includes('wake up') ||
    text.includes('awake') ||
    text.includes('rise and shine') ||
    text.includes('get up')
  ) {
    return {
      action: 'TOGGLE_SLEEP',
      payload: null,
      feedback: CONFIRMATION_MESSAGES.WAKE
    };
  }
  if (
    text.includes('sleep') ||
    text.includes('go to sleep') ||
    text.includes('rest') ||
    text.includes('nap') ||
    text.includes('goodnight') ||
    text.includes('snooze') ||
    /\bbed\b/.test(text)
  ) {
    return {
      action: 'TOGGLE_SLEEP',
      payload: null,
      feedback: CONFIRMATION_MESSAGES.TOGGLE_SLEEP
    };
  }

  // 8. Close / Dismiss
  if (
    text.includes('close') ||
    text.includes('minimize') ||
    text.includes('hide') ||
    text.includes('dismiss') ||
    text.includes('bye') ||
    text.includes('exit') ||
    /\bquit\b/.test(text)
  ) {
    return {
      action: 'CLOSE',
      payload: null,
      feedback: CONFIRMATION_MESSAGES.CLOSE
    };
  }

  // 9. Call Nick back to Task / Den mode
  if (
    text.includes('come here') ||
    text.includes('come back') ||
    text.includes('den') ||
    text.includes('home') ||
    text.includes('here nick') ||
    /\b(come|back)\b/.test(text)
  ) {
    return {
      action: 'COME_HERE',
      payload: null,
      feedback: CONFIRMATION_MESSAGES.COME_HERE
    };
  }

  // 10. Help / Guide / Commands / Shortcuts
  if (
    text.includes('help') ||
    text.includes('guide') ||
    text.includes('commands') ||
    text.includes('shortcuts') ||
    text.includes('shortcut') ||
    text.includes('cheat sheet') ||
    text.includes('what can you do') ||
    text.includes('what can i say')
  ) {
    return {
      action: 'GUIDE',
      payload: null,
      feedback: CONFIRMATION_MESSAGES.GUIDE
    };
  }

  return null;
}

export function useVoiceCommand(onCommand) {
  const [isListening, setIsListening] = useState(false);
  const [isMicReady, setIsMicReady] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const [voiceFeedback, setVoiceFeedback] = useState(null);

  // Microphone permission management
  const [showPermissionCard, setShowPermissionCard] = useState(false);
  const [permissionStep, setPermissionStep] = useState('prompt'); // 'prompt' | 'requesting' | 'denied'
  const micPermissionRef = useRef('prompt'); // 'granted' | 'prompt' | 'denied'

  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const commandExecutedRef = useRef(false);
  const silenceTimerRef = useRef(null);

  // Monitor microphone permission state
  useEffect(() => {
    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: 'microphone' }).then(status => {
        micPermissionRef.current = status.state;
        status.onchange = () => {
          micPermissionRef.current = status.state;
          if (status.state === 'granted') {
            setShowPermissionCard(false);
          } else if (status.state === 'denied') {
            setPermissionStep('denied');
          }
        };
      }).catch(() => {});
    }
  }, []);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const clearVoiceFeedback = useCallback(() => {
    setVoiceFeedback(null);
  }, []);

  const stopListening = useCallback((suppressFeedback = false) => {
    clearSilenceTimer();
    const wasListening = isListeningRef.current;
    isListeningRef.current = false;
    setIsListening(false);
    setIsMicReady(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }

    if (wasListening && !commandExecutedRef.current && !suppressFeedback) {
      const randomRetry = RETRY_MESSAGES[Math.floor(Math.random() * RETRY_MESSAGES.length)];
      setVoiceFeedback(randomRetry);
      setTimeout(() => setVoiceFeedback(null), 2500);
    }

    setTimeout(() => setTranscript(''), 1000);
  }, [clearSilenceTimer]);

  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      if (isListeningRef.current && !commandExecutedRef.current) {
        stopListening(false);
      }
    }, 7000);
  }, [clearSilenceTimer, stopListening]);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice not supported in this browser.");
      return;
    }

    clearSilenceTimer();
    setError(null);
    setVoiceFeedback(null);
    setTranscript('');

    // Instant synchronous UI update: Nick enters listening mode in 0ms (showing "Tuning in...")
    setIsListening(true);
    setIsMicReady(false);
    isListeningRef.current = true;
    commandExecutedRef.current = false;

    // Immediately abort any lingering instance with zero teardown latency
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    // Adapt to user's localized English acoustic model (e.g. en-IN, en-GB, en-US)
    recognition.lang = navigator.language || 'en-US';

    const onAudioReady = () => {
      setIsMicReady(true);
      resetSilenceTimer();
    };

    recognition.onstart = onAudioReady;
    recognition.onaudiostart = onAudioReady;

    recognition.onresult = (event) => {
      resetSilenceTimer();

      let currentTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }

      const trimmed = currentTranscript.trim();
      setTranscript(trimmed);

      // Real-time instant matching on speech chunk
      const matched = matchVoiceCommand(trimmed);
      if (matched && !commandExecutedRef.current) {
        commandExecutedRef.current = true;
        isListeningRef.current = false;
        setIsListening(false);
        setIsMicReady(false);
        clearSilenceTimer();

        // Casual interactive confirmation bubble
        setVoiceFeedback(matched.feedback);
        setTimeout(() => setVoiceFeedback(null), 2200);

        // Execute action
        onCommand(matched.action, matched.payload);

        // Instant clean release
        try {
          recognition.abort();
        } catch {}

        setTimeout(() => setTranscript(''), 1000);
      }
    };

    recognition.onerror = (event) => {
      clearSilenceTimer();
      if (event.error === 'not-allowed') {
        micPermissionRef.current = 'denied';
        setPermissionStep('denied');
        setShowPermissionCard(true);
        isListeningRef.current = false;
        setIsListening(false);
        setIsMicReady(false);
      } else if (event.error === 'no-speech') {
        // Handled naturally by silence timer
      } else if (event.error !== 'aborted') {
        setError("Voice error.");
        isListeningRef.current = false;
        setIsListening(false);
        setIsMicReady(false);
      }
    };

    recognition.onend = () => {
      clearSilenceTimer();
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch {}
      } else {
        setIsListening(false);
        setIsMicReady(false);
      }
    };

    try {
      recognition.start();
      resetSilenceTimer();
    } catch (e) {
      setError("Mic error.");
      isListeningRef.current = false;
      setIsListening(false);
      setIsMicReady(false);
    }
  }, [clearSilenceTimer, onCommand, resetSilenceTimer, stopListening]);

  // Entry point: checks permission before launching or shows permission card
  const triggerVoice = useCallback(async () => {
    if (isListeningRef.current) {
      stopListening(true);
      return;
    }

    let currentState = micPermissionRef.current;
    if (navigator.permissions?.query) {
      try {
        const status = await navigator.permissions.query({ name: 'microphone' });
        currentState = status.state;
        micPermissionRef.current = status.state;
      } catch {}
    }

    if (currentState === 'granted') {
      startListening();
    } else if (currentState === 'denied') {
      setPermissionStep('denied');
      setShowPermissionCard(true);
    } else {
      // First time on this website: display the onboarding permission card!
      setPermissionStep('prompt');
      setShowPermissionCard(true);
    }
  }, [startListening, stopListening]);

  // Request browser permission directly from user click
  const requestMicPermission = useCallback(async () => {
    setPermissionStep('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop stream tracks immediately so red indicator doesn't linger
      stream.getTracks().forEach(track => track.stop());
      micPermissionRef.current = 'granted';
      setShowPermissionCard(false);
      // Seamlessly start listening right away!
      startListening();
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        micPermissionRef.current = 'denied';
        setPermissionStep('denied');
      } else {
        setError("Could not access microphone.");
        setShowPermissionCard(false);
      }
    }
  }, [startListening]);

  const dismissPermissionCard = useCallback(() => {
    setShowPermissionCard(false);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearSilenceTimer();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [clearSilenceTimer]);

  return {
    isListening,
    isMicReady,
    transcript,
    error,
    voiceFeedback,
    triggerVoice,
    startListening,
    stopListening,
    clearVoiceFeedback,
    showPermissionCard,
    permissionStep,
    requestMicPermission,
    dismissPermissionCard
  };
}
