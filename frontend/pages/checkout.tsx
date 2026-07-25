import ProtectedRoute from "../components/ProtectedRoute";
import Checkout from "../src/pages/Checkout";

export default function CheckoutPage() {
  return (
    <ProtectedRoute>
      <Checkout />
    </ProtectedRoute>
  );
}
