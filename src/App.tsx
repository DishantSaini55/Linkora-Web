import { Routes, Route } from "react-router-dom";

import {
  Home,
  Explore,
  Saved,
  CreatePost,
  Profile,
  EditPost,
  PostDetails,
  UpdateProfile,
  AllUsers,
  Notifications,
  Settings,
  Moderation,
  Drafts,
  Analytics,
  Messages,
} from "@/_root/pages";
import AuthLayout from "./_auth/AuthLayout";
import RootLayout from "./_root/RootLayout";
import SignupForm from "@/_auth/forms/SignupForm";
import SigninForm from "@/_auth/forms/SigninForm";
import { Toaster } from "@/components/ui/toaster";
import { isAppwriteConfigured } from "@/lib/appwrite/config";

import "./globals.css";

const App = () => {
  if (!isAppwriteConfigured) {
    return (
      <section className="flex min-h-screen w-full items-center justify-center bg-dark-1 px-6 text-center text-white">
        <div className="max-w-xl">
          <h1 className="h2-bold">Appwrite configuration is missing</h1>
          <p className="body-regular mt-4 text-light-3">
            Create a .env.local file from .env.example, add your Appwrite
            project values, and restart the Vite development server.
          </p>
        </div>
      </section>
    );
  }

  return (
    <main className="flex h-screen">
      <Routes>
        {/* public routes */}
        <Route element={<AuthLayout />}>
          <Route path="/sign-in" element={<SigninForm />} />
          <Route path="/sign-up" element={<SignupForm />} />
        </Route>

        {/* private routes */}
        <Route element={<RootLayout />}>
          <Route index element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/all-users" element={<AllUsers />} />
          <Route path="/create-post" element={<CreatePost />} />
          <Route path="/drafts" element={<Drafts />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:userId" element={<Messages />} />
          <Route path="/update-post/:id" element={<EditPost />} />
          <Route path="/posts/:id" element={<PostDetails />} />
          <Route path="/profile/:id/*" element={<Profile />} />
          <Route path="/update-profile/:id" element={<UpdateProfile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/moderation" element={<Moderation />} />
        </Route>
      </Routes>

      <Toaster />
    </main>
  );
};

export default App;
