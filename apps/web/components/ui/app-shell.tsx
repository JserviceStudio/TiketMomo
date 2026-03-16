import { Sidebar, type ShellNavItem } from '@/components/ui/sidebar';
import { Topbar } from '@/components/ui/topbar';

export type ShellContext = {
  area: string;
  title: string;
  description: string;
  navItems: ShellNavItem[];
};

export function AppShell({
  children,
  context,
}: {
  children: React.ReactNode;
  context: ShellContext;
}) {
  return (
    <div className="shell-grid">
      <Sidebar context={context} />
      <div className="px-4 py-4 md:px-5 md:py-5">
        <Topbar context={context} />
        <main className="mt-4">{children}</main>
      </div>
    </div>
  );
}
