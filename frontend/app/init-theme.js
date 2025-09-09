// This script runs before React hydration to prevent theme/logo flash
(function() {
  // Get saved project from localStorage
  const savedProject = localStorage.getItem('selectedProject') || 'quattrex';
  
  // Set initial CSS variables based on project
  const root = document.documentElement;
  
  if (savedProject === 'quattrex') {
    // Purple theme for Quattrex
    root.style.setProperty('--primary', '271 91% 65%');
    root.style.setProperty('--primary-foreground', '0 0% 100%');
    root.style.setProperty('--accent', '271 85% 58%');
    root.style.setProperty('--accent-foreground', '0 0% 100%');
    root.style.setProperty('--ring', '271 91% 65%');
    root.style.setProperty('--primary-color', '#8b5cf6');
    root.style.setProperty('--primary-rgb', '139 92 246');
    root.style.setProperty('--accent-color', '#7c3aed');
    
    // Check if dark mode
    if (root.classList.contains('dark')) {
      root.style.setProperty('--card', '260 20% 12%');
      root.style.setProperty('--card-foreground', '0 0% 95%');
      root.style.setProperty('--muted', '260 20% 18%');
      root.style.setProperty('--border', '260 20% 25%');
    } else {
      root.style.setProperty('--card', '0 0% 100%');
      root.style.setProperty('--card-foreground', '0 0% 3.9%');
      root.style.setProperty('--muted', '0 0% 96.1%');
      root.style.setProperty('--border', '0 0% 89.8%');
    }
  } else {
    // Green theme for Chase
    root.style.setProperty('--primary', '160 100% 18.8%');
    root.style.setProperty('--primary-foreground', '0 0% 100%');
    root.style.setProperty('--accent', '160 50% 95%');
    root.style.setProperty('--accent-foreground', '160 100% 18.8%');
    root.style.setProperty('--ring', '160 100% 18.8%');
    root.style.setProperty('--primary-color', '#10b981');
    root.style.setProperty('--primary-rgb', '16 185 129');
    root.style.setProperty('--accent-color', '#059669');
    
    // Check if dark mode
    if (root.classList.contains('dark')) {
      root.style.setProperty('--card', '138 12.5% 19.8%');
      root.style.setProperty('--card-foreground', '0 0% 95%');
      root.style.setProperty('--muted', '138 12.5% 19.8%');
      root.style.setProperty('--border', '138 12.5% 25%');
    } else {
      root.style.setProperty('--card', '0 0% 100%');
      root.style.setProperty('--card-foreground', '0 0% 3.9%');
      root.style.setProperty('--muted', '0 0% 96.1%');
      root.style.setProperty('--border', '0 0% 89.8%');
    }
  }
})();