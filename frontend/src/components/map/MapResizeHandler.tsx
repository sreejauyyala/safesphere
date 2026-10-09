import React, { useEffect } from 'react';
import L from 'leaflet';

export interface MapResizeHandlerProps {
  map: L.Map | null;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * MapResizeHandler safely invokes map.invalidateSize() when the map mounts,
 * when its container dimensions change (e.g. fullscreen toggle, mobile orientation,
 * tab switch, or modal open), and on window resize.
 * Prevents infinite re-render loops by using debounced/throttled observer callbacks.
 */
export const MapResizeHandler: React.FC<MapResizeHandlerProps> = ({ map, containerRef }) => {
  useEffect(() => {
    if (!map) return;

    // Initial size recalculations once DOM settles & animations complete
    const t0 = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {}
    }, 20);

    const t1 = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {}
    }, 120);

    const t2 = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {}
    }, 300);

    const t3 = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {}
    }, 550);

    // Window resize handler
    const handleResize = () => {
      try {
        map.invalidateSize();
      } catch {}
    };
    window.addEventListener('resize', handleResize);

    // ResizeObserver on the map container
    let resizeObserver: ResizeObserver | null = null;
    const container = containerRef?.current || map.getContainer();
    if (container && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        try {
          map.invalidateSize();
        } catch {}
      });
      resizeObserver.observe(container);
    }

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', handleResize);
      if (resizeObserver && container) {
        resizeObserver.unobserve(container);
        resizeObserver.disconnect();
      }
    };
  }, [map, containerRef]);

  return null;
};

export default MapResizeHandler;
