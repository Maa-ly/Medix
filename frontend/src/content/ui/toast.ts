/**
 * Medix Toast Notifications
 * Simple toast notification component for content scripts
 */

import { injectStyles } from "./styles";

export type ToastType = "success" | "error" | "info";

export interface ToastConfig {
  message: string;
  type?: ToastType;
  duration?: number;
}

/**
 * Show a toast notification
 */
export function showToast(message: string, type: ToastType = "success"): void {
  injectStyles();

  // Remove any existing toast
  const existing = document.querySelector(".medix-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `medix-toast medix-toast-${type}`;
  const normalized = String(message || "").replace(/\s+/g, " ").trim();
  const max = 120;
  toast.textContent = normalized.length > max ? normalized.slice(0, max - 1) + "…" : normalized;
  document.body.appendChild(toast);

  // Auto-remove after 2 seconds
  setTimeout(() => {
    toast.style.animation = "medix-fadeOut 0.3s ease-out forwards";
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

/**
 * Show a success toast
 */
export function showSuccessToast(message: string): void {
  showToast(message, "success");
}

/**
 * Show an error toast
 */
export function showErrorToast(message: string): void {
  showToast(message, "error");
}
