"use client";
// src/app/admin/MuiAdminProvider.tsx
// Wraps all admin pages with MUI dark theme + CssBaseline.
// This is a CLIENT component imported once in admin/layout.tsx.

import { createTheme,CssBaseline,ThemeProvider } from "@mui/material";
import { useMemo } from "react";

const adminTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#6366f1" },       // indigo-500
    secondary: { main: "#22d3ee" },     // cyan-400
    error: { main: "#f87171" },
    warning: { main: "#fbbf24" },
    success: { main: "#34d399" },
    background: {
      default: "#0f0f13",
      paper: "#18181f",
    },
    text: {
      primary: "#f1f5f9",
      secondary: "#94a3b8",
    },
    divider: "rgba(255,255,255,0.08)",
  },
  typography: {
    fontFamily: `"Inter", "Roboto", system-ui, sans-serif`,
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none", border: "1px solid rgba(255,255,255,0.06)" },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, fontSize: "0.75rem" },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: { "& .MuiTableCell-root": { fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.72rem" } },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { "&:hover": { backgroundColor: "rgba(99,102,241,0.05)" } },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600, borderRadius: 8 },
      },
    },
    MuiTextField: {
      defaultProps: { size: "small" },
    },
    MuiSelect: {
      defaultProps: { size: "small" },
    },
  },
});

export default function MuiAdminProvider({ children }: { children: React.ReactNode }) {
  const theme = useMemo(() => adminTheme, []);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
