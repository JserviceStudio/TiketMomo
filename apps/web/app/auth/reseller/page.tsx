import { ResellerLoginForm } from '@/components/forms/reseller-login-form';

export default function ResellerAuthPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full">
        <ResellerLoginForm />
      </div>
    </main>
  );
}
