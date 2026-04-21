import React, { useEffect, useState } from "react";
import { useToast } from "./components/Toast";

const API = "https://animatch-ofks.onrender.com";

const STATUS_LABELS = {
  none:       { label: "—",            color: "var(--text-dim)" },
  watching:   { label: "Watching",     color: "var(--teal)" },
  completed:  { label: "Completed",    color: "var(--purple)" },
  rewatching: { label: "Rewatching",   color: "var(--yellow)" }
};

function Friends() {
  const username = localStorage.getItem("username");
  const toast    = useToast();

  const [friends, setFriends]           = useState([]);
  const [searchUser, setSearchUser]     = useState("");
  const [loading, setLoading]           = useState(true);
  const [viewingFriend, setViewingFriend] = useState(null);
  const [friendList, setFriendList]     = useState([]);
  const [friendListLoading, setFriendListLoading] = useState(false);

  useEffect(() => {
    if (!username) { window.location.hash = "/"; return; }
    loadFriends();
  }, []);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/friends/${username}`);
      const data = res.ok ? await res.json() : [];
      setFriends(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const sendRequest = async (e) => {
    e.preventDefault();
    if (!searchUser.trim()) return;
    try {
      const res  = await fetch(`${API}/friends/request`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requester: username, receiver: searchUser.trim() })
      });
      const data = await res.json();
      if (res.ok) { toast(data.message, "success"); setSearchUser(""); loadFriends(); }
      else toast(data.message || "Could not send request.", "error");
    } catch (err) { toast("Network error.", "error"); }
  };

  const acceptRequest = async (requester) => {
    try {
      const res = await fetch(`${API}/friends/accept`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requester, receiver: username })
      });
      const data = await res.json();
      if (res.ok) { toast(data.message, "success"); loadFriends(); }
      else toast(data.message, "error");
    } catch (err) { toast("Network error.", "error"); }
  };

  const removeFriend = async (friendName) => {
    try {
      const res = await fetch(`${API}/friends`, {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userA: username, userB: friendName })
      });
      if (res.ok) { toast("Removed.", "info"); loadFriends(); if (viewingFriend === friendName) setViewingFriend(null); }
    } catch (err) { toast("Network error.", "error"); }
  };

  const viewWatchlist = async (friendName) => {
    if (viewingFriend === friendName) { setViewingFriend(null); return; }
    setViewingFriend(friendName);
    setFriendListLoading(true);
    try {
      const res  = await fetch(`${API}/friends/${username}/watchlist/${friendName}`);
      const data = res.ok ? await res.json() : [];
      setFriendList(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); setFriendList([]); }
    setFriendListLoading(false);
  };

  const accepted  = friends.filter(f => f.status === "accepted");
  const pending   = friends.filter(f => f.status === "pending");
  const incoming  = pending.filter(f => f.direction === "received");
  const outgoing  = pending.filter(f => f.direction === "sent");

  return (
    <div className="am-page">

      <nav className="am-nav">
        <div className="am-logo"><span className="ani">Ani</span><span className="match">Match</span></div>
        <button className="am-btn am-btn-ghost am-btn-sm" onClick={() => (window.location.hash = "/dashboard")}>⬅ Profile</button>
        <button className="am-btn am-btn-teal am-btn-sm" onClick={() => (window.location.hash = "/watchlist")}>📋 Watchlist</button>
      </nav>

      <h1 style={{ marginBottom: "6px" }}>
        Friends <span style={{ color: "var(--purple)" }}>& Social</span>
      </h1>
      <p style={{ fontSize: "13px", marginBottom: "28px" }}>
        Connect with friends and see what they're watching!
      </p>

      {/* Send friend request */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px", marginBottom: "28px" }}>
        <h3 style={{ marginBottom: "12px" }}>Add a Friend</h3>
        <form onSubmit={sendRequest} style={{ display: "flex", gap: "10px" }}>
          <input
            className="am-input"
            placeholder="Enter their username..."
            value={searchUser}
            onChange={e => setSearchUser(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="am-btn am-btn-coral" style={{ whiteSpace: "nowrap" }}>
            Send Request
          </button>
        </form>
      </div>

      {loading ? (
        <div className="am-loading">Loading friends...</div>
      ) : (
        <>
          {/* Incoming requests */}
          {incoming.length > 0 && (
            <div style={{ marginBottom: "28px" }}>
              <h2 style={{ marginBottom: "12px" }}>
                Incoming Requests <span style={{ color: "var(--coral)", fontSize: "14px" }}>({incoming.length})</span>
              </h2>
              {incoming.map(f => (
                <div key={f.friendName} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "var(--surface)", border: "1px solid var(--coral)", borderRadius: "var(--radius-md)",
                  padding: "12px 16px", marginBottom: "8px"
                }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: "14px" }}>{f.friendName}</span>
                    <span style={{ fontSize: "12px", color: "var(--text-dim)", marginLeft: "8px" }}>wants to be friends</span>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className="am-btn am-btn-teal am-btn-sm" onClick={() => acceptRequest(f.friendName)}>Accept</button>
                    <button className="am-btn am-btn-red am-btn-sm" onClick={() => removeFriend(f.friendName)}>Decline</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Outgoing requests */}
          {outgoing.length > 0 && (
            <div style={{ marginBottom: "28px" }}>
              <h2 style={{ marginBottom: "12px" }}>Sent Requests</h2>
              {outgoing.map(f => (
                <div key={f.friendName} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
                  padding: "12px 16px", marginBottom: "8px"
                }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: "14px" }}>{f.friendName}</span>
                    <span style={{ fontSize: "12px", color: "var(--text-dim)", marginLeft: "8px" }}>pending...</span>
                  </div>
                  <button className="am-btn am-btn-ghost am-btn-sm" onClick={() => removeFriend(f.friendName)}>Cancel</button>
                </div>
              ))}
            </div>
          )}

          {/* Friends list */}
          <div>
            <h2 style={{ marginBottom: "12px" }}>
              My Friends <span style={{ color: "var(--teal)", fontSize: "14px" }}>({accepted.length})</span>
            </h2>

            {accepted.length === 0 ? (
              <div className="am-empty" style={{ padding: "28px" }}>
                <h3>No friends yet</h3>
                <p>Send a friend request above to get started!</p>
              </div>
            ) : (
              accepted.map(f => (
                <div key={f.friendName} style={{ marginBottom: "12px" }}>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: "var(--surface)", border: `1px solid ${viewingFriend === f.friendName ? "var(--purple)" : "var(--border)"}`,
                    borderRadius: viewingFriend === f.friendName ? "var(--radius-lg) var(--radius-lg) 0 0" : "var(--radius-lg)",
                    padding: "14px 18px", transition: "border-color 0.2s"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{
                        width: "38px", height: "38px", borderRadius: "50%",
                        background: "var(--purple-dim)", border: "2px solid var(--purple)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "16px", fontWeight: 800, color: "var(--purple)"
                      }}>
                        {f.friendName[0].toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 700, fontSize: "15px" }}>{f.friendName}</span>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        className={`am-btn am-btn-sm ${viewingFriend === f.friendName ? "am-btn-purple" : "am-btn-ghost"}`}
                        onClick={() => viewWatchlist(f.friendName)}
                      >
                        {viewingFriend === f.friendName ? "Hide list ▲" : "See watchlist ▼"}
                      </button>
                      <button className="am-btn am-btn-ghost am-btn-sm" onClick={() => removeFriend(f.friendName)}>Remove</button>
                    </div>
                  </div>

                  {/* Friend's watchlist panel */}
                  {viewingFriend === f.friendName && (
                    <div style={{
                      background: "var(--surface2)", border: "1px solid var(--purple)",
                      borderTop: "none", borderRadius: "0 0 var(--radius-lg) var(--radius-lg)",
                      padding: "16px"
                    }}>
                      {friendListLoading ? (
                        <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Loading {f.friendName}'s list...</p>
                      ) : friendList.length === 0 ? (
                        <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>{f.friendName} hasn't saved anything yet!</p>
                      ) : (
                        <>
                          <p style={{ fontSize: "12px", color: "var(--text-dim)", marginBottom: "12px", fontWeight: 700 }}>
                            {friendList.length} anime in {f.friendName}'s list
                          </p>
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "400px", overflowY: "auto" }}>
                            {friendList.map(anime => {
                              const sc = STATUS_LABELS[anime.status] || STATUS_LABELS.none;
                              return (
                                <div key={anime.animeId} style={{
                                  display: "flex", alignItems: "center", gap: "10px",
                                  background: "var(--surface)", borderRadius: "var(--radius-md)",
                                  padding: "8px 12px", border: "1px solid var(--border)"
                                }}>
                                  {anime.image && (
                                    <img src={anime.image} alt={anime.title} style={{ width: "32px", height: "44px", objectFit: "cover", borderRadius: "4px", flexShrink: 0 }} />
                                  )}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{anime.title}</div>
                                    <div style={{ display: "flex", gap: "10px", marginTop: "2px" }}>
                                      <span style={{ fontSize: "11px", color: sc.color, fontWeight: 700 }}>{sc.label}</span>
                                      {anime.episodes && anime.currentEp > 0 && (
                                        <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>Ep {anime.currentEp}/{anime.episodes}</span>
                                      )}
                                      {anime.rating && (
                                        <span style={{ fontSize: "11px", color: "var(--yellow)" }}>★ {anime.rating}/10</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Friends;