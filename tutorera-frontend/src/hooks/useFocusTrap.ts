"use client";
import { useEffect,useRef } from "react";

/**
 * Traps keyboard focus within a modal while it's open, restores focus to the
 * previously focused element on close, and closes on Escape.
 */
export function useFocusTrap(isOpen: boolean, onClose: () => void) {
    const containerRef = useRef<HTMLDivElement>(null);
    const previouslyFocused = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        previouslyFocused.current = document.activeElement as HTMLElement;

        const container = containerRef.current;
        const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        const focusableEls = container?.querySelectorAll<HTMLElement>(focusableSelector);
        focusableEls?.[0]?.focus();

        const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
            onClose();
            return;
        }

        if (e.key === "Tab" && focusableEls && focusableEls.length > 0) {
            const first = focusableEls[0];
            const last = focusableEls[focusableEls.length - 1];

            if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
            }
        }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
        document.removeEventListener("keydown", handleKeyDown);
        previouslyFocused.current?.focus();
        };
    }, [isOpen, onClose]);

    return containerRef;
}