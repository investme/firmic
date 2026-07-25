import {
  Activity,
  BadgeDollarSign,
  Bell,
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
  Mail,
  MessageSquare,
  Phone,
  Plug,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
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
      id: "command-center",
      title: "Command Center",
      items: [
        {
          id: "tenant-dashboard",
          label: "Command Center",
          href: "/dashboard",
          icon: <LayoutDashboard className={iconClass} />,
        },
        {
          id: "tenant-notifications",
          label: "Notifications",
          href: "/notifications",
          icon: <Bell className={iconClass} />,
          badge: "notifications",
        },
        {
          id: "tenant-executive-intelligence",
          label: "Executive Intelligence",
          href: "/executive-intelligence",
          icon: <Sparkles className={iconClass} />,
        },
      ],
    },

    {
      id: "company",
      title: "Company",
      items: [
        {
          id: "tenant-company",
          label: "Company Workspace",
          href: "/company",
          icon: <Building2 className={iconClass} />,
        },
        {
          id: "tenant-my-office",
          label: "Head Office",
          href: "/my-office",
          icon: <Home className={iconClass} />,
        },
        {
          id: "tenant-virtual-offices",
          label: "Virtual Offices",
          href: "/virtual-offices",
          icon: <Warehouse className={iconClass} />,
        },
        {
          id: "tenant-ai-workforce",
          label: "AI Workforce",
          href: "/ai-workforce",
          icon: <Bot className={iconClass} />,
        },
        {
          id: "tenant-customer-hub",
          label: "Customer Hub",
          href: "/customer-hub",
          icon: <Users className={iconClass} />,
        },
      ],
    },

    {
      id: "operations",
      title: "Operations",
      items: [
        {
          id: "tenant-documents",
          label: "Documents",
          href: "/documents",
          icon: <FileText className={iconClass} />,
        },
        {
          id: "tenant-tasks",
          label: "Tasks",
          href: "/tasks",
          icon: <CheckSquare className={iconClass} />,
        },
        {
          id: "tenant-timeline",
          label: "Timeline",
          href: "/timeline",
          icon: <Activity className={iconClass} />,
        },
        {
          id: "tenant-mailbox",
          label: "Digital Mailroom",
          href: "/mailbox",
          icon: <Inbox className={iconClass} />,
        },
        {
          id: "tenant-meeting-rooms",
          label: "Meeting Center",
          href: "/meeting-rooms",
          icon: <CalendarDays className={iconClass} />,
        },
      ],
    },

    {
      id: "communications",
      title: "Business Communications",
      items: [
        {
          id: "tenant-messages",
          label: "Messages",
          href: "/messages",
          icon: <MessageSquare className={iconClass} />,
        },
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
      id: "business-tools",
      title: "Business Tools",
      items: [
        {
          id: "tenant-crm",
          label: "Sales Hub",
          href: "/crm",
          icon: <BriefcaseBusiness className={iconClass} />,
        },
        {
          id: "tenant-microsoft-365",
          label: "Microsoft 365",
          href: "/microsoft-365",
          icon: <Mail className={iconClass} />,
        },
        {
          id: "tenant-billing",
          label: "Billing Center",
          href: "/billing",
          icon: <CreditCard className={iconClass} />,
        },
        {
          id: "tenant-reports",
          label: "Reports",
          href: "/reports",
          icon: <ChartNoAxesCombined className={iconClass} />,
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
      id: "ai-executives",
      title: "AI Executives",
      items: [
        {
          id: "tenant-sonny",
          label: "Sonny AI COO",
          href: "/sonny",
          icon: <Bot className={iconClass} />,
        },
        {
          id: "tenant-hermes",
          label: "Hermes Compliance",
          href: "/hermes",
          icon: <ShieldCheck className={iconClass} />,
        },
      ],
    },

    {
      id: "workspace-settings",
      title: "Workspace",
      items: [
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