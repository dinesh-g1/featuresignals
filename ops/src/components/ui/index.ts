// UI Components Index
// Re-export all UI components for convenient importing

// ─── Button ──────────────────────────────────────────────────────────────
export { Button, buttonVariants } from "./button";
export type { ButtonProps } from "./button";

// ─── Card ───────────────────────────────────────────────────────────────
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  cardVariants,
} from "./card";
export type { CardProps } from "./card";

// ─── Input ───────────────────────────────────────────────────────────────
export { Input, inputVariants } from "./input";
export type { InputProps } from "./input";

// ─── Select ──────────────────────────────────────────────────────────────
export { Select, selectVariants } from "./select";
export type { SelectProps, SelectOption } from "./select";

// ─── Modal ───────────────────────────────────────────────────────────────
export {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  AlertModal,
  FormModal,
  useModal,
  modalVariants,
} from "./modal";
export type {
  ModalProps,
  ModalHeaderProps,
  ModalBodyProps,
  ModalFooterProps,
  AlertModalProps,
  FormModalProps,
  UseModalOptions,
} from "./modal";

// ─── Table ───────────────────────────────────────────────────────────────
export { Table, TableSkeleton, MobileCardSkeleton } from "./table";
export type {
  ColumnDefinition,
  TableProps,
  SortDirection,
  SortState,
  FilterState,
} from "./table";

// ─── Badge ──────────────────────────────────────────────────────────────
export { Badge, badgeVariants } from "./badge";
export type { BadgeProps } from "./badge";

// ─── Skeleton ───────────────────────────────────────────────────────────
export {
  Skeleton,
  SkeletonGroup,
  TextSkeleton,
  AvatarSkeleton,
  CardSkeleton,
  skeletonVariants,
} from "./skeleton";
export type {
  SkeletonProps,
  SkeletonGroupProps,
  TextSkeletonProps,
  AvatarSkeletonProps,
  CardSkeletonProps,
} from "./skeleton";

// ─── StatCard ───────────────────────────────────────────────────────────
export {
  StatCard,
  StatCardSkeleton,
  StatCardGroup,
  statCardVariants,
} from "./stat-card";
export type {
  StatCardProps,
  StatCardSkeletonProps,
  StatCardGroupProps,
} from "./stat-card";

// ─── QuickAction ─────────────────────────────────────────────────────────
export {
  QuickAction,
  QuickActionGroup,
  QuickActionSkeleton,
  quickActionVariants,
} from "./quick-action";
export type {
  QuickActionProps,
  QuickActionGroupProps,
  QuickActionSkeletonProps,
} from "./quick-action";

// ─── ProgressBar ─────────────────────────────────────────────────────────
export {
  ProgressBar,
  progressBarVariants,
  progressBarFillVariants,
  MultiStepProgress,
  ProgressBarGroup,
} from "./progress-bar";
export type {
  ProgressBarProps,
  MultiStepProgressProps,
  ProgressBarGroupProps,
} from "./progress-bar";

// ─── Layout Components ───────────────────────────────────────────────────
// Note: Layout components are exported from "@/components/layout"
// This file only contains primitive UI components

// ─── Re-export utility ───────────────────────────────────────────────────
export { cn } from "@/lib/utils";
