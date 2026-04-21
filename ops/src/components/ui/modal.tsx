"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { X, AlertCircle, Info, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "./button";
import { useMediaQuery } from "@/hooks/use-media-query";

// ─── Types ─────────────────────────────────────────────────────────────

const modalVariants = cva(
  "relative mx-auto flex max-h-[calc(100vh-4rem)] flex-col overflow-hidden bg-gray-900 shadow-2xl transition-all duration-300",
  {
    variants: {
      size: {
        sm: "w-full max-w-md rounded-xl",
        md: "w-full max-w-lg rounded-xl",
        lg: "w-full max-w-2xl rounded-xl",
        xl: "w-full max-w-4xl rounded-xl",
        full: "w-full h-full rounded-none",
      },
      position: {
        center: "my-8",
        top: "mt-8 mb-auto",
        bottom: "mt-auto mb-8",
      },
    },
    defaultVariants: {
      size: "md",
      position: "center",
    },
  },
);

export interface ModalProps extends VariantProps<typeof modalVariants> {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  preventScroll?: boolean;
  className?: string;
  containerClassName?: string;
  overlayClassName?: string;
  initialFocusRef?: React.RefObject<HTMLElement>;
  ariaLabel?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
}

// ─── Portal Component ──────────────────────────────────────────────────

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return ReactDOM.createPortal(children, document.body);
}

// ─── Focus Trap Hook ───────────────────────────────────────────────────

function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  isOpen: boolean,
) {
  React.useEffect(() => {
    if (!isOpen || !containerRef?.current) return;

    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[
      focusableElements.length - 1
    ] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleTabKey);
    firstElement.focus();

    return () => {
      document.removeEventListener("keydown", handleTabKey);
    };
  }, [isOpen, containerRef]);
}

// ─── Main Modal Component ──────────────────────────────────────────────

export function Modal({
  isOpen,
  onClose,
  children,
  size = "md",
  position = "center",
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  preventScroll = true,
  className,
  containerClassName,
  overlayClassName,
  initialFocusRef,
  ariaLabel,
  ariaLabelledby,
  ariaDescribedby,
}: ModalProps) {
  const modalRef = React.useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(min-width: 769px) and (max-width: 1024px)");

  // Adjust size for mobile/tablet
  const responsiveSize = isMobile
    ? "full"
    : isTablet && size === "xl"
      ? "lg"
      : size;
  const responsivePosition = isMobile ? "bottom" : position;

  // Handle escape key
  React.useEffect(() => {
    if (!closeOnEscape || !isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [closeOnEscape, isOpen, onClose]);

  // Prevent body scroll
  React.useEffect(() => {
    if (!preventScroll || !isOpen) return;

    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [preventScroll, isOpen]);

  // Focus management
  useFocusTrap(modalRef as React.RefObject<HTMLElement | null>, isOpen);

  // Handle initial focus
  React.useEffect(() => {
    if (isOpen && initialFocusRef?.current) {
      initialFocusRef.current.focus();
    }
  }, [isOpen, initialFocusRef]);

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        className={cn(
          "fixed inset-0 z-50 flex items-start justify-center p-4",
          isMobile && "items-end p-0",
          containerClassName,
        )}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        aria-describedby={ariaDescribedby}
      >
        {/* Overlay */}
        <div
          className={cn(
            "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
            overlayClassName,
          )}
          onClick={closeOnOverlayClick ? onClose : undefined}
          aria-hidden="true"
        />

        {/* Modal */}
        <div
          ref={modalRef}
          className={cn(
            modalVariants({
              size: responsiveSize,
              position: responsivePosition,
            }),
            isMobile && "max-h-[85vh] rounded-t-xl",
            className,
          )}
          onClick={(e) => e.stopPropagation()}
          role="document"
        >
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 z-10 rounded-lg p-2 text-gray-400 transition hover:bg-gray-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          )}
          {children}
        </div>
      </div>
    </Portal>
  );
}

