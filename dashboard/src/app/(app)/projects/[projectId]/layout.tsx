"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useAppStore } from "@/stores/app-store";

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const projectId = params.projectId as string;
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const currentProjectId = useAppStore((s) => s.currentProjectId);

  useEffect(() => {
    if (projectId && projectId !== currentProjectId) {
      setCurrentProject(projectId);
    }
  }, [projectId, currentProjectId, setCurrentProject]);

  // Clear project context when navigating away from project-scoped pages
  useEffect(() => {
    return () => {
      // Check after a tick to see if we're still on a project route
      setTimeout(() => {
        const stillOnProject = window.location.pathname.match(/^\/projects\/[^/]+\//);
        if (!stillOnProject) {
          setCurrentProject("");
        }
      }, 0);
    };
  }, [setCurrentProject]);

  return <>{children}</>;
}
