import { useState, useEffect, useRef, useCallback } from 'react';
import { browserAPI } from '../../../core/browser';

export function useMovement() {
  const [cornerPos, setCornerPos] = useState({ x: 0, y: 0 }); // Corner position
  const [charOffset, setCharOffset] = useState({ x: 0, y: 0 }); // Fox offset from corner
  const [rotation, setRotation] = useState(0);
  const [facingRight, setFacingRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [transitionDuration, setTransitionDuration] = useState(0);
  const [transitionEasing, setTransitionEasing] = useState('ease-in-out');
  const [charOpacity, setCharOpacity] = useState(1);
  const [mode, setMode] = useState('task'); // 'task' | 'peeking'

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

  const scheduleTimeoutRef = useRef(null);
  const peekTimeoutRef = useRef(null);
  const stage2TimeoutRef = useRef(null);
  const retreatTimeoutRef = useRef(null);
  const transitionTimerRef = useRef(null);
  const isTransitioningRef = useRef(false);

  const clearAllPeekTimeouts = useCallback(() => {
    if (scheduleTimeoutRef.current) clearTimeout(scheduleTimeoutRef.current);
    if (peekTimeoutRef.current) clearTimeout(peekTimeoutRef.current);
    if (stage2TimeoutRef.current) clearTimeout(stage2TimeoutRef.current);
    if (retreatTimeoutRef.current) clearTimeout(retreatTimeoutRef.current);
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
  }, []);

  // --- DRAGGING LOGIC ---
  const handlePointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    if (modeRef.current === 'peeking' || isTransitioningRef.current) {
      return;
    }
    
    setIsDragging(true);
    setTransitionDuration(0);
    setTransitionEasing('ease-in-out');
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
      if (modeRef.current === 'peeking' || isTransitioningRef.current) {
        setIsDragging(false);
        return;
      }

      setIsDragging(false);
      
      if (modeRef.current === 'task') {
        setTransitionDuration(0.5);
        setTransitionEasing('ease-in-out');
        setCharOffset({ x: 0, y: 0 });
        return;
      }

      // If not in task mode, pulling the character puts it back into task mode 
      // or we just switch it to task mode when dropped
      updateMode('task');
      setTransitionDuration(0.5);
      setTransitionEasing('ease-in-out');
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

    const scheduleNextPeek = (instant = false) => {
      const timeHidden = instant ? 100 : Math.random() * 6000 + 4000; // Wait 4-10 seconds while hidden
      
      scheduleTimeoutRef.current = setTimeout(() => {
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
          absHideY = -(window.innerHeight + 50); 
          absPeekY_Ears = -(window.innerHeight - 15) + PEEK_EARS;
          absPeekY_Face = -(window.innerHeight - 15) + PEEK_FACE;
          const minTopX = -(window.innerWidth - 240);
          absHideX = absPeekX_Ears = absPeekX_Face = Math.min(0, Math.max(minTopX, -(Math.random() * (window.innerWidth - 260) + 30)));
          rot = 180;
          faceRight = false;
        } else if (edge === 'bottom') {
          // Upright peeking from floor: ears only or full face
          absHideY = 190; 
          absPeekY_Ears = 165 - 28; // 28px ears only
          absPeekY_Face = 165 - 55; // 55px full face
          const minBottomX = -(window.innerWidth - 240);
          absHideX = absPeekX_Ears = absPeekX_Face = Math.min(0, Math.max(minBottomX, -(Math.random() * (window.innerWidth - 260) + 30)));
          rot = 0;
          faceRight = false;
        } else if (edge === 'left') {
          // Peeking in from left wall: ears only or full face
          absHideX = -(window.innerWidth + 50); 
          absPeekX_Ears = -(window.innerWidth - 40) + PEEK_EARS;
          absPeekX_Face = -(window.innerWidth - 40) + PEEK_FACE;
          const minLeftY = -(window.innerHeight - 240);
          absHideY = absPeekY_Ears = absPeekY_Face = Math.min(0, Math.max(minLeftY, -(Math.random() * (window.innerHeight - 260) + 40)));
          rot = 90;
          faceRight = false;
        } else if (edge === 'right') {
          // Peeking in from right wall: ears only or full face
          absHideX = 220; 
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
        setTransitionEasing('ease-in-out');
        setCharOpacity(1);
        setCharOffset(hideOffset);
        setRotation(rot);
        setFacingRight(faceRight);

        // Randomly pick peek style:
        const rand = Math.random();
        const peekStyle = rand < 0.5 ? 'two-stage' : rand < 0.75 ? 'ears-only' : 'full-face';

        if (peekStyle === 'two-stage') {
          // 1. Slide out with ears only
          peekTimeoutRef.current = setTimeout(() => {
            if (isDraggingRef.current || modeRef.current !== 'peeking') return;
            setTransitionDuration(0.8);
            setTransitionEasing('ease-in-out');
            setCharOffset(earsOffset);

            // 2. Pause with ears only, and then slide out to the face full also!
            stage2TimeoutRef.current = setTimeout(() => {
              if (isDraggingRef.current || modeRef.current !== 'peeking') return;
              setTransitionDuration(0.7);
              setTransitionEasing('ease-in-out');
              setCharOffset(faceOffset);

              // 3. Wait while full face is peeking
              const timePeeking = Math.random() * 6000 + 6000;
              retreatTimeoutRef.current = setTimeout(() => {
                if (isDraggingRef.current || modeRef.current !== 'peeking') return;
                // 4. Retreat to hide
                setTransitionDuration(0.5);
                setTransitionEasing('ease-in-out');
                setCharOffset(hideOffset);
                scheduleNextPeek();
              }, timePeeking);
            }, 1800);
          }, 100);
        } else if (peekStyle === 'ears-only') {
          // Only with the ears
          peekTimeoutRef.current = setTimeout(() => {
            if (isDraggingRef.current || modeRef.current !== 'peeking') return;
            setTransitionDuration(0.8);
            setTransitionEasing('ease-in-out');
            setCharOffset(earsOffset);

            const timePeeking = Math.random() * 3000 + 4000;
            retreatTimeoutRef.current = setTimeout(() => {
              if (isDraggingRef.current || modeRef.current !== 'peeking') return;
              setTransitionDuration(0.5);
              setTransitionEasing('ease-in-out');
              setCharOffset(hideOffset);
              scheduleNextPeek();
            }, timePeeking);
          }, 100);
        } else {
          // Direct full face
          peekTimeoutRef.current = setTimeout(() => {
            if (isDraggingRef.current || modeRef.current !== 'peeking') return;
            setTransitionDuration(1.2);
            setTransitionEasing('ease-in-out');
            setCharOffset(faceOffset);

            const timePeeking = Math.random() * 6000 + 7000;
            retreatTimeoutRef.current = setTimeout(() => {
              if (isDraggingRef.current || modeRef.current !== 'peeking') return;
              setTransitionDuration(0.5);
              setTransitionEasing('ease-in-out');
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
        clearAllPeekTimeouts();
        scheduleNextPeek(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clearAllPeekTimeouts();
    };
  }, [isDragging, mode, clearAllPeekTimeouts, updateMode]);

  const triggerTaskMode = useCallback((onComplete) => {
    if (isTransitioningRef.current) return;
    if (modeRef.current === 'task') {
      if (onComplete) onComplete();
      return;
    }

    // Cancel all ongoing autonomous peek timers immediately
    clearAllPeekTimeouts();

    // If the tab is hidden, skip animations entirely to prevent background throttling bugs
    if (document.hidden) {
      setTransitionDuration(0);
      setCharOpacity(1);
      setRotation(0);
      setFacingRight(false);
      setCharOffset({ x: 0, y: 0 });
      updateMode('task');
      isTransitioningRef.current = false;
      if (onComplete) onComplete();
      return;
    }

    isTransitioningRef.current = true;

    // 1. Smoothly retreat outside the screen at the current edge
    const edge = lastEdgeRef.current || 'bottom';
    const currentOffset = charOffsetRef.current;
    let retreatOffset = { ...currentOffset };

    if (edge === 'top') {
      retreatOffset.y = -(window.innerHeight + 80) - cornerPosRef.current.y;
    } else if (edge === 'bottom') {
      retreatOffset.y = 190 - cornerPosRef.current.y;
    } else if (edge === 'left') {
      retreatOffset.x = -(window.innerWidth + 80) - cornerPosRef.current.x;
    } else if (edge === 'right') {
      retreatOffset.x = 230 - cornerPosRef.current.x;
    }

    // Swift, smooth retreat outside screen bounds (tucking back into the wall/ceiling/floor)
    setTransitionDuration(0.38);
    setTransitionEasing('ease-in');
    setCharOpacity(1);
    setCharOffset(retreatOffset);

    // 2. Once completely outside the screen (400ms), silently teleport to bottom den launchpad
    transitionTimerRef.current = setTimeout(() => {
      setTransitionDuration(0);
      setRotation(0);
      setFacingRight(false);
      setCharOffset({ x: 0, y: 170 }); // 170px below the bottom edge at the den

      // 3. Brief delay to let browser commit offscreen teleport, then slide smoothly up into comfortable zone
      transitionTimerRef.current = setTimeout(() => {
        setTransitionDuration(0.65);
        setTransitionEasing('cubic-bezier(0.16, 1, 0.3, 1)');
        setCharOpacity(1);
        setCharOffset({ x: 0, y: 0 });
        updateMode('task');

        // 4. When arrival is finished
        transitionTimerRef.current = setTimeout(() => {
          isTransitioningRef.current = false;
          if (onComplete) {
            onComplete();
          }
        }, 650);
      }, 60);
    }, 400);
  }, [updateMode, clearAllPeekTimeouts]);

  const triggerPeekingMode = useCallback(() => {
    if (modeRef.current === 'peeking' || isTransitioningRef.current) return;
    setTransitionDuration(0.5);
    setTransitionEasing('ease-in-out');
    setCharOffset({ x: 0, y: 170 }); // slide down into the den
    setTimeout(() => updateMode('peeking'), 500);
  }, [updateMode]);

  return { 
    cornerPos, 
    charOffset, 
    rotation, 
    facingRight, 
    isDragging, 
    transitionDuration, 
    transitionEasing, 
    mode, 
    charOpacity, 
    handlePointerDown, 
    triggerTaskMode, 
    triggerPeekingMode 
  };
}
