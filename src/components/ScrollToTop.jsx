import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Her rota değişiminde pencere kaydırmasını sıfırlar. */
export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);

  return null;
}
