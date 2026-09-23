import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import type { User as PrismaUser } from "@prisma/client";
import { env } from "../config/env.config";
import * as authRepository from "../repository/auth.repository";

declare global {
  namespace Express {
    interface User extends PrismaUser {}
  }
}

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: env.GOOGLE_CALLBACK_URL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error("Google account has no email address"));
        }

        let user = await authRepository.findByEmail(email);

        if (!user) {
          user = await authRepository.createUser({
            googleId: profile.id,
            name: profile.displayName,
            email,
            avatar: profile.photos?.[0]?.value,
            password: null,
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err as Error);
      }
    },
  ),
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await authRepository.findById(id);
    done(null, user ?? false);
  } catch (err) {
    done(err);
  }
});

export default passport;