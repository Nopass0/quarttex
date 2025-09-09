"use client";

import React from "react";
import { useProject } from "@/contexts/ProjectContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function ProjectSelector() {
  const { project, setProject } = useProject();

  // Only show in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={project} onValueChange={(value: any) => setProject(value)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="chase">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>Chase</span>
            </div>
          </SelectItem>
          <SelectItem value="quattrex">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-violet-500" />
              <span>Quattrex</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function ProjectToggle() {
  const { project, setProject } = useProject();

  // Only show in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setProject(project === "chase" ? "quattrex" : "chase")}
      className="flex items-center gap-2"
    >
      {project === "chase" ? (
        <>
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>Chase</span>
        </>
      ) : (
        <>
          <div className="w-3 h-3 rounded-full bg-violet-500" />
          <span>Quattrex</span>
        </>
      )}
    </Button>
  );
}