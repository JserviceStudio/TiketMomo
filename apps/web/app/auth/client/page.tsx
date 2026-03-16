import { ClientLoginForm } from '@/components/forms/client-login-form';

export default function ClientAuthPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full">
        <ClientLoginForm />
      </div>
    </main>
  );
}
