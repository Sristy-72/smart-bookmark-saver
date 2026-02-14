"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [editingId, setEditingId] = useState(null);
  const [session, setSession] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  const user = session?.user;
  const userName = user?.user_metadata?.full_name || user?.email;
  const userAvatar = user?.user_metadata?.avatar_url;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function login() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  async function fetchBookmarks() {
    const { data } = await supabase
      .from("bookmarks")
      .select("*")
      .order("created_at", { ascending: false });

    setBookmarks(data || []);
  }

  useEffect(() => {
    if (session) {
      fetchBookmarks();
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel("realtime-bookmarks")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookmarks",
        },
        (payload) => {
          console.log("Realtime event:", payload);
          fetchBookmarks();
        },
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  function startEdit(bookmark) {
    setTitle(bookmark.title);
    setUrl(bookmark.url);
    setEditingId(bookmark.id);
  }

function isValidURL(link) {
  try {
    const parsed = new URL(link);

    // allow only http or https
    return parsed.protocol === "http:" || parsed.protocol === "https:" ;
  } catch {
    return false;
  }
}

  
  async function addBookmark(e) {

  e.preventDefault();

  // Trim removes spaces
  if (title.trim().length === 0) {
    alert("Title cannot be empty");
    return;
  }

  const fixedURL = normalizeURL(url);

  try {
    new URL(fixedURL);
  } catch {
    alert("Please enter a valid URL");
    return;
  }

  await supabase.from("bookmarks").insert({
    title,
    url: fixedURL,
    user_id: session.user.id
  });

  fetchBookmarks();

  setTitle("");
  setUrl("");
}



  async function deleteBookmark(id) {
    await supabase.from("bookmarks").delete().eq("id", id);
    fetchBookmarks();
  }

  async function clearAllBookmarks() {
    if (!confirm("Are you sure you want to delete all bookmarks?")) {
      return;
    }

    await supabase.from("bookmarks").delete().eq("user_id", session.user.id);

    fetchBookmarks();
  }

  if (!session) {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center items-center px-4">

      {/* App Title */}
      <h1 className="text-5xl font-bold text-white mb-4 text-center">
        Smart Bookmark App
      </h1>

      <p className="text-gray-400 mb-10 text-center">
        Save and manage your favorite links effortlessly 
      </p>

      {/* Login Card */}
      

        <button
          onClick={login}
          className="flex items-center gap-3 bg-blue-900 hover:bg-blue-600 transition px-6 py-3 rounded-xl text-white font-medium"
        >

          {/* Google Icon */}
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            className="w-5 h-5"
          />

          Continue with Google

        </button>

      

    </div>
  );
}



  function getGreeting() {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white px-4 sm:px-6 md:px-8 py-6">
      <div className="max-w-2xl mx-auto">
        {/* HEADER */}

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">

  {/* Greeting section */}
  <div className="flex items-center gap-3">

    {/* Profile image */}
    {userAvatar && (
      <img
        src={userAvatar}
        alt="profile"
        className="w-12 h-12 rounded-full"
      />
    )}

    <div>
      <p className="text-lg text-gray-300">
        {getGreeting()},
      </p>

      <h2 className="text-2xl font-bold">
        {userName}
      </h2>
    </div>

  </div>


  {/* Buttons section */}
  <div className="flex gap-2">

    <button
      onClick={clearAllBookmarks}
      className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition"
    >
      Clear All
    </button>

    <button
      onClick={logout}
      className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg"
    >
      Logout
    </button>

  </div>

</div>


        {/* FORM */}
        <form
          onSubmit={addBookmark}
          className="bg-gray-900 p-4 rounded-xl mb-6 flex flex-col sm:flex-row gap-3"
        >
          <input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 w-full outline-none focus:border-blue-400"
          />

          <input
            placeholder="URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 w-full outline-none focus:border-blue-400"
          />

          <button className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded transition">
            {editingId ? "Update" : "Add"}
          </button>
        </form>

        {/* BOOKMARK LIST */}

        <div className="space-y-3">
          {bookmarks.length === 0 && (
            <p className="text-center text-gray-400 py-10">
              No bookmarks yet — add your first one 🚀
            </p>
          )}

          {bookmarks.map((b) => (
            <div
              key={b.id}
              className="border border-gray-700 bg-gray-900 rounded-lg p-4 flex flex-col sm:flex-row sm:justify-between gap-3 hover:scale-[1.02] transition"
            >
              <div>
                <p className="font-semibold">{b.title}</p>

                <a
                  href={b.url}
                  target="_blank"
                  className="text-blue-400 text-sm break-all"
                >
                  {b.url}
                </a>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(b)}
                  className="text-yellow-400 hover:text-yellow-500"
                >
                  ✏️
                </button>

                <button
                  onClick={() => deleteBookmark(b.id)}
                  className="text-red-400 hover:text-red-500"
                >
                  ❌
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
