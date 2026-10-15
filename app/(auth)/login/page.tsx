import { BrandPanel } from './brand-panel';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <BrandPanel />
      <main className="flex items-center justify-center bg-background px-4 py-10 sm:px-8">
        <LoginForm />
      </main>
    </div>
  );
}
