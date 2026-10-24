import { Navigate, Route, Routes, useLocation } from 'react-router';
import { useApp } from '@/lib/data';
import { AppShell, Splash } from '@/components/app/shell';
import { lazy, Suspense } from 'react';

const Welcome = lazy(() => import('@/pages/welcome'));
const Home = lazy(() => import('@/pages/home'));
const Requests = lazy(() => import('@/pages/requests'));
const RequestDetail = lazy(() => import('@/pages/request-detail'));
const Budget = lazy(() => import('@/pages/budget'));
const Feed = lazy(() => import('@/pages/feed'));
const FamilyPage = lazy(() => import('@/pages/family'));
const Explore = lazy(() => import('@/pages/explore'));
const PublicPage = lazy(() => import('@/pages/public-page'));
const HowItWorks = lazy(() => import('@/pages/how'));
const Accounts = lazy(() => import('@/pages/accounts'));
const Give = lazy(() => import('@/pages/give'));
const Landing = lazy(() => import('@/pages/landing'));
const Login = lazy(() => import('@/pages/login'));

// Families get their dashboard; everyone else sees the landing page at "/".
function RequireFamily({ children }: { children: React.ReactNode }) {
  const { ready, profile, group } = useApp();
  const { pathname } = useLocation();
  if (!ready) return <Splash />;
  if (!profile || !group) return pathname === '/' ? <Landing /> : <Navigate to="/welcome" replace />;
  return children;
}

export default function App() {
  return (
    <Suspense fallback={<Splash />}>
    <Routes>
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/login" element={<Login />} />
      <Route path="/explore" element={<Explore />} />
      <Route path="/give" element={<Give />} />
      <Route path="/about" element={<Landing />} />
      <Route path="/p/:slug" element={<PublicPage />} />
      <Route path="/how" element={<HowItWorks />} />
      <Route element={<RequireFamily><AppShell /></RequireFamily>}>
        <Route index element={<Home />} />
        <Route path="requests" element={<Requests />} />
        <Route path="requests/:id" element={<RequestDetail />} />
        <Route path="budget" element={<Budget />} />
        <Route path="feed" element={<Feed />} />
        <Route path="family" element={<FamilyPage />} />
        <Route path="accounts" element={<Accounts />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}
