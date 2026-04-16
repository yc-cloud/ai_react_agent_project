import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { message as antdMessage } from "antd";
import AgentChatHistory from "./agentChatView/AgentChatHistory.tsx";
import AgentChatInput from "./agentChatView/AgentChatInput.tsx";
import {
  createChatMessage,
  createChatSession,
  getChatMessagesBySessionId,
  getChatSession,
} from "../../api/api.ts";

import { useAgentsContext } from "../../contexts/AgentsContext.tsx";
import { useChatSessions } from "../../hooks/useChatSessions.ts";
import EmptyAgentChatView from "./agentChatView/EmptyAgentChatView.tsx";
import type { ChatMessageVO, SseMessage, SseMessageType } from "../../types";

const AgentChatView: React.FC = () => {
  const { chatSessionId } = useParams<{ chatSessionId: string }>();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [loading, setLoading] = useState(false);
  const { agents } = useAgentsContext();
  const { refreshChatSessions } = useChatSessions();

  const [messages, setMessages] = useState<ChatMessageVO[]>([]);

  const addMessage = (message: ChatMessageVO) => {
    setMessages((prevMessages) => [...prevMessages, message]);
  };

  const [agentId, setAgentId] = useState<string>("");

  // 防止 SSE 重连时 pending message 被重复发送
  const pendingMessageSentRef = useRef(false);

  const getChatMessages = useCallback(async () => {
    if (!chatSessionId) {
      return;
    }
    const resp = await getChatMessagesBySessionId(chatSessionId);
    setMessages(resp.chatMessages);

    const fetchData = async () => {
      const resp = await getChatSession(chatSessionId);
      // setChatSession(resp.chatSession);
      setAgentId(resp.chatSession.agentId);
    };
    fetchData().then();
  }, [chatSessionId]);

  useEffect(() => {
    if (!chatSessionId) {
      return;
    }
    getChatMessages().then();
  }, [chatSessionId, getChatMessages]);

  const handleSendMessage = async (value: string | { text: string }) => {
    // 处理 Sender 组件可能传递的不同格式
    const message = typeof value === "string" ? value : value.text;

    console.log(message);

    if (!message || !message.trim()) return;

    // 如果没有 chatSessionId，创建新会话
    if (!chatSessionId) {
      if (!agentId) {
        antdMessage.warning("请先创建一个智能体助手");
        return;
      }
      setLoading(true);
      try {
        const response = await createChatSession({
          agentId: agentId,
          title: message.slice(0, 20),
        });
        // 刷新聊天会话列表
        await refreshChatSessions();
        // 导航到新创建的会话
        navigate(`/chat/${response.chatSessionId}`, {
          replace: true,
          // 携带初始化消息
          state: {
            init: false,
            initMessage: message,
          },
        });
      } catch (error) {
        console.error("创建聊天会话失败:", error);
        antdMessage.error("创建聊天会话失败，请重试");
      } finally {
        setLoading(false);
      }
    } else {
      if (state?.init) {
        console.log("init", state.initMessage);
        await createChatMessage({
          agentId: agentId ?? "",
          sessionId: chatSessionId,
          role: "user",
          content: state.initMessage ?? "",
        });
      } else {
        console.log("ask", message);
        await createChatMessage({
          agentId: agentId ?? "",
          sessionId: chatSessionId,
          role: "user",
          content: message,
        });
      }
      await getChatMessages();
    }
  };

  const [displayAgentStatus, setDisplayAgentStatus] = useState<boolean>(false);
  const [agentStatusText, setAgentStatusText] = useState("");
  const [agentStatusType, setAgentStatusType] = useState<
    SseMessageType | undefined
  >(undefined);

  useEffect(() => {
    // sse 连接处理, 不是对话消息不开连接
    if (!chatSessionId) {
      return;
    }
    const es = new EventSource(
      `/sse/connect/${chatSessionId}`,
    );
    es.onmessage = (event) => {
      console.log("Received message:", event.data);
    };
    es.onerror = (error) => {
      console.error("SSE error:", error);
    };

    es.addEventListener("message", (event) => {
      // 解析 JSON
      const message = JSON.parse(event.data) as SseMessage;
      if (message.type === "AI_GENERATED_CONTENT") {
        // 将 AI 生成的内容存到 messages 中
        addMessage(message.payload.message);
      } else if (message.type === "AI_PLANNING") {
        setDisplayAgentStatus(true);
        setAgentStatusText(message.payload.statusText);
        setAgentStatusType("AI_PLANNING");
      } else if (message.type === "AI_THINKING") {
        setDisplayAgentStatus(true);
        setAgentStatusText(message.payload.statusText);
        setAgentStatusType("AI_THINKING");
      } else if (message.type === "AI_EXECUTING") {
        setDisplayAgentStatus(true);
        setAgentStatusText(message.payload.statusText);
        setAgentStatusType("AI_EXECUTING");
      } else if (message.type === "AI_DONE") {
        setDisplayAgentStatus(false);
        setAgentStatusText("");
        setAgentStatusType(undefined);
      } else {
        throw new Error(`Unknown message type: ${message.type}`);
      }
    });

    es.addEventListener("init", async () => {
      // SSE 连接建立后，如果有待发送的消息（来自新建会话跳转），立即发送
      // 用 ref 标记是否已发送，防止 EventSource 自动重连时重复触发
      if (pendingMessageSentRef.current) return;

      const pending = state?.pendingMessage as string | undefined;
      const pendingAgentId = state?.pendingAgentId as string | undefined;
      if (pending && pendingAgentId) {
        pendingMessageSentRef.current = true; // 先标记，再发送，确保不重复
        await createChatMessage({
          agentId: pendingAgentId,
          sessionId: chatSessionId,
          role: "user",
          content: pending,
        });
        await getChatMessages();
      }
    });

    return () => {
      console.log("Closing SSE connection.");
      es.close();
    };
  }, [chatSessionId]);

  return (
    <div className="flex flex-col h-full">
      {!chatSessionId ? (
        // 没有 chatSessionId：显示新建会话页
        <EmptyAgentChatView
          agents={agents}
          loading={loading}
          handleSendMessage={handleSendMessage}
        />
      ) : (
        // 有 chatSessionId：显示正常聊天界面
        <>
          <AgentChatHistory
            messages={messages}
            displayAgentStatus={displayAgentStatus}
            agentStatusText={agentStatusText}
            agentStatusType={agentStatusType}
          />
          <div className="border-t border-gray-200 p-4 bg-white">
            <AgentChatInput onSend={handleSendMessage} />
          </div>
        </>
      )}
    </div>
  );
};

export default AgentChatView;
