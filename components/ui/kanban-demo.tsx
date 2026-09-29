"use client";

import { KanbanBoard, type KanbanColumn } from "@/components/ui/kanban-board";

const portraits = {
  sarah: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  michael: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  emily: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80",
  daniel: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  olivia: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
};

const people = {
  sarah: { name: "Sarah Anderson", avatar: portraits.sarah },
  michael: { name: "Michael Carter", avatar: portraits.michael },
  emily: { name: "Emily Thompson", avatar: portraits.emily },
  daniel: { name: "Daniel Wilson", avatar: portraits.daniel },
  olivia: { name: "Olivia Martinez", avatar: portraits.olivia },
};

const defaultColumns: KanbanColumn[] = [
  {
    id: "todo",
    name: "To-Do",
    accent: "blue",
    tasks: [
      {
        id: "t1",
        title: "Audit empty states",
        note: "Every list, table and search result",
        priority: "low",
        category: "Web app",
        icon: "web",
        assignees: [people.emily],
        due: "12 Oct",
        progress: 0,
      },
      {
        id: "t2",
        title: "Usage based billing",
        note: "Metered plans and overage alerts",
        priority: "normal",
        category: "Dashboard",
        icon: "dashboard",
        assignees: [people.michael, people.daniel],
        due: "18 Oct",
        progress: 0,
      },
      {
        id: "t3",
        title: "Offline mode spike",
        note: "How much can we cache safely?",
        priority: "low",
        category: "Mobile",
        icon: "mobile",
        assignees: [people.daniel],
        due: "24 Oct",
        progress: 0,
      },
    ],
  },
  {
    id: "in_progress",
    name: "In Progress",
    accent: "violet",
    tasks: [
      {
        id: "t6",
        title: "Team permissions",
        note: "Roles, seats and the invite flow",
        priority: "urgent",
        category: "Dashboard",
        icon: "dashboard",
        assignees: [people.michael, people.sarah, people.daniel],
        due: "Tomorrow",
        dueSoon: true,
        progress: 60,
      },
      {
        id: "t7",
        title: "Search across workspaces",
        note: "Debounced, with recent results",
        priority: "high",
        category: "Web app",
        icon: "web",
        assignees: [people.daniel],
        due: "2 Oct",
        progress: 35,
      },
    ],
  },
  {
    id: "completed",
    name: "Completed",
    accent: "emerald",
    tasks: [
      {
        id: "t11",
        title: "SSO with Okta",
        note: "SAML sign in and SCIM provisioning",
        priority: "high",
        category: "Infra",
        icon: "infra",
        assignees: [people.daniel, people.michael],
        due: "26 Sep",
        progress: 100,
      },
      {
        id: "t12",
        title: "Billing history export",
        note: "CSV and PDF invoices",
        priority: "normal",
        category: "Dashboard",
        icon: "dashboard",
        assignees: [people.olivia],
        due: "22 Sep",
        progress: 100,
      },
    ],
  },
];

export default function KanbanDemo() {
  return (
    <div className="w-full bg-background px-4 sm:px-6 py-6">
      <KanbanBoard columns={defaultColumns} />
    </div>
  );
}
