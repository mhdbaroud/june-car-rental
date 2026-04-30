import { useRef } from 'react';
import useOnScreen from './hooks/useOnScreen';

export default function FadeIn({ children, delay = 0, style = {} }) {
  const ref = useRef();
  const visible = useOnScreen(ref);
  return (
    <div ref={ref} style={{
      ...style,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(32px)',
      transition: `opacity 0.3s ease ${delay}s, transform 0.3s ease ${delay}s`,
    }}>
      {children}
    </div>
  );
}