// ─── Modal Subcomponents ───────────────────────────────────────────────

export interface ModalHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  showDivider?: boolean;
}

export function ModalHeader({
  title,
  description,
  icon,
  showDivider = true,
  className,
  children,
  ...props
}: ModalHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col space-y-2 px-6 pt-6 pb-4",
        showDivider && "border-b border-gray-800 pb-4",
        className,
      )}
      {...props}
    >
      <div className="flex items-start gap-3">
        {icon && <div className="mt-1 flex-shrink-0">{icon}</div>}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-gray-400">{description}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

export interface ModalBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  scrollable?: boolean;
}

export function ModalBody({
  className,
  scrollable = true,
  children,
  ...props
}: ModalBodyProps) {
  return (
    <div
      className={cn(
        "flex-1 px-6 py-4",
        scrollable && "overflow-y-auto",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface ModalFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "left" | "center" | "right" | "between";
  showDivider?: boolean;
}

export function ModalFooter({
  className,
  align = "right",
  showDivider = true,
  children,
  ...props
}: ModalFooterProps) {
  const alignmentClasses = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
    between: "justify-between",
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 px-6 pt-4 pb-6",
        alignmentClasses[align],
        showDivider && "border-t border-gray-800 pt-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── Pre-styled Modal Variants ─────────────────────────────────────────

export interface AlertModalProps extends Omit<ModalProps, "children"> {
  title: string;
  description: string;
  type?: "info" | "success" | "warning" | "error";
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  destructive?: boolean;
}

export function AlertModal({
  title,
  description,
  type = "info",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  destructive = false,
  onClose,
  ...modalProps
}: AlertModalProps) {
  const icons = {
    info: <Info className="h-5 w-5 text-blue-500" />,
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
  };

  const variant = destructive
    ? "destructive"
    : type === "error"
      ? "destructive"
      : "primary";

  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  const handleCancel = () => {
    onCancel?.();
    onClose();
  };

  return (
    <Modal onClose={onClose} size="sm" {...modalProps}>
      <ModalHeader
        title={title}
        description={description}
        icon={icons[type]}
        showDivider={false}
      />
      <ModalFooter align="right" showDivider={false}>
        <Button variant="outline" size="sm" onClick={handleCancel}>
          {cancelText}
        </Button>
        <Button variant={variant} size="sm" onClick={handleConfirm}>
          {confirmText}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export interface FormModalProps extends Omit<ModalProps, "children"> {
  title: string;
  description?: string;
  onSubmit?: (e: React.FormEvent) => void;
  submitText?: string;
  cancelText?: string;
  isLoading?: boolean;
  children: React.ReactNode;
}

export function FormModal({
  title,
  description,
  onSubmit,
  submitText = "Save",
  cancelText = "Cancel",
  isLoading = false,
  children,
  onClose,
  ...modalProps
}: FormModalProps) {
  const formRef = React.useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(e);
  };

  return (
    <Modal onClose={onClose} {...modalProps}>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="flex h-full flex-col"
      >
        <ModalHeader title={title} description={description} />
        <ModalBody scrollable>{children}</ModalBody>
        <ModalFooter align="right">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button type="submit" loading={isLoading}>
            {submitText}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

// ─── Hook for Modal State Management ──────────────────────────────────

export interface UseModalOptions {
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function useModal(options: UseModalOptions = {}) {
  const [isOpen, setIsOpen] = React.useState(options.defaultOpen || false);

  const open = React.useCallback(() => {
    setIsOpen(true);
    options.onOpenChange?.(true);
  }, [options]);

  const close = React.useCallback(() => {
    setIsOpen(false);
    options.onOpenChange?.(false);
  }, [options]);

  const toggle = React.useCallback(() => {
    setIsOpen((prev) => {
      const newValue = !prev;
      options.onOpenChange?.(newValue);
      return newValue;
    });
  }, [options]);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}

// ─── Export Everything ────────────────────────────────────────────────

export { modalVariants };
