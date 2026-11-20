import type { AppProps } from 'next/app';
import '../styles/globals.css';

if (typeof window !== 'undefined') {
  (
    window as unknown as {
      __REACT_DEVTOOLS_GLOBAL_HOOK__?: Record<string, unknown>;
    }
  ).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    isDisabled: true,
    supportsFiber: true,
    renderers: new Map(),
  };
}

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
