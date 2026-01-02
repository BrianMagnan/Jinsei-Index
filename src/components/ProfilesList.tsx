import { useState, useEffect } from "react";
import { profileAPI, authAPI } from "../services/api";
import type { Profile } from "../types";

interface ProfilesListProps {
  onProfileSelect?: (profileId: string) => void;
}

export function ProfilesList({ onProfileSelect }: ProfilesListProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileEmail, setNewProfileEmail] = useState("");
  const [newProfilePassword, setNewProfilePassword] = useState("");
  const [newProfileAvatar, setNewProfileAvatar] = useState("");
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editProfileName, setEditProfileName] = useState("");
  const [editProfileEmail, setEditProfileEmail] = useState("");
  const [editProfileBio, setEditProfileBio] = useState("");
  const [editProfileAvatar, setEditProfileAvatar] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const data = await profileAPI.getAll();
      setProfiles(data);
    } catch (err) {
      console.error("Failed to load profiles:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProfiles = profiles.filter((profile) =>
    profile.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim() || !newProfileEmail.trim() || !newProfilePassword.trim()) return;

    if (newProfilePassword.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    try {
      await authAPI.register({
        name: newProfileName.trim(),
        email: newProfileEmail.trim(),
        password: newProfilePassword.trim(),
        avatar: newProfileAvatar.trim() || undefined,
      });
      setNewProfileName("");
      setNewProfileEmail("");
      setNewProfilePassword("");
      setNewProfileAvatar("");
      setShowAddForm(false);
      await loadProfiles();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create profile");
    }
  };

  const handleEditProfile = (profile: Profile, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProfileId(profile._id);
    setEditProfileName(profile.name);
    setEditProfileEmail(profile.email || "");
    setEditProfileBio(profile.bio || "");
    setEditProfileAvatar(profile.avatar || "");
  };

  const handleUpdateProfile = async (profileId: string, e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editProfileName.trim()) return;

    try {
      await profileAPI.update(profileId, {
        name: editProfileName.trim(),
        email: editProfileEmail.trim() || undefined,
        bio: editProfileBio.trim() || undefined,
        avatar: editProfileAvatar.trim() || undefined,
      });
      setEditingProfileId(null);
      await loadProfiles();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update profile");
    }
  };

  const handleDeleteProfile = async (
    profileId: string,
    profileName: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${profileName}"?`)) {
      return;
    }

    try {
      await profileAPI.delete(profileId);
      if (selectedProfileId === profileId) {
        setSelectedProfileId(null);
      }
      await loadProfiles();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete profile");
    }
  };

  const handleProfileClick = (profileId: string) => {
    setSelectedProfileId(profileId);
    if (onProfileSelect) {
      onProfileSelect(profileId);
    }
  };

  const selectedProfile = profiles.find((p) => p._id === selectedProfileId);

  return (
    <div className="profiles-container">
      <div className="profiles-header">
        <h2>Profiles</h2>
        <button
          className="add-button"
          onClick={() => setShowAddForm(!showAddForm)}
          title="Add profile"
        >
          +
        </button>
      </div>

      <div className="profiles-search">
        <input
          type="text"
          placeholder="Search profiles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {showAddForm && (
        <form className="add-form" onSubmit={handleCreateProfile}>
          <input
            type="text"
            placeholder="Profile name *"
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            required
            autoFocus
          />
          <input
            type="email"
            placeholder="Email *"
            value={newProfileEmail}
            onChange={(e) => setNewProfileEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password * (min 6 characters)"
            value={newProfilePassword}
            onChange={(e) => setNewProfilePassword(e.target.value)}
            required
            minLength={6}
          />
          <input
            type="url"
            placeholder="Avatar URL (optional)"
            value={newProfileAvatar}
            onChange={(e) => setNewProfileAvatar(e.target.value)}
          />
          <div className="form-actions">
            <button type="submit">Add</button>
            <button type="button" onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="profiles-loading">Loading...</div>
      ) : (
        <>
          {filteredProfiles.length === 0 && searchQuery ? (
            <div className="profiles-empty">
              No profiles match "{searchQuery}"
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="profiles-empty">
              No profiles yet. Create one to get started!
            </div>
          ) : (
            <div className="profiles-grid">
              {filteredProfiles.map((profile) => (
                <div
                  key={profile._id}
                  className={`profile-card ${
                    selectedProfileId === profile._id ? "active" : ""
                  }`}
                  onClick={() => handleProfileClick(profile._id)}
                >
                  {editingProfileId === profile._id ? (
                    <form
                      className="edit-form"
                      onSubmit={(e) => handleUpdateProfile(profile._id, e)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={editProfileName}
                        onChange={(e) => setEditProfileName(e.target.value)}
                        required
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                      <input
                        type="email"
                        value={editProfileEmail}
                        onChange={(e) => setEditProfileEmail(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <textarea
                        value={editProfileBio}
                        onChange={(e) => setEditProfileBio(e.target.value)}
                        rows={3}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <input
                        type="url"
                        value={editProfileAvatar}
                        onChange={(e) => setEditProfileAvatar(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="edit-form-actions">
                        <button type="submit" className="save-button">
                          Save
                        </button>
                        <button
                          type="button"
                          className="cancel-button"
                          onClick={() => setEditingProfileId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="profile-avatar">
                        {profile.avatar ? (
                          <img src={profile.avatar} alt={profile.name} />
                        ) : (
                          <div className="profile-avatar-placeholder">
                            {profile.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="profile-info">
                        <h3 className="profile-name">{profile.name}</h3>
                        {profile.email && (
                          <p className="profile-email">{profile.email}</p>
                        )}
                        {profile.bio && (
                          <p className="profile-bio">{profile.bio}</p>
                        )}
                        <div className="profile-stats">
                          <div className="stat">
                            <span className="stat-label">Total XP</span>
                            <span className="stat-value">
                              {profile.totalXP || 0}
                            </span>
                          </div>
                          <div className="stat">
                            <span className="stat-label">Level</span>
                            <span className="stat-value">
                              {profile.totalLevel || 1}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="profile-actions">
                        <button
                          className="edit-button"
                          onClick={(e) => handleEditProfile(profile, e)}
                          title="Edit profile"
                        >
                          ✎
                        </button>
                        <button
                          className="delete-button"
                          onClick={(e) =>
                            handleDeleteProfile(profile._id, profile.name, e)
                          }
                          title="Delete profile"
                        >
                          ×
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {selectedProfile && (
            <div className="profile-detail">
              <h3>Profile Details</h3>
              <div className="profile-detail-content">
                <div className="detail-row">
                  <strong>Name:</strong> {selectedProfile.name}
                </div>
                {selectedProfile.email && (
                  <div className="detail-row">
                    <strong>Email:</strong> {selectedProfile.email}
                  </div>
                )}
                {selectedProfile.bio && (
                  <div className="detail-row">
                    <strong>Bio:</strong> {selectedProfile.bio}
                  </div>
                )}
                <div className="detail-row">
                  <strong>Total XP:</strong> {selectedProfile.totalXP || 0}
                </div>
                <div className="detail-row">
                  <strong>Total Level:</strong> {selectedProfile.totalLevel || 1}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

