import {
  Building2,
  CalendarPlus,
  FileUp,
  ListPlus,
  UserPlus,
} from "lucide-react";
import { useEffect } from "react";

import { useActions } from "./useActions";

export function CoreActionRegistrar() {
  const { registerAction } = useActions();

  useEffect(() => {
    const unregister = [
      registerAction({
        id: "company.create",
        title: "Create company",
        description: "Open the company creation workflow.",
        category: "Quick Actions",
        keywords: ["new business", "workspace", "organization"],
        icon: Building2,
        priority: 100,
        risk: "safe",
        execute: async (_input, context) => {
          await context.navigate("/companies?action=create");

          return {
            success: true,
            message: "Company creation opened.",
          };
        },
      }),

      registerAction({
        id: "task.create",
        title: "Create task",
        description: "Create and assign a new task.",
        category: "Quick Actions",
        keywords: ["assign task", "new task", "todo"],
        icon: ListPlus,
        priority: 95,
        risk: "safe",
        execute: async (_input, context) => {
          await context.navigate("/tasks?action=create");

          return {
            success: true,
            message: "Task creation opened.",
          };
        },
      }),

      registerAction({
        id: "document.upload",
        title: "Upload document",
        description: "Open the document upload workflow.",
        category: "Quick Actions",
        keywords: ["file", "certificate", "incorporation"],
        icon: FileUp,
        priority: 90,
        risk: "safe",
        execute: async (_input, context) => {
          await context.navigate("/documents?action=upload");

          return {
            success: true,
            message: "Document upload opened.",
          };
        },
      }),

      registerAction({
        id: "meeting.book",
        title: "Book meeting",
        description: "Open meeting-room booking.",
        category: "Quick Actions",
        keywords: ["calendar", "room", "appointment"],
        icon: CalendarPlus,
        priority: 85,
        risk: "safe",
        execute: async (_input, context) => {
          await context.navigate("/meeting-rooms?action=book");

          return {
            success: true,
            message: "Meeting booking opened.",
          };
        },
      }),

      registerAction({
        id: "employee.invite",
        title: "Invite employee",
        description: "Invite a person to the workspace.",
        category: "Quick Actions",
        keywords: ["team", "user", "staff", "member"],
        icon: UserPlus,
        priority: 80,
        risk: "safe",
        execute: async (_input, context) => {
          await context.navigate("/settings?section=team&action=invite");

          return {
            success: true,
            message: "Employee invitation opened.",
          };
        },
      }),
    ];

    return () => unregister.forEach((dispose) => dispose());
  }, [registerAction]);

  return null;
}
