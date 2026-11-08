import type { Metadata } from 'next';
import { BrandPanel } from '../login/brand-panel';
import { ForgotPasswordForm } from './forgot-password-form';

export const metadata: Metadata = {
  title: 'Forgot Password - CVTEC EDMS',
  description: 'Request a password reset link for your CVTEC EDMS account.',
};

export default function ForgotPasswordPage() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <BrandPanel />
      <main className="flex items-center justify-center bg-background px-4 py-10 sm:px-8">
        <ForgotPasswordForm />
      </main>
    </div>
  );
}
