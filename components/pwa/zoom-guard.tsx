"use client";

import { useEffect } from "react";

/**
 * Keeps Mimori fixed-scale on iOS.
 *
 * The viewport (`user-scalable: false`, `maximum-scale: 1`) and the page's
 * `touch-action` stop zoom in the browsers that honour them, but Safari
 * ignores `user-scalable` and answers a two-finger pinch with its own
 * non-standard `gesture*` events instead. Cancelling exactly those leaves
 * every single-finger interaction alone — scrolling, swiping, the photo
 * book's page turn, the carousels and the widget and sticker drags all
 * continue to work, because none of them is a pinch.
 */
export function ZoomGuard() {
  useEffect(() => {
    const blockPinch = (event: Event) => {
      if (event.cancelable) {
        event.preventDefault();
      }
    };

    // Non-passive, because a passive listener may not cancel the gesture.
    const options: AddEventListenerOptions = { passive: false };

    document.addEventListener("gesturestart", blockPinch, options);
    document.addEventListener("gesturechange", blockPinch, options);

    return () => {
      document.removeEventListener("gesturestart", blockPinch);
      document.removeEventListener("gesturechange", blockPinch);
    };
  }, []);

  return null;
}
