import {
  BadgeDollarSign,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  CheckSquare,
  CircleUserRound,
  CreditCard,
  FileText,
  Headphones,
  Home,
  Inbox,
  LayoutDashboard,
  Phone,
  Plug,
  Settings,
  ShieldCheck,
  Sparkles,
  Warehouse,
} from "lucide-react";

import type { SidebarConfig } from "./types";

const iconClass = "h-5 w-5";

export const tenantSidebarConfig: SidebarConfig = {
  mode: "tenant",
  brandEyebrow: "Firmic",
  brandTitle: "Company Workspace",
  brandSubtitle: "AI-Native Operating System",

  sections: [
    {
      id: "company",
      title: "Company",
      items: [
        {
          id: "tenant-dashboard",
          label: "Command Center",
          href: "/dashboard",
          icon: <LayoutDashboard className={iconClass} />,
        },
      ],
    },

    {
      id: "infrastructure",
      title: "Infrastructure",
      items: [
        {
          id: "tenant-company",
          label: "Company",
          href: "/company",
          icon: <Building2 className={iconClass} />,
        },
        {
          id: "tenant-headquarters",
          label: "Headquarters",
          href: "/my-office",
          icon: <Home className={iconClass} />,
        },
        {
          id: "tenant-launch-center",
          label: "Launch Center",
          href: "/launch-center",
          icon: <Sparkles className={iconClass} />,
        },
      ],
    },

    {
      id: "ai-workforce",
      title: "AI Workforce",
      items: [
        {
          id: "tenant-ai-workforce",
          label: "AI Workforce",
          href: "/ai-workforce",
          icon: <Bot className={iconClass} />,
        },
        {
          id: "tenant-sonny",
          label: "Sonny",
          href: "/sonny",
          icon: <Bot className={iconClass} />,
        },
        {
          id: "tenant-hermes",
          label: "Hermes",
          href: "/hermes",
          icon: <ShieldCheck className={iconClass} />,
        },
      ],
    },

    {
      id: "operations",
      title: "Operations",
      items: [
        {
          id: "tenant-crm",
          label: "CRM",
          href: "/crm",
          icon: <BriefcaseBusiness className={iconClass} />,
        },
        {
          id: "tenant-tasks",
          label: "Tasks",
          href: "/tasks",
          icon: <CheckSquare className={iconClass} />,
        },
        {
          id: "tenant-mailbox",
          label: "Mailbox",
          href: "/mailbox",
          icon: <Inbox className={iconClass} />,
        },
        {
          id: "tenant-meeting-center",
          label: "Meeting Center",
          href: "/meeting-rooms",
          icon: <CalendarDays className={iconClass} />,
        },
      ],
    },

    {
      id: "communications",
      title: "Communications",
      items: [
        {
          id: "tenant-voip",
          label: "VoIP & Calls",
          href: "/voip-calls",
          icon: <Phone className={iconClass} />,
        },
        {
          id: "tenant-support",
          label: "Support",
          href: "/support",
          icon: <Headphones className={iconClass} />,
        },
      ],
    },

    {
      id: "finance",
      title: "Finance",
      items: [
        {
          id: "tenant-subscription",
          label: "Subscription",
          href: "/billing",
          icon: <CreditCard className={iconClass} />,
        },
        {
          id: "tenant-integrations",
          label: "Integrations",
          href: "/integrations",
          icon: <Plug className={iconClass} />,
        },
      ],
    },

    {
      id: "administration",
      title: "Administration",
      items: [
        {
          id: "tenant-documents",
          label: "Documents",
          href: "/documents",
          icon: <FileText className={iconClass} />,
        },
        {
          id: "tenant-settings",
          label: "Settings",
          href: "/settings",
          icon: <Settings className={iconClass} />,
        },
      ],
    },
  ],
};

export const adminSidebarConfig: SidebarConfig = {
  mode: "admin",
  brandEyebrow: "Firmic",
  brandTitle: "Admin Platform",
  brandSubtitle: "Operations and Control",

  sections: [
    {
      id: "admin-command-center",
      title: "Command Center",
      items: [
        {
          id: "admin-dashboard",
          label: "Admin Command Center",
          href: "/admin",
          icon: <LayoutDashboard className={iconClass} />,
        },
        {
          id: "admin-analytics",
          label: "Analytics",
          href: "/admin-analytics",
          icon: <ChartNoAxesCombined className={iconClass} />,
        },
      ],
    },

    {
      id: "admin-management",
      title: "Management",
      items: [
        {
          id: "admin-companies",
          label: "Companies",
          href: "/admin-companies",
          icon: <Building2 className={iconClass} />,
        },
        {
          id: "admin-offices",
          label: "Office Inventory",
          href: "/admin-offices",
          icon: <Warehouse className={iconClass} />,
        },
        {
          id: "admin-users",
          label: "Users",
          href: "/admin-users",
          icon: <CircleUserRound className={iconClass} />,
        },
        {
          id: "admin-ai-workforce",
          label: "AI Workforce",
          href: "/admin-ai-workforce",
          icon: <Bot className={iconClass} />,
        },
      ],
    },

    {
      id: "admin-operations",
      title: "Operations",
      items: [
        {
          id: "admin-billing",
          label: "Tenant Billing",
          href: "/admin-billing",
          icon: <BadgeDollarSign className={iconClass} />,
        },
        {
          id: "admin-compliance",
          label: "Compliance Queue",
          href: "/admin-compliance",
          icon: <ShieldCheck className={iconClass} />,
        },
        {
          id: "admin-support",
          label: "Support",
          href: "/admin-support",
          icon: <Headphones className={iconClass} />,
        },
      ],
    },

    {
      id: "admin-system",
      title: "System",
      items: [
        {
          id: "admin-settings",
          label: "Settings",
          href: "/admin-settings",
          icon: <Settings className={iconClass} />,
        },
      ],
    },
  ],
};
