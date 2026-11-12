import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { isDemoMode } from "./lib/demo";
import "./index.css";

if (isDemoMode) document.title = "Nuestro espacio";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <HashRouter>
    <App />
  </HashRouter>
);
