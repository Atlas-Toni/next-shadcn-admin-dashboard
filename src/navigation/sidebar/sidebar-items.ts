import { Activity, Bot, Inbox, LayoutDashboard, type LucideIcon, Settings } from "lucide-react";

export type NavBadge = "new" | "soon";

export interface NavSubItem {
  id: string;
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

interface NavItemBase {
  id: string;
  title: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

export interface NavMainLinkItem extends NavItemBase {
  url: string;
  subItems?: never;
}

export interface NavMainParentItem extends NavItemBase {
  subItems: NavSubItem[];
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem;

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "ATLAS",
    items: [
      {
        id: "dashboard",
        title: "Dashboard",
        url: "/dashboard/default",
        icon: LayoutDashboard,
      },
      {
        id: "proposals",
        title: "Proposals",
        url: "/dashboard/coming-soon",
        icon: Inbox,
        badge: "soon",
        disabled: true,
      },
      {
        id: "agents",
        title: "Agents",
        url: "/dashboard/coming-soon",
        icon: Bot,
        badge: "soon",
        disabled: true,
      },
      {
        id: "traces",
        title: "Traces",
        url: "/dashboard/coming-soon",
        icon: Activity,
        badge: "soon",
        disabled: true,
      },
      {
        id: "settings",
        title: "Settings",
        url: "/dashboard/coming-soon",
        icon: Settings,
        badge: "soon",
        disabled: true,
      },
    ],
  },
];
