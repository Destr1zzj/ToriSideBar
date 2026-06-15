import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { NoteWindow } from "./NoteWindow";
import { ToolsWindow } from "./ToolsWindow";
import { I18nProvider } from "./i18n";
import { ErrorBoundary } from "./components/ErrorBoundary";

const params = new URLSearchParams(window.location.search);
const windowType = params.get("window");
const noteId = params.get("noteId") || "";

let content: React.ReactNode = <App />;
if (windowType === "note") {
  content = <NoteWindow noteId={noteId} />;
} else if (windowType === "tools") {
  content = <ToolsWindow />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <I18nProvider>
        {content}
      </I18nProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
