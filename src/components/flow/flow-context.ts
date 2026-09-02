import { createContext, useContext } from "react";

export const RetryNodeContext = createContext<(nodeId: string) => void>(() => {});

export function useRetryNode() {
  return useContext(RetryNodeContext);
}
