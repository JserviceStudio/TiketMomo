import { TokenLoginForm } from '@/components/forms/token-login-form';

export default function AdminAuthPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full">
        <TokenLoginForm />
      </div>
    </main>
  );
}
