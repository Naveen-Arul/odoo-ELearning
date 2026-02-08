/**
 * SkillForge AI - Passport Configuration
 * OAuth strategies for Google and GitHub
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:5000/api/v1/auth/google/callback',
    scope: ['profile', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
      let user = await User.findOne({ googleId: profile.id });

      if (user) {
        // Update last login
        user.lastLogin = new Date();
        await user.save();
        return done(null, user);
      }

      // Check if email already exists with different auth method
      const existingUser = await User.findOne({ email: profile.emails[0].value });
      if (existingUser) {
        // Link Google account to existing user
        existingUser.googleId = profile.id;
        existingUser.lastLogin = new Date();
        if (!existingUser.avatar && profile.photos[0]) {
          existingUser.avatar = profile.photos[0].value;
        }
        await existingUser.save();
        return done(null, existingUser);
      }

      // Create new user
      user = await User.create({
        name: profile.displayName,
        email: profile.emails[0].value,
        googleId: profile.id,
        authProvider: 'google',
        avatar: profile.photos[0]?.value || '',
        isEmailVerified: true,
        lastLogin: new Date()
      });

      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }));
}

// GitHub OAuth Strategy
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: '/api/v1/auth/github/callback',
    scope: ['user:email', 'read:user']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
      let user = await User.findOne({ githubId: profile.id });

      if (user) {
        // Update last login and store GitHub username
        user.lastLogin = new Date();
        user.careerData = user.careerData || {};
        user.careerData.githubUsername = profile.username;
        await user.save();
        return done(null, user);
      }

      // Get primary email from GitHub
      const email = profile.emails && profile.emails[0]
        ? profile.emails[0].value
        : `${profile.username}@github.local`;

      // Check if email already exists with different auth method
      const existingUser = await User.findOne({ email: email });
      if (existingUser) {
        // Link GitHub account to existing user
        existingUser.githubId = profile.id;
        existingUser.lastLogin = new Date();
        existingUser.careerData = existingUser.careerData || {};
        existingUser.careerData.githubUsername = profile.username;
        if (!existingUser.avatar && profile.photos[0]) {
          existingUser.avatar = profile.photos[0].value;
        }
        await existingUser.save();
        return done(null, existingUser);
      }

      // Create new user
      user = await User.create({
        name: profile.displayName || profile.username,
        email: email,
        githubId: profile.id,
        authProvider: 'github',
        avatar: profile.photos[0]?.value || '',
        isEmailVerified: email.includes('@github.local') ? false : true,
        lastLogin: new Date(),
        careerData: {
          githubUsername: profile.username
        }
      });

      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }));
}

module.exports = passport;
