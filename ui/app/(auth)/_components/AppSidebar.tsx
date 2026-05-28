'use client';

import {
  Blocks,
  Bot,
  HatGlasses,
  House,
  PanelLeft,
  PanelLeftOpen,
  Plus,
  Unplug,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import NavUser from './NavUser';

type Props = {
  className?: string;
};

const menus = {
  main: [
    {
      title: 'Home',
      url: '/',
      icon: House,
    },
    {
      title: 'Space',
      url: '/space',
      icon: User,
    },
    {
      title: 'Agent',
      url: '/agent',
      icon: HatGlasses,
    },
  ],
  discover: [
    {
      title: 'Apps',
      url: '/apps',
      icon: Bot,
    },
    {
      title: 'Tool Store',
      url: '/store/tools',
      icon: Blocks,
    },
    {
      title: 'API',
      url: '/api',
      icon: Unplug,
    },
  ],
};

const AppSidebar = ({ className }: Props) => {
  const { toggleSidebar, open } = useSidebar();

  return (
    <Sidebar className={cn(className)} variant="floating" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggleSidebar} asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="Toggle Sidebar"
                className="flex justify-start"
              >
                {open ? <PanelLeft /> : <PanelLeftOpen />}
              </Button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Button>
                  <Plus /> {open && 'Create AI App'}
                </Button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarMenu>
            {menus.main.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <Link href={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Discover</SidebarGroupLabel>
          <SidebarMenu>
            {menus.discover.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <Link href={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
