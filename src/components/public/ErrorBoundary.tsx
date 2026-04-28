'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Crash sonrası gösterilecek fallback. Verilmezse hiç render edilmez
   *  (sessizce gizlenir — örneğin AI chat widget'ı için ideal). */
  fallback?: ReactNode;
  /** Crash'i logla — tek loglama yeri burası, console.error ile kalır. */
  onError?: (error: Error, info: { componentStack: string }) => void;
}

interface State {
  hasError: boolean;
}

/**
 * Local error boundary — sayfanın kalanını çökertmeden tek bir client
 * component'i izole eder. Özellikle AI chat gibi 3rd-party data işleyen
 * (LLM çıktısı, malformed markdown vb.) widget'ları sarmak için.
 *
 * React error boundary'leri SADECE class component olarak yazılabiliyor;
 * fonksiyonel hook yok. Minimum interface — global error toast'ları
 * burada YAPILMAZ, parent inject etsin (test edilebilirlik).
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info.componentStack);
    this.props.onError?.(error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
