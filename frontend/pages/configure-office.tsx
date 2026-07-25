import ProtectedRoute from "../components/ProtectedRoute";
import ConfigureOffice from "../src/pages/ConfigureOffice";

export default function ConfigureOfficePage() {
  return (
    <ProtectedRoute>
      <ConfigureOffice />
    </ProtectedRoute>
  );
}
