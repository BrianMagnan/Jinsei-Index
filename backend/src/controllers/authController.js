import Profile from "../models/Profile.js";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// Generate JWT token
const generateToken = (profileId) => {
  return jwt.sign({ profileId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

// Register a new profile
export const register = async (req, res) => {
  try {
    const { name, email, password, avatar } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Name, email, and password are required" });
    }

    // Check if password meets minimum length
    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    // Check if profile with same email already exists
    const existingProfile = await Profile.findOne({
      email: email.toLowerCase(),
    });
    if (existingProfile) {
      return res
        .status(400)
        .json({ error: "Profile with this email already exists" });
    }

    // Create new profile
    const profile = new Profile({
      name,
      email: email.toLowerCase(),
      password,
      avatar: avatar || "",
    });

    await profile.save();

    // Generate token
    const token = generateToken(profile._id);

    // Return profile without password
    const profileResponse = {
      _id: profile._id,
      name: profile.name,
      email: profile.email,
      bio: profile.bio,
      avatar: profile.avatar,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };

    res.status(201).json({
      message: "Profile created successfully",
      token,
      profile: profileResponse,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Login
export const login = async (req, res) => {
  try {
    const { email, name, password } = req.body;

    // Validate required fields
    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    if (!email && !name) {
      return res.status(400).json({ error: "Email or name is required" });
    }

    // Find profile by email or name and include password field
    let profile;
    if (email) {
      profile = await Profile.findOne({ email: email.toLowerCase() }).select(
        "+password"
      );
    } else {
      profile = await Profile.findOne({ name: name.trim() }).select(
        "+password"
      );
    }

    if (!profile) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check password
    const isPasswordValid = await profile.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate token
    const token = generateToken(profile._id);

    // Calculate stats
    const totalXP = await profile.calculateTotalXP();
    const totalLevel = await profile.calculateTotalLevel();

    // Return profile without password
    const profileResponse = {
      _id: profile._id,
      name: profile.name,
      email: profile.email,
      bio: profile.bio,
      avatar: profile.avatar,
      totalXP,
      totalLevel,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };

    res.json({
      message: "Login successful",
      token,
      profile: profileResponse,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get current user profile (protected route)
export const getCurrentProfile = async (req, res) => {
  try {
    const profile = await Profile.findById(req.profileId);

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    // Calculate stats
    const totalXP = await profile.calculateTotalXP();
    const totalLevel = await profile.calculateTotalLevel();

    const profileResponse = {
      _id: profile._id,
      name: profile.name,
      email: profile.email,
      bio: profile.bio,
      avatar: profile.avatar,
      totalXP,
      totalLevel,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };

    res.json(profileResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
