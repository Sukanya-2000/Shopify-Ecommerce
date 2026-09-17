const express = require("express");
const jwt = require("jsonwebtoken");
const jsonStore = require("../data/jsonStore");
const {
  googleClientId,
  googleRedirectUri,
  jwtSecret,
  microsoftClientId,
  microsoftRedirectUri
} = require("../config/env");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();
const providers = new Set(["google", "microsoft"]);

function authUrl(provider) {
  if (provider === "google") {
    if (!googleClientId) return null;
    const params = new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: googleRedirectUri,
      response_type: "code",
      scope: "openid email profile",
      prompt: "select_account"
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  if (!microsoftClientId) return null;
  const params = new URLSearchParams({
    client_id: microsoftClientId,
    redirect_uri: microsoftRedirectUri,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account"
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

router.get(
  "/:provider/start",
  asyncHandler(async (req, res) => {
    const provider = String(req.params.provider || "").toLowerCase();
    if (!providers.has(provider)) {
      res.status(400);
      throw new Error("Unsupported sign-in provider");
    }

    const url = authUrl(provider);
    if (!url) {
      res.status(501);
      throw new Error(`Set ${provider.toUpperCase()}_CLIENT_ID to enable real ${provider} OAuth redirects.`);
    }

    res.redirect(url);
  })
);

router.post(
  "/:provider",
  asyncHandler(async (req, res) => {
    const provider = String(req.params.provider || "").toLowerCase();
    if (!providers.has(provider)) {
      res.status(400);
      throw new Error("Unsupported sign-in provider");
    }

    const user = await jsonStore.findOrCreateSocialUser(provider, req.body);
    const token = jwt.sign({ id: user._id, role: user.role }, jwtSecret, { expiresIn: "7d" });

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  })
);

module.exports = router;
