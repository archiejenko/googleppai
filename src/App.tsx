import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { posthog, isPostHogInitialized } from './lib/posthog';
import CookieConsent from './components/CookieConsent';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Onboarding from './pages/Onboarding';
import UpdatePassword from './pages/UpdatePassword';
import Dashboard from './pages/Dashboard';
import PitchRecorder from './pages/PitchRecorder';
import PitchAnalysis from './pages/PitchAnalysis';
import Training from './pages/Training';
import LearningPath from './pages/LearningPath';
import Drills from './pages/Drills';
import DrillSession from './pages/DrillSession';
import Industries from './pages/Industries';
import Team from './pages/Team';
import Pricing from './pages/Pricing';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import AccountDeletion from './pages/AccountDeletion';
import AppShell from './components/layout/AppShell';
import ProtectedRoute from './components/ProtectedRoute';
import ActiveTraining from './pages/ActiveTraining';
import Capabilities from './pages/Capabilities';
import UserJourney from './pages/UserJourney';
import IndustriesMarketing from './pages/IndustriesMarketing';
import AboutUs from './pages/AboutUs';
import Insights from './pages/Insights';
import TraditionalSalesTraining from './pages/blog/TraditionalSalesTraining';
import SalesOnboardingChurn from './pages/blog/SalesOnboardingChurn';
import CostOfWeakTraining from './pages/blog/CostOfWeakTraining';
import MarketingLayout from './components/layout/MarketingLayout';
import Landing from './pages/Landing';
import { AuthProvider } from './context/AuthContext';
import { TierProvider } from './context/TierContext';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';

// Lazy-loaded feature modules
const GoalsPage = lazy(() => import('./features/goals/GoalsPage'));
const LibraryPage = lazy(() => import('./features/library/LibraryPage'));
const LeaderboardPage = lazy(() => import('./features/leaderboard/LeaderboardPage'));
const SchedulePage = lazy(() => import('./features/schedule/SchedulePage'));
const InboxPage = lazy(() => import('./features/inbox/InboxPage'));
const RecordingsPage = lazy(() => import('./features/recordings/RecordingsPage'));
const NotificationsPage = lazy(() => import('./features/notifications/NotificationsPage'));

const MissedOpportunitiesPage = lazy(() => import('./features/revenue-intelligence/MissedOpportunitiesPage'));
const PipelineHealthPage = lazy(() => import('./features/revenue-intelligence/PipelineHealthPage'));
const CompetitivePage = lazy(() => import('./features/revenue-intelligence/CompetitivePage'));
const SynergiesPage = lazy(() => import('./features/revenue-intelligence/SynergiesPage'));
const DealOutcomesPage = lazy(() => import('./features/revenue-intelligence/DealOutcomesPage'));
const CallPrepPage = lazy(() => import('./features/call-prep/CallPrepPage'));
const LiveScoresHistoryPage = lazy(() => import('./features/live-scores/LiveScoresHistory'));
const BillingPage = lazy(() => import('./features/settings/BillingPage'));
const MeetingsPage = lazy(() => import('./features/meetings/MeetingsPage'));
const SessionReviewPage = lazy(() => import('./features/meetings/SessionReviewPage'));
const IntegrationsPage = lazy(() => import('./features/settings/IntegrationsPage'));
const TransferGapPage = lazy(() => import('./pages/TransferGap'));
const ManagerDashboard = lazy(() => import('./features/manager-coaching/ManagerDashboard'));
const TrainingDashboard = lazy(() => import('./features/training-analytics/TrainingDashboard'));
const AnalyticsPage = lazy(() => import('./features/analytics/AnalyticsPage'));
const RevenueIntelligencePage = lazy(() => import('./features/revenue-intelligence/RevenueIntelligencePage'));
const ObjectionLibrary = lazy(() => import('./features/objection-library/ObjectionLibrary'));
const WinLossPage = lazy(() => import('./features/win-loss/WinLossLogger'));
const CallReviewPage = lazy(() => import('./features/call-review/CallReviewPage'));
const CallsDashboard = lazy(() => import('./features/calls-dashboard/CallsDashboard'));
const RevenueDashboard = lazy(() => import('./features/revenue-dashboard/RevenueDashboard'));
const DealView = lazy(() => import('./features/deal-view/DealView'));
const InsightsDashboard = lazy(() => import('./features/insights/InsightsDashboard'));
// Legal pages — lazy-loaded, large text components
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const DataHandling = lazy(() => import('./pages/DataHandling'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex justify-center items-center h-[50vh]">
      <LoadingSpinner message="Loading..." />
    </div>
  );
}

