import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { auth } from '@/lib/auth';
import AppSidebar from './_components/AppSidebar';
import { ClientProvider } from './_components/ClientProvider';

type Props = {
  children: ReactNode;
};

const AuthLayout = async ({ children }: Props) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/login');
  }

  return (
    <ClientProvider>
      <SidebarProvider>
        <AppSidebar />

        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </ClientProvider>
  );
};

export default AuthLayout;
