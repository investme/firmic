import ProtectedRoute from "../components/ProtectedRoute";
import OnboardingLayout from "../components/onboarding/OnboardingLayout";

export default function OnboardingPage() {
  return (
    <ProtectedRoute>
      <OnboardingLayout />
    </ProtectedRoute>
  );
}