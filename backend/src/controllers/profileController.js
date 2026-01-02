import Profile from "../models/Profile.js";

// Get all profiles
export const getProfiles = async (req, res) => {
  try {
    const profiles = await Profile.find().select("-password").sort({ name: 1 });
    
    // Calculate total XP and level for each profile
    const profilesWithStats = await Promise.all(
      profiles.map(async (profile) => {
        const totalXP = await profile.calculateTotalXP();
        const totalLevel = await profile.calculateTotalLevel();
        const profileObj = profile.toObject();
        delete profileObj.password;
        return {
          ...profileObj,
          totalXP,
          totalLevel,
        };
      })
    );
    
    res.json(profilesWithStats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single profile by ID
export const getProfile = async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id).select("-password");

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    // Calculate total XP and level
    const totalXP = await profile.calculateTotalXP();
    const totalLevel = await profile.calculateTotalLevel();

    const profileObj = profile.toObject();
    delete profileObj.password;

    const profileWithStats = {
      ...profileObj,
      totalXP,
      totalLevel,
    };

    res.json(profileWithStats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create profile (now requires password - use /auth/register instead)
export const createProfile = async (req, res) => {
  try {
    const { name, email, password, bio, avatar } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    if (!password) {
      return res.status(400).json({ error: "Password is required. Use /auth/register to create a profile." });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const profile = new Profile({ name, email, password, bio, avatar });
    await profile.save();

    // Calculate stats for response
    const totalXP = await profile.calculateTotalXP();
    const totalLevel = await profile.calculateTotalLevel();

    // Remove password from response
    const profileObj = profile.toObject();
    delete profileObj.password;

    const profileWithStats = {
      ...profileObj,
      totalXP,
      totalLevel,
    };

    res.status(201).json(profileWithStats);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update profile
export const updateProfile = async (req, res) => {
  try {
    const { name, email, bio, avatar } = req.body;
    const profile = await Profile.findByIdAndUpdate(
      req.params.id,
      { name, email, bio, avatar },
      { new: true, runValidators: true }
    ).select("-password");

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    // Calculate stats for response
    const totalXP = await profile.calculateTotalXP();
    const totalLevel = await profile.calculateTotalLevel();

    const profileObj = profile.toObject();
    delete profileObj.password;

    const profileWithStats = {
      ...profileObj,
      totalXP,
      totalLevel,
    };

    res.json(profileWithStats);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete profile
export const deleteProfile = async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id);

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    await profile.deleteOne();
    res.json({ message: "Profile deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
