"use client";

import { Modal, Button } from "@heroui/react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
  isLoading,
}: ConfirmDialogProps) {
  return (
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open && !isLoading) onClose();
      }}
      variant="opaque"
      isDismissable={!isLoading}
    >
      <Modal.Container placement="center" size="sm" scroll="inside">
        <Modal.Dialog className="bg-slate-900 border border-slate-700 text-slate-100 w-full max-w-md">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading className="text-white">{title}</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <p className="text-sm text-slate-400">{message}</p>
          </Modal.Body>
          <Modal.Footer className="flex gap-2 justify-end">
            <Button variant="ghost" slot="close" isDisabled={isLoading}>
              Cancel
            </Button>
            <Button variant="danger" onPress={onConfirm} isDisabled={isLoading}>
              {isLoading ? "Deleting..." : confirmLabel}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

interface EntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSubmit: () => void;
  submitLabel: string;
  isLoading?: boolean;
  size?: "md" | "lg" | "xl";
}

const containerSize = {
  md: "md" as const,
  lg: "lg" as const,
  xl: "lg" as const,
};

const dialogWidth = {
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function EntityModal({
  isOpen,
  onClose,
  title,
  children,
  onSubmit,
  submitLabel,
  isLoading,
  size = "lg",
}: EntityModalProps) {
  return (
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open && !isLoading) onClose();
      }}
      variant="opaque"
      isDismissable={!isLoading}
    >
      <Modal.Container
        placement="center"
        size={containerSize[size]}
        scroll="inside"
      >
        <Modal.Dialog
          className={`bg-slate-900 border border-slate-700 text-slate-100 w-full ${dialogWidth[size]}`}
        >
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading className="text-white">{title}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="max-h-[70vh] overflow-y-auto">
            {children}
          </Modal.Body>
          <Modal.Footer className="flex gap-2 justify-end">
            <Button variant="ghost" slot="close" isDisabled={isLoading}>
              Cancel
            </Button>
            <Button variant="primary" onPress={onSubmit} isDisabled={isLoading}>
              {isLoading ? "Saving..." : submitLabel}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
