import { useState, useRef, useEffect } from 'react';

/**
 * A simple tooltip that shows on hover (desktop) and tap (mobile).
 * Positioned above the trigger element.
 */
export default function Tooltip({ children, content }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  // Dismiss on outside tap (mobile)
  useEffect(() => {
    if (!visible) return;
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setVisible(false);
      }
    }
    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, [visible]);

  return (
    <span
      ref={ref}
      className="acronym-highlight"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onPointerDown={e => { e.stopPropagation(); setVisible(v => !v); }}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && setVisible(v => !v)}
      aria-label={typeof content === 'string' ? content : undefined}
    >
      {children}
      {visible && (
        <span className="acronym-tooltip" role="tooltip">
          {content}
        </span>
      )}
    </span>
  );
}
