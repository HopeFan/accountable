import { Route, Routes } from "react-router-dom";
import { Shell } from "./components/Shell";
import { ContactPage } from "./pages/ContactPage";
import { Contacts } from "./pages/Contacts";
import { Dashboard } from "./pages/Dashboard";
import { DealPage } from "./pages/DealPage";
import { Deals } from "./pages/Deals";
import { NotFound } from "./pages/NotFound";
import { OrganizationPage } from "./pages/OrganizationPage";
import { Organizations } from "./pages/Organizations";
import { Pipeline } from "./pages/Pipeline";

export function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Dashboard />} />
        <Route path="organizations" element={<Organizations />} />
        <Route path="organizations/:id" element={<OrganizationPage />} />
        <Route path="contacts" element={<Contacts />} />
        <Route path="contacts/:id" element={<ContactPage />} />
        <Route path="deals" element={<Deals />} />
        <Route path="deals/:id" element={<DealPage />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
