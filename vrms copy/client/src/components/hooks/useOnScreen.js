import { useState, useEffect } from 'react';

export default function useOnScreen(ref, threshold = 0.01, rootMargin = '0px 0px 400px 0px') {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { 
      if (e.isIntersecting) setVisible(true); 
    }, { threshold, rootMargin });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref, threshold, rootMargin]);
  return visible;
}

