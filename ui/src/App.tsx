import { BrowserRouter } from "react-router-dom";
import JChatMindLayout from "./components/JChatMindLayout.tsx";
import { ChatSessionsProvider } from "./contexts/ChatSessionsContext.tsx";
import { AgentsProvider } from "./contexts/AgentsContext.tsx";

function App() {
  return (
    <BrowserRouter>
      <AgentsProvider>
        <ChatSessionsProvider>
          <JChatMindLayout />
        </ChatSessionsProvider>
      </AgentsProvider>
    </BrowserRouter>
  );
}

export default App;
