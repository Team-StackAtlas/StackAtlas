import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Map from './pages/Map';
import Square from './pages/Square';
import Lab from './pages/Lab';
import Comms from './pages/Comms';
import Profile from './pages/Profile';
import SupplementPage from './pages/SupplementPage';
import StackPage from './pages/StackPage';
import BrandPage from './pages/BrandPage';
import PostDetail from './pages/PostDetail';
import Login from './pages/Login';
import LogIntake from './pages/LogIntake';
import LogEntry from './pages/LogEntry';
import LogNotes from './pages/LogNotes';
import Onboarding from './pages/Onboarding';
import Create from './pages/Create';
import Compare from './pages/Compare';
import RequireAuth from './components/RequireAuth';
import { UserScopeProvider } from './context/UserScopeContext';
import { FilterProvider } from './context/FilterContext';
import { MockRoleProvider } from './context/MockRoleContext';

export default function App() {
  return (
    <UserScopeProvider>
      <FilterProvider>
        <MockRoleProvider>
        <BrowserRouter>
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
              <Route path="profile" element={<Profile />} />
              <Route path="profile/:username" element={<Profile />} />
              <Route path="post/:id" element={<PostDetail />} />
              <Route path="substance/:id" element={<SupplementPage />} />
              <Route path="supplement/:id" element={<SupplementPage />} />
              <Route path="stack/:id" element={<StackPage />} />
              <Route path="brand/:id" element={<BrandPage />} />
              <Route path="compare" element={<Compare />} />
            </Route>
          </Routes>
        </BrowserRouter>
        </MockRoleProvider>
      </FilterProvider>
    </UserScopeProvider>
  );
}
