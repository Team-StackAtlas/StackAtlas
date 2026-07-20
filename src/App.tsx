import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import { UserScopeProvider } from './context/UserScopeContext';
import { FilterProvider } from './context/FilterContext';
import { MockRoleProvider } from './context/MockRoleContext';
import { CatalogProvider } from './context/CatalogContext';
import { PostsProvider } from './context/PostsContext';

// Route-level code splitting: each page loads on demand.
const Map = lazy(() => import('./pages/Map'));
const Square = lazy(() => import('./pages/Square'));
const Lab = lazy(() => import('./pages/Lab'));
const Comms = lazy(() => import('./pages/Comms'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Profile = lazy(() => import('./pages/Profile'));
const SupplementPage = lazy(() => import('./pages/SupplementPage'));
const StackPage = lazy(() => import('./pages/StackPage'));
const BrandPage = lazy(() => import('./pages/BrandPage'));
const PostDetail = lazy(() => import('./pages/PostDetail'));
const Login = lazy(() => import('./pages/Login'));
const LogIntake = lazy(() => import('./pages/LogIntake'));
const LogEntry = lazy(() => import('./pages/LogEntry'));
const LogNotes = lazy(() => import('./pages/LogNotes'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Create = lazy(() => import('./pages/Create'));
const Compare = lazy(() => import('./pages/Compare'));
const Library = lazy(() => import('./pages/Library'));
const Admin = lazy(() => import('./pages/Admin'));
const Glossary = lazy(() => import('./pages/Glossary'));
const AlbumDetail = lazy(() => import('./pages/AlbumDetail'));

export default function App() {
  return (
    <UserScopeProvider>
      <FilterProvider>
        <MockRoleProvider>
        <CatalogProvider>
        <PostsProvider>
        <BrowserRouter>
          <Suspense fallback={<div className="flex h-screen items-center justify-center text-sm text-slate-400">Loading…</div>}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/log/intake" element={<LogIntake />} />
            <Route path="/log/entry" element={<LogEntry />} />
            <Route path="/log/notes" element={<LogNotes />} />
            <Route path="/create" element={<RequireAuth><Create /></RequireAuth>} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/map" replace />} />
              <Route path="map" element={<Map />} />
              <Route path="square" element={<Square />} />
              <Route path="lab" element={<Lab />} />
              <Route path="comms" element={<Comms />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="profile" element={<Profile />} />
              <Route path="profile/:username" element={<Profile />} />
              <Route path="library" element={<Library />} />
              <Route path="admin" element={<Admin />} />
              <Route path="glossary" element={<Glossary />} />
              <Route path="library/albums/:id" element={<AlbumDetail />} />
              <Route path="post/:id" element={<PostDetail />} />
              <Route path="substance/:id" element={<SupplementPage />} />
              <Route path="supplement/:id" element={<SupplementPage />} />
              <Route path="stack/:id" element={<StackPage />} />
              <Route path="brand/:id" element={<BrandPage />} />
              <Route path="compare" element={<Compare />} />
            </Route>
          </Routes>
          </Suspense>
        </BrowserRouter>
        </PostsProvider>
        </CatalogProvider>
        </MockRoleProvider>
      </FilterProvider>
    </UserScopeProvider>
  );
}
