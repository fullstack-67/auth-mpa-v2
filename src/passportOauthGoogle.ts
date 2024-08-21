import Debug from "debug";
import {
  Strategy as OAuthStrategy,
  type VerifyCallback,
} from "passport-oauth2";
import axios from "axios";
import { GoogleUserInfo } from "@src/types/google.js";
import { google as gg } from "./utils/env.js";
import { type UserData } from "@db/schema.js";
import { handleUserData } from "@db/repositories.js";

export const debug = Debug("fs-auth:google");
export const google = new OAuthStrategy(
  {
    authorizationURL: gg.googleAuthorizationURL,
    tokenURL: gg.googleTokenURL,
    clientID: gg.googleClientID,
    clientSecret: gg.googleClientSecret,
    callbackURL: gg.googleCallbackURL,
    scope:
      "openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
    passReqToCallback: false,
  },
  async function (
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback
  ) {
    debug("@verify function");
    const resUser = await axios.request<GoogleUserInfo>({
      method: "GET",
      url: "https://www.googleapis.com/oauth2/v2/userinfo",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const uRes = resUser.data;
    if (!uRes?.email) done(new Error("Cannot find email"), false);

    const uData: UserData = {
      email: uRes?.email ?? "",
      providerAccountId: uRes.id ?? "",
      provider: "GOOGLE",
      avatarURL: uRes.picture,
      name: uRes.name,
      accessToken: accessToken ?? "",
      refreshToken: refreshToken ?? "",
      userId: "", // Just have to be string
      profile: uRes,
    };
    //
    try {
      const user = await handleUserData(uData);
      done(null, user);
    } catch (err) {
      done(err, false);
    }
  }
);
