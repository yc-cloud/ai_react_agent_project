import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  type AgentVO,
  type CreateAgentRequest,
  type UpdateAgentRequest,
  getAgents,
  createAgent,
  deleteAgent,
  updateAgent,
} from "../api/api.ts";

interface AgentsContextType {
  agents: AgentVO[];
  refreshAgents: () => Promise<void>;
  createAgentHandle: (agent: CreateAgentRequest) => Promise<void>;
  deleteAgentHandle: (agentId: string) => Promise<void>;
  updateAgentHandle: (agentId: string, request: UpdateAgentRequest) => Promise<void>;
}

const AgentsContext = createContext<AgentsContextType | undefined>(undefined);

export function AgentsProvider({ children }: { children: React.ReactNode }) {
  const [agents, setAgents] = useState<AgentVO[]>([]);

  const fetchAgents = useCallback(async () => {
    const resp = await getAgents();
    setAgents(resp.agents);
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const createAgentHandle = useCallback(async (agent: CreateAgentRequest) => {
    await createAgent(agent);
    await fetchAgents();
  }, [fetchAgents]);

  const deleteAgentHandle = useCallback(async (agentId: string) => {
    await deleteAgent(agentId);
    await fetchAgents();
  }, [fetchAgents]);

  const updateAgentHandle = useCallback(async (agentId: string, request: UpdateAgentRequest) => {
    await updateAgent(agentId, request);
    await fetchAgents();
  }, [fetchAgents]);

  return (
    <AgentsContext.Provider
      value={{
        agents,
        refreshAgents: fetchAgents,
        createAgentHandle,
        deleteAgentHandle,
        updateAgentHandle,
      }}
    >
      {children}
    </AgentsContext.Provider>
  );
}

export function useAgentsContext() {
  const context = useContext(AgentsContext);
  if (context === undefined) {
    throw new Error("useAgentsContext must be used within an AgentsProvider");
  }
  return context;
}
