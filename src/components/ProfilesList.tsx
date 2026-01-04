import { useState, useEffect } from "react";
import { authAPI, setCurrentUser, profileAPI } from "../services/api";
import type { Profile } from "../types";
import { Spinner } from "./Spinner";

export function ProfilesList() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editProfileName, setEditProfileName] = useState("");
  const [editProfileEmail, setEditProfileEmail] = useState("");
  const [editProfileBio, setEditProfileBio] = useState("");
  const [editProfileAvatar, setEditProfileAvatar] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await authAPI.getCurrentUser();
      setProfile(data);
      setCurrentUser(data);
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    if (!profile) return;
    setEditing(true);
    setEditProfileName(profile.name);
    setEditProfileEmail(profile.email || "");
    setEditProfileBio(profile.bio || "");
    setEditProfileAvatar(profile.avatar || "");
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !editProfileName.trim()) return;

    try {
      const updatedProfile = await profileAPI.update(profile._id, {
        name: editProfileName.trim(),
        email: editProfileEmail.trim() || undefined,
        bio: editProfileBio.trim() || undefined,
        avatar: editProfileAvatar.trim() || undefined,
      });
      setProfile(updatedProfile);
      setCurrentUser(updatedProfile);
      setEditing(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update profile");
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="profiles-container">
        <div className="profiles-loading">
          <Spinner size="md" />
          <span>Loading profile...</span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profiles-container">
        <div className="profiles-empty">Profile not found</div>
      </div>
    );
  }

  return (
    <div className="profiles-container">
      <div className="profiles-header">
        <h2>My Profile</h2>
        {!editing && (
          <button
            className="edit-button"
            onClick={handleEditProfile}
            title="Edit profile"
          >
            ✎
          </button>
        )}
      </div>

      {editing ? (
        <div className="profile-card">
          <form className="edit-form" onSubmit={handleUpdateProfile}>
            <div className="auth-field">
              <label htmlFor="edit-name">Username *</label>
              <input
                id="edit-name"
                type="text"
                value={editProfileName}
                onChange={(e) => setEditProfileName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="auth-field">
              <label htmlFor="edit-email">Email *</label>
              <input
                id="edit-email"
                type="email"
                value={editProfileEmail}
                onChange={(e) => setEditProfileEmail(e.target.value)}
                required
              />
            </div>
            <div className="auth-field">
              <label htmlFor="edit-bio">Bio</label>
              <textarea
                id="edit-bio"
                value={editProfileBio}
                onChange={(e) => setEditProfileBio(e.target.value)}
                rows={3}
                placeholder="Tell us about yourself (optional)"
              />
            </div>
            <div className="auth-field">
              <label htmlFor="edit-avatar">Avatar URL</label>
              <input
                id="edit-avatar"
                type="url"
                value={editProfileAvatar}
                onChange={(e) => setEditProfileAvatar(e.target.value)}
                placeholder="Enter avatar image URL (optional)"
              />
            </div>
            <div className="edit-form-actions">
              <button type="submit" className="save-button">
                Save
              </button>
              <button
                type="button"
                className="cancel-button"
                onClick={handleCancelEdit}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="profile-card">
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
            {profile.email && <p className="profile-email">{profile.email}</p>}
            {profile.bio && <p className="profile-bio">{profile.bio}</p>}
            <div className="profile-stats">
              <div className="stat">
                <span className="stat-label">Total XP</span>
                <span className="stat-value">{profile.totalXP || 0}</span>
              </div>
              <div className="stat">
                <span className="stat-label">LV</span>
                <span className="stat-value">{profile.totalLevel || 1}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {!editing && (
        <div className="profile-detail">
          <h3>Profile Details</h3>
          <div className="profile-detail-content">
            <div className="detail-row">
              <strong>Username:</strong> {profile.name}
            </div>
            {profile.email && (
              <div className="detail-row">
                <strong>Email:</strong> {profile.email}
              </div>
            )}
            {profile.bio && (
              <div className="detail-row">
                <strong>Bio:</strong> {profile.bio}
              </div>
            )}
            <div className="detail-row">
              <strong>Total XP:</strong> {profile.totalXP || 0}
            </div>
            <div className="detail-row">
              <strong>Total LV:</strong> {profile.totalLevel || 1}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
