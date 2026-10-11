import { useState, useEffect, useRef, useCallback } from 'react';
import { browserAPI } from '../../../core/browser';

export function useMovement() {
  const [cornerPos, setCornerPos] = useState({ x: 0, y: 0 }); // Corner position
  const [charOffset, setCharOffset] = useState({ x: 0, y: 0 }); // Fox offset from corner
  const [rotation, setRotation] = useState(0);
  const [facingRight, setFacingRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [transitionDuration, setTransitionDuration] = useState(0);
  const [charOpacity, setCharOpacity] = useState(1);
  const [mode, setMode] = useState('initial'); // 'initial' | 'peeking' | 'task'

  const dragStartRef = useRef({ pointerX: 0, pointerY: 0, elementX: 0, elementY: 0 });
  const cornerPosRef = useRef(cornerPos);
  cornerPosRef.current = cornerPos;
  const charOffsetRef = useRef(charOffset);
  charOffsetRef.current = charOffset;
  const isDraggingRef = useRef(isDragging);
  isDraggingRef.current = isDragging;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // Track the current hide position so we can retreat to it when entering task mode
  const currentHidePosRef = useRef({ x: 170, y: 170 }); 
  const lastEdgeRef = useRef(null); 

  // --- DRAGGING LOGIC ---
  const handlePointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    
    setIsDragging(true);
    setTransitionDuration(0);
    setCharOpacity(1);
    setRotation(0); // Upright when grabbed
    setCharOffset({ x: 0, y: 0 }); // Snap fox back to den if dragging

    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      elementX: cornerPosRef.current.x,
      elementY: cornerPosRef.current.y
    };
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e) => {
      const dx = e.clientX - dragStartRef.current.pointerX;
      const dy = e.clientY - dragStartRef.current.pointerY;
      
      let newX = dragStartRef.current.elementX + dx;
      let newY = dragStartRef.current.elementY + dy;

      const minX = -(window.innerWidth - 180); // width of fox corner
      const maxX = 0;
      const minY = -(window.innerHeight - 180);
      const maxY = 0;

      newX = Math.max(minX, Math.min(maxX, newX));
      newY = Math.max(minY, Math.min(maxY, newY));

      setCornerPos({ x: newX, y: newY });
      
      if (Math.abs(dx) > 1) {
        setFacingRight(dx > 0);
      }
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      
      if (modeRef.current === 'task') {
        setTransitionDuration(0.5);
        setCharOffset({ x: 0, y: 0 });
        return;
      }

      // If not in task mode, pulling the character puts it back into task mode 
      // or we just switch it to task mode when dropped
      updateMode('task');
      setTransitionDuration(0.5);
      setCharOffset({ x: 0, y: 0 });
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging]);

  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const updateMode = useCallback((newMode) => {
    setMode(newMode);
  }, []);

  // --- HIDE AND PEEK LOGIC ---
  useEffect(() => {
    if (isDragging) return; 
    if (mode === 'task') return; // Do nothing autonomous in task mode

    let scheduleTimeout;
    let peekTimeout;
    let stage2Timeout;
    let retreatTimeout;

    if (mode === 'initial') {
      // Hang out visible at bottom right for 10 seconds, then start peeking
      scheduleTimeout = setTimeout(() => {
        if (isDraggingRef.current) return;
        setTransitionDuration(0.5);
        setCharOffset({ x: 0, y: 170 }); // slide down into the den/offscreen
        setTimeout(() => updateMode('peeking'), 500);
      }, 10000);
      return () => clearTimeout(scheduleTimeout);
    }

    const scheduleNextPeek = (instant = false) => {
      const timeHidden = instant ? 100 : Math.random() * 6000 + 4000; // Wait 4-10 seconds while hidden
      
      scheduleTimeout = setTimeout(() => {
        if (isDraggingRef.current || modeRef.current !== 'peeking') return;
        if (document.hidden) {
          // If the tab is not visible, try again in a bit to avoid weird CSS slide catch-ups
          scheduleNextPeek();
          return;
        }

        const allEdges = ['top', 'left', 'right', 'bottom'];
        const candidateEdges = allEdges.filter(e => e !== lastEdgeRef.current);
        const edge = candidateEdges[Math.floor(Math.random() * candidateEdges.length)];
        lastEdgeRef.current = edge;
        
        let absHideX = 0, absHideY = 0;
        let absPeekX_Ears = 0, absPeekY_Ears = 0;
        let absPeekX_Face = 0, absPeekY_Face = 0;
        let rot = 0;
        let faceRight = false;

        const PEEK_EARS = 32; // 32px reveals only the ears
        const PEEK_FACE = 68; // 68px reveals the full face (ears, eyes, snout)

        if (edge === 'top') {
          // Upside-down peeking from ceiling: ears only or full face
          absHideY = -(window.innerHeight + 10); 
          absPeekY_Ears = -(window.innerHeight - 15) + PEEK_EARS;
          absPeekY_Face = -(window.innerHeight - 15) + PEEK_FACE;
          const minTopX = -(window.innerWidth - 240);
          absHideX = absPeekX_Ears = absPeekX_Face = Math.min(0, Math.max(minTopX, -(Math.random() * (window.innerWidth - 260) + 30)));
          rot = 180;
          faceRight = false;
        } else if (edge === 'bottom') {
          // Upright peeking from floor: ears only or full face
          absHideY = 180; 
          absPeekY_Ears = 165 - 28; // 28px ears only
          absPeekY_Face = 165 - 55; // 55px full face
          const minBottomX = -(window.innerWidth - 240);
          absHideX = absPeekX_Ears = absPeekX_Face = Math.min(0, Math.max(minBottomX, -(Math.random() * (window.innerWidth - 260) + 30)));
          rot = 0;
          faceRight = false;
        } else if (edge === 'left') {
          // Peeking in from left wall: ears only or full face
          absHideX = -(window.innerWidth - 20); 
          absPeekX_Ears = -(window.innerWidth - 40) + PEEK_EARS;
          absPeekX_Face = -(window.innerWidth - 40) + PEEK_FACE;
          const minLeftY = -(window.innerHeight - 240);
          absHideY = absPeekY_Ears = absPeekY_Face = Math.min(0, Math.max(minLeftY, -(Math.random() * (window.innerHeight - 260) + 40)));
          rot = 90;
          faceRight = false;
        } else if (edge === 'right') {
          // Peeking in from right wall: ears only or full face
          absHideX = 210; 
          absPeekX_Ears = 190 - PEEK_EARS;
          absPeekX_Face = 190 - PEEK_FACE;
          const minRightY = -(window.innerHeight - 240);
          absHideY = absPeekY_Ears = absPeekY_Face = Math.min(0, Math.max(minRightY, -(Math.random() * (window.innerHeight - 260) + 40)));
          rot = -90;
          faceRight = false;
        }

        const hideOffset = { 
          x: absHideX - cornerPosRef.current.x, 
          y: absHideY - cornerPosRef.current.y 
        };
        const earsOffset = { 
          x: absPeekX_Ears - cornerPosRef.current.x, 
          y: absPeekY_Ears - cornerPosRef.current.y 
        };
        const faceOffset = { 
          x: absPeekX_Face - cornerPosRef.current.x, 
          y: absPeekY_Face - cornerPosRef.current.y 
        };

        currentHidePosRef.current = hideOffset;

        // 1. Instantly move to hide position on the new edge
        setTransitionDuration(0);
        setCharOpacity(1);
        setCharOffset(hideOffset);
        setRotation(rot);
        setFacingRight(faceRight);

        // Randomly pick peek style:
        // ~50% two-stage peek (first ears only, and then face full also)
        // ~25% ears-only peek (sneaky shy ears)
        // ~25% direct full face peek
        const rand = Math.random();
        const peekStyle = rand < 0.5 ? 'two-stage' : rand < 0.75 ? 'ears-only' : 'full-face';

        if (peekStyle === 'two-stage') {
          // 1. Slide out with ears only
          peekTimeout = setTimeout(() => {
            if (isDraggingRef.current || modeRef.current !== 'peeking') return;
            setTransitionDuration(0.8);
            setCharOffset(earsOffset);

            // 2. Pause with ears only, and then slide out to the face full also!
            stage2Timeout = setTimeout(() => {
              if (isDraggingRef.current || modeRef.current !== 'peeking') return;
              setTransitionDuration(0.7);
              setCharOffset(faceOffset);

              // 3. Wait while full face is peeking
              const timePeeking = Math.random() * 6000 + 6000;
              retreatTimeout = setTimeout(() => {
                if (isDraggingRef.current || modeRef.current !== 'peeking') return;
                // 4. Retreat to hide
                setTransitionDuration(0.5);
                setCharOffset(hideOffset);
                scheduleNextPeek();
              }, timePeeking);
            }, 1800);
          }, 100);
        } else if (peekStyle === 'ears-only') {
          // Only with the ears
          peekTimeout = setTimeout(() => {
            if (isDraggingRef.current || modeRef.current !== 'peeking') return;
            setTransitionDuration(0.8);
            setCharOffset(earsOffset);

            const timePeeking = Math.random() * 3000 + 4000;
            retreatTimeout = setTimeout(() => {
              if (isDraggingRef.current || modeRef.current !== 'peeking') return;
              setTransitionDuration(0.5);
              setCharOffset(hideOffset);
              scheduleNextPeek();
            }, timePeeking);
          }, 100);
        } else {
          // Direct full face
          peekTimeout = setTimeout(() => {
            if (isDraggingRef.current || modeRef.current !== 'peeking') return;
            setTransitionDuration(1.2);
            setCharOffset(faceOffset);

            const timePeeking = Math.random() * 6000 + 7000;
            retreatTimeout = setTimeout(() => {
              if (isDraggingRef.current || modeRef.current !== 'peeking') return;
              setTransitionDuration(0.5);
              setCharOffset(hideOffset);
              scheduleNextPeek();
            }, timePeeking);
          }, 100);
        }

      }, timeHidden);
    };

    if (mode === 'peeking') {
      scheduleNextPeek();
    }

    const handleVisibility = () => {
      if (!document.hidden && modeRef.current === 'peeking') {
        clearTimeout(scheduleTimeout);
        clearTimeout(peekTimeout);
        clearTimeout(stage2Timeout);
        clearTimeout(retreatTimeout);
        scheduleNextPeek(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clearTimeout(scheduleTimeout);
      clearTimeout(peekTimeout);
      clearTimeout(stage2Timeout);
      clearTimeout(retreatTimeout);
    };
  }, [isDragging, mode]);

  const triggerTaskMode = useCallback((onComplete) => {
    if (modeRef.current === 'task') {
      if (onComplete) onComplete();
      return;
    }
    updateMode('task');
    
    // If the tab is hidden, skip animations entirely to prevent background throttling bugs
    if (document.hidden) {
      setTransitionDuration(0);
      setCharOpacity(1);
      setRotation(0);
      setFacingRight(false);
      setCharOffset({ x: 0, y: 0 });
      if (onComplete) onComplete();
      return;
    }

    // 1. Vanish slowly at the current edge (fade opacity and retreat into edge)
    setTransitionDuration(0.5);
    setCharOpacity(0);
    setCharOffset({ x: currentHidePosRef.current.x, y: currentHidePosRef.current.y });
    
    // 2. Once completely vanished (500ms), silently teleport below the bottom of the screen at the den
    setTimeout(() => {
      setTransitionDuration(0);
      setRotation(0);
      setFacingRight(false);
      setCharOffset({ x: 0, y: 170 }); // 170px below the bottom of the screen
      
      // 3. Wait for teleport to apply without animation
      setTimeout(() => {
        // 4. Appear in the comfortable place by sliding smoothly up from the bottom of the screen!
        setTransitionDuration(0.8);
        setCharOpacity(1);
        setCharOffset({ x: 0, y: 0 });
        
        if (onComplete) {
          setTimeout(onComplete, 800);
        }
      }, 60);
    }, 500);
  }, []);

  const triggerPeekingMode = useCallback(() => {
    if (modeRef.current === 'peeking') return;
    setTransitionDuration(0.5);
    setCharOffset({ x: 0, y: 170 }); // slide down into the den
    setTimeout(() => updateMode('peeking'), 500);
  }, []);

  return { cornerPos, charOffset, rotation, facingRight, isDragging, transitionDuration, mode, charOpacity, handlePointerDown, triggerTaskMode, triggerPeekingMode };
}
