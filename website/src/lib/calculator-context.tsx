"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { CompetitorProvider } from "@/lib/pricing";

interface CalculatorContextValue {
  teamSize: number;
  provider: CompetitorProvider;
  setTeamSize: (size: number) => void;
  setProvider: (provider: CompetitorProvider) => void;
}

const CalculatorContext = createContext<CalculatorContextValue | null>(null);

const DEFAULT_TEAM_SIZE = 50;
const DEFAULT_PROVIDER: CompetitorProvider = "launchdarkly";

export function CalculatorProvider({ children }: { children: ReactNode }) {
  const [teamSize, setTeamSize] = useState(DEFAULT_TEAM_SIZE);
  const [provider, setProvider] = useState<CompetitorProvider>(DEFAULT_PROVIDER);

  const handleSetTeamSize = useCallback((size: number) => {
    setTeamSize(size);
  }, []);

  const handleSetProvider = useCallback((p: CompetitorProvider) => {
    setProvider(p);
  }, []);

  return (
    <CalculatorContext.Provider
      value={{
        teamSize,
        provider,
        setTeamSize: handleSetTeamSize,
        setProvider: handleSetProvider,
      }}
    >
      {children}
    </CalculatorContext.Provider>
  );
}

export function useCalculatorContext(): CalculatorContextValue {
  const ctx = useContext(CalculatorContext);
  if (!ctx) {
    return {
      teamSize: DEFAULT_TEAM_SIZE,
      provider: DEFAULT_PROVIDER,
      setTeamSize: () => {},
      setProvider: () => {},
    };
  }
  return ctx;
}
