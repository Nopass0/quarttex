"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type ProjectType = "chase" | "quattrex";

interface ProjectConfig {
  name: string;
  title: string;
  description: string;
  primaryColor: string;
  primaryColorRgb: string;
  accentColor: string;
  theme: {
    light: {
      primary: string;
      primaryHover: string;
      primaryForeground: string;
      accent: string;
      accentHover: string;
      background: string;
      foreground: string;
      muted: string;
      mutedForeground: string;
    };
    dark: {
      primary: string;
      primaryHover: string;
      primaryForeground: string;
      accent: string;
      accentHover: string;
      background: string;
      foreground: string;
      muted: string;
      mutedForeground: string;
    };
  };
}

const projectConfigs: Record<ProjectType, ProjectConfig> = {
  chase: {
    name: "Chase",
    title: "Chase - P2P Payment Platform",
    description: "Secure P2P payment platform with multi-role support",
    primaryColor: "#10b981", // emerald-500
    primaryColorRgb: "16 185 129",
    accentColor: "#059669", // emerald-600
    theme: {
      light: {
        primary: "#10b981",
        primaryHover: "#059669",
        primaryForeground: "#ffffff",
        accent: "#059669",
        accentHover: "#047857",
        background: "#ffffff",
        foreground: "#0a0a0a",
        muted: "#f6f6f6",
        mutedForeground: "#737373",
      },
      dark: {
        primary: "#10b981",
        primaryHover: "#34d399",
        primaryForeground: "#022c22",
        accent: "#34d399",
        accentHover: "#6ee7b7",
        background: "#0a0a0a",
        foreground: "#ededed",
        muted: "#171717",
        mutedForeground: "#a3a3a3",
      },
    },
  },
  quattrex: {
    name: "Quattrex",
    title: "Quattrex - Trading Platform",
    description: "Advanced trading and payment platform",
    primaryColor: "#8b5cf6", // violet-500
    primaryColorRgb: "139 92 246",
    accentColor: "#7c3aed", // violet-600
    theme: {
      light: {
        primary: "#8b5cf6",
        primaryHover: "#7c3aed",
        primaryForeground: "#ffffff",
        accent: "#7c3aed",
        accentHover: "#6d28d9",
        background: "#ffffff",
        foreground: "#0a0a0a",
        muted: "#f6f6f6",
        mutedForeground: "#737373",
      },
      dark: {
        primary: "#8b5cf6",
        primaryHover: "#a78bfa",
        primaryForeground: "#1e1b4b",
        accent: "#a78bfa",
        accentHover: "#c4b5fd",
        background: "#0a0a0a",
        foreground: "#ededed",
        muted: "#1a1625",
        mutedForeground: "#a3a3a3",
      },
    },
  },
};

interface ProjectContextType {
  project: ProjectType;
  setProject: (project: ProjectType) => void;
  config: ProjectConfig;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [project, setProjectState] = useState<ProjectType>(() => {
    // Check localStorage on initial load
    if (typeof window !== "undefined") {
      const savedProject = localStorage.getItem("selectedProject") as ProjectType;
      if (savedProject && projectConfigs[savedProject]) {
        return savedProject;
      }
    }
    return "quattrex"; // Default to quattrex
  });
  const config = projectConfigs[project];

  useEffect(() => {
    // Update CSS variables based on project
    const updateColors = () => {
      const root = document.documentElement;
      
      if (project === "quattrex") {
        // Purple theme for Quattrex
        root.style.setProperty("--primary", "271 91% 65%"); // violet-500
        root.style.setProperty("--primary-foreground", "0 0% 100%");
        root.style.setProperty("--accent", "271 85% 58%"); // violet-600
        root.style.setProperty("--accent-foreground", "0 0% 100%");
        root.style.setProperty("--ring", "271 91% 65%");
        root.style.setProperty("--primary-color", "#8b5cf6");
        root.style.setProperty("--primary-rgb", "139 92 246");
        root.style.setProperty("--accent-color", "#7c3aed");
        
        // Dark mode adjustments for Quattrex
        if (root.classList.contains("dark")) {
          root.style.setProperty("--primary", "263 70% 50%"); // violet in dark
          root.style.setProperty("--accent", "263 70% 45%");
          root.style.setProperty("--card", "260 20% 12%"); // purple-tinted dark
          root.style.setProperty("--popover", "260 20% 12%");
          root.style.setProperty("--muted", "260 20% 18%");
          root.style.setProperty("--border", "260 20% 25%");
          root.style.setProperty("--input", "260 20% 25%");
          root.style.setProperty("--sidebar-background", "260 20% 8%");
          root.style.setProperty("--sidebar-accent", "260 20% 15%");
          root.style.setProperty("--sidebar-border", "260 20% 25%");
          root.style.setProperty("--sidebar-primary", "263 70% 50%");
          root.style.setProperty("--sidebar-ring", "263 70% 50%");
        }
      } else {
        // Green theme for Chase (default)
        root.style.setProperty("--primary", "160 100% 18.8%"); // #006039
        root.style.setProperty("--primary-foreground", "0 0% 100%");
        root.style.setProperty("--accent", "160 50% 95%");
        root.style.setProperty("--accent-foreground", "160 100% 18.8%");
        root.style.setProperty("--ring", "160 100% 18.8%");
        root.style.setProperty("--primary-color", "#10b981");
        root.style.setProperty("--primary-rgb", "16 185 129");
        root.style.setProperty("--accent-color", "#059669");
        
        // Dark mode adjustments for Chase
        if (root.classList.contains("dark")) {
          root.style.setProperty("--primary", "146 40% 30%"); // #2d6a42
          root.style.setProperty("--accent", "146 40% 35%");
          root.style.setProperty("--card", "138 12.5% 19.8%"); // #29382f
          root.style.setProperty("--popover", "138 12.5% 19.8%");
          root.style.setProperty("--muted", "138 12.5% 19.8%");
          root.style.setProperty("--border", "138 12.5% 25%");
          root.style.setProperty("--input", "138 12.5% 25%");
          root.style.setProperty("--sidebar-background", "0 0% 5.88%");
          root.style.setProperty("--sidebar-accent", "138 12.5% 19.8%");
          root.style.setProperty("--sidebar-border", "138 12.5% 25%");
          root.style.setProperty("--sidebar-primary", "146 40% 30%");
          root.style.setProperty("--sidebar-ring", "146 40% 30%");
        }
      }
    };

    updateColors();

    // Listen for theme changes
    const observer = new MutationObserver(() => {
      updateColors();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Update document title
    document.title = config.title;

    // Update meta tags
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", config.description);
    }

    // Update theme color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", config.primaryColor);
    }

    return () => {
      observer.disconnect();
    };
  }, [project, config]);

  const setProject = (newProject: ProjectType) => {
    setProjectState(newProject);
    localStorage.setItem("selectedProject", newProject);
  };

  return (
    <ProjectContext.Provider value={{ project, setProject, config }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}