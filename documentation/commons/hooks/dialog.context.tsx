import { createContext, useContext } from "react";
import useDialog, { type UseDialogReturnType } from "./use-dialog.hook";

const Context = createContext<UseDialogReturnType>({} as UseDialogReturnType);

export const DialogProvider = ({ children }: { children: React.ReactNode }) => {
  const value = useDialog();
  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export const useDialogContext = () => useContext(Context);
