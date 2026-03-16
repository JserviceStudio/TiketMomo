import { redirect } from 'next/navigation';

export default function ManagerAuthPage() {
  redirect('/auth/client');
}