function LazyRoute({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

/** Fires a $pageview event to PostHog on every route change.
 *  Only runs after the user has accepted cookies and PostHog is initialised. */
function PageViewTracker() {
  const location = useLocation();
  useEffect(() => {
    if (!isPostHogInitialized()) return;
    posthog.capture('$pageview', { $current_url: window.location.href });
  }, [location.pathname]);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TierProvider>
          <Router>
            <PageViewTracker />
            <CookieConsent />
            <Routes>
              {/* Public Marketing Pages */}
              <Route element={<MarketingLayout />}>
                <Route path="/" element={<Landing />} />
                <Route path="/capabilities" element={<Capabilities />} />
                <Route path="/features" element={<Navigate to="/capabilities" replace />} />
                <Route path="/user-journey" element={<UserJourney />} />
                <Route path="/industries" element={<IndustriesMarketing />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/about-us" element={<AboutUs />} />
                <Route path="/insights" element={<Insights />} />
                <Route path="/insights/traditional-sales-training" element={<TraditionalSalesTraining />} />
                <Route path="/insights/sales-onboarding-and-churn" element={<SalesOnboardingChurn />} />
                <Route path="/insights/the-cost-of-weak-training" element={<CostOfWeakTraining />} />
                {/* Legal pages */}
                <Route path="/privacy-policy" element={<LazyRoute><PrivacyPolicy /></LazyRoute>} />
                <Route path="/terms-of-service" element={<LazyRoute><TermsOfService /></LazyRoute>} />
                <Route path="/data-handling" element={<LazyRoute><DataHandling /></LazyRoute>} />
              </Route>

              {/* Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/update-password" element={<UpdatePassword />} />

              {/* Protected App Routes */}
              <Route element={<AppShell />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/record" element={<PitchRecorder />} />
                <Route path="/pitch/:id" element={<PitchAnalysis />} />
                <Route path="/training" element={<Training />} />
                <Route path="/learning-path" element={<LearningPath />} />
                <Route path="/drills" element={<Drills />} />
                <Route path="/drill/:id" element={<DrillSession />} />
                <Route path="/app/industries" element={<Industries />} />
                <Route path="/team" element={
                  <ProtectedRoute>
                    <Team />
                  </ProtectedRoute>
                } />
                <Route path="/admin" element={
                  <ProtectedRoute roles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/active-training" element={<ActiveTraining />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/account/delete" element={<AccountDeletion />} />

                {/* Lazy-loaded feature routes */}
                <Route path="/analytics" element={<LazyRoute><AnalyticsPage /></LazyRoute>} />
                <Route path="/goals" element={<LazyRoute><GoalsPage /></LazyRoute>} />
                <Route path="/library" element={<LazyRoute><LibraryPage /></LazyRoute>} />
                <Route path="/leaderboard" element={<LazyRoute><LeaderboardPage /></LazyRoute>} />
                <Route path="/schedule" element={<LazyRoute><SchedulePage /></LazyRoute>} />
                <Route path="/inbox" element={<LazyRoute><InboxPage /></LazyRoute>} />
                <Route path="/recordings" element={<LazyRoute><RecordingsPage /></LazyRoute>} />
                <Route path="/notifications" element={<LazyRoute><NotificationsPage /></LazyRoute>} />
                <Route path="/revenue-intel" element={<LazyRoute><RevenueIntelligencePage /></LazyRoute>} />
                <Route path="/revenue-intel/missed" element={<LazyRoute><MissedOpportunitiesPage /></LazyRoute>} />
                <Route path="/revenue-intel/pipeline" element={<LazyRoute><PipelineHealthPage /></LazyRoute>} />
                <Route path="/revenue-intel/competitive" element={<LazyRoute><CompetitivePage /></LazyRoute>} />
                <Route path="/revenue-intel/synergies" element={<LazyRoute><SynergiesPage /></LazyRoute>} />
                <Route path="/revenue-intel/outcomes" element={<LazyRoute><DealOutcomesPage /></LazyRoute>} />
                <Route path="/call-prep/:sessionId" element={<LazyRoute><CallPrepPage /></LazyRoute>} />
                <Route path="/live-scores" element={<LazyRoute><LiveScoresHistoryPage /></LazyRoute>} />
                <Route path="/settings/billing" element={<LazyRoute><BillingPage /></LazyRoute>} />
                <Route path="/meetings" element={<LazyRoute><MeetingsPage /></LazyRoute>} />
                <Route path="/sessions/:id" element={<LazyRoute><SessionReviewPage /></LazyRoute>} />
                <Route path="/settings/integrations" element={<LazyRoute><IntegrationsPage /></LazyRoute>} />
                <Route path="/transfer-gap" element={<LazyRoute><TransferGapPage /></LazyRoute>} />
                <Route path="/manager" element={
                  <ProtectedRoute roles={['admin', 'team_lead']}>
                    <LazyRoute><ManagerDashboard /></LazyRoute>
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/training" element={
                  <ProtectedRoute roles={['admin', 'team_lead']}>
                    <LazyRoute><TrainingDashboard /></LazyRoute>
                  </ProtectedRoute>
                } />
                <Route path="/objection-library" element={<LazyRoute><ObjectionLibrary /></LazyRoute>} />
                <Route path="/win-loss" element={<LazyRoute><WinLossPage /></LazyRoute>} />
                <Route path="/calls/:id" element={<LazyRoute><CallReviewPage /></LazyRoute>} />
                <Route path="/dashboard/calls" element={<LazyRoute><CallsDashboard /></LazyRoute>} />
                <Route path="/dashboard/revenue" element={
                  <ProtectedRoute roles={['admin', 'team_lead']}>
                    <LazyRoute><RevenueDashboard /></LazyRoute>
                  </ProtectedRoute>
                } />
                <Route path="/deals/:id" element={<LazyRoute><DealView /></LazyRoute>} />
                <Route path="/dashboard/insights" element={
                  <ProtectedRoute roles={['admin', 'team_lead']}>
                    <LazyRoute><InsightsDashboard /></LazyRoute>
                  </ProtectedRoute>
                } />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
        </TierProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
