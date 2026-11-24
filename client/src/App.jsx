import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Popular from './pages/Popular.jsx';
import Community from './pages/Community.jsx';
import PostDetail from './pages/PostDetail.jsx';
import CreatePost from './pages/CreatePost.jsx';
import CreateCommunity from './pages/CreateCommunity.jsx';
import Profile from './pages/Profile.jsx';
import Saved from './pages/Saved.jsx';
import Search from './pages/Search.jsx';
import Chat from './pages/Chat.jsx';
import ModTools from './pages/ModTools.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="popular" element={<Popular />} />
        <Route path="r/:name" element={<Community />} />
        <Route path="r/:name/comments/:postId" element={<PostDetail />} />
        <Route
          path="r/:name/mod"
          element={
            <ProtectedRoute>
              <ModTools />
            </ProtectedRoute>
          }
        />
        <Route
          path="submit"
          element={
            <ProtectedRoute>
              <CreatePost />
            </ProtectedRoute>
          }
        />
        <Route
          path="r/:name/submit"
          element={
            <ProtectedRoute>
              <CreatePost />
            </ProtectedRoute>
          }
        />
        <Route
          path="create-community"
          element={
            <ProtectedRoute>
              <CreateCommunity />
            </ProtectedRoute>
          }
        />
        <Route path="u/:username" element={<Profile />} />
        <Route
          path="saved"
          element={
            <ProtectedRoute>
              <Saved />
            </ProtectedRoute>
          }
        />
        <Route path="search" element={<Search />} />
        <Route
          path="chat"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
