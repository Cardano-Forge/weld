import { useState } from "react";

export type UseDialogReturnType = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const useDialog = (): UseDialogReturnType => {
  const [isOpen, setDialogOpen] = useState(false);
  return {
    isOpen,
    open: () => setDialogOpen(true),
    close: () => setDialogOpen(false),
    toggle: () => setDialogOpen((prev) => !prev),
  };
};

export default useDialog;
