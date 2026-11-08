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
        const focusableSelector = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';
        const focusable = () => Array.from(container?.querySelectorAll<HTMLElement>(focusableSelector) || [])
            .filter(element => !element.hidden && element.getClientRects().length > 0);
        focusable()[0]?.focus();

        const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
            onClose();
            return;
        }

        const focusableEls = focusable();
        if (e.key === "Tab" && focusableEls.length > 0) {
            const first = focusableEls[0];
            const last = focusableEls[focusableEls.length - 1];

            if (!container?.contains(document.activeElement)) {
            e.preventDefault();
            (e.shiftKey ? last : first).focus();
            } else if (e.shiftKey && document.activeElement === first) {
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
