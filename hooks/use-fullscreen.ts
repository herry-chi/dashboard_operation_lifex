import { useState, useEffect, useCallback } from 'react';

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Check if fullscreen is supported
  const isSupported = typeof document !== 'undefined' && (
    document.fullscreenEnabled ||
    (document as any).webkitFullscreenEnabled ||
    (document as any).mozFullScreenEnabled ||
    (document as any).msFullscreenEnabled
  );

  // Update fullscreen state
  const updateFullscreenState = useCallback(() => {
    const fullscreenElement = 
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement;
    
    setIsFullscreen(!!fullscreenElement);
  }, []);

  // Enter fullscreen
  const enterFullscreen = useCallback(async (element?: Element) => {
    if (!isSupported) {
      console.warn('Fullscreen API is not supported');
      return false;
    }

    const targetElement = element || document.documentElement;

    try {
      if (targetElement.requestFullscreen) {
        await targetElement.requestFullscreen();
      } else if ((targetElement as any).webkitRequestFullscreen) {
        await (targetElement as any).webkitRequestFullscreen();
      } else if ((targetElement as any).mozRequestFullScreen) {
        await (targetElement as any).mozRequestFullScreen();
      } else if ((targetElement as any).msRequestFullscreen) {
        await (targetElement as any).msRequestFullscreen();
      }
      return true;
    } catch (error) {
      console.error('Failed to enter fullscreen:', error);
      return false;
    }
  }, [isSupported]);

  // Exit fullscreen
  const exitFullscreen = useCallback(async () => {
    if (!isSupported) {
      console.warn('Fullscreen API is not supported');
      return false;
    }

    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
      return true;
    } catch (error) {
      console.error('Failed to exit fullscreen:', error);
      return false;
    }
  }, [isSupported]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(async (element?: Element) => {
    if (isFullscreen) {
      return await exitFullscreen();
    } else {
      return await enterFullscreen(element);
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  // Listen for fullscreen changes
  useEffect(() => {
    if (!isSupported) return;

    const events = [
      'fullscreenchange',
      'webkitfullscreenchange',
      'mozfullscreenchange',
      'MSFullscreenChange'
    ];

    events.forEach(event => {
      document.addEventListener(event, updateFullscreenState);
    });

    // Initial state check
    updateFullscreenState();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateFullscreenState);
      });
    };
  }, [isSupported, updateFullscreenState]);

  return {
    isFullscreen,
    isSupported,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen
  };
}