import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Sign in | CVTEC EDMS',
    template: '%s | CVTEC EDMS',
  },
};

export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return <>{children}</>;
}
