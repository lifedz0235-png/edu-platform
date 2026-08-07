import "dotenv/config";

import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import multer from "multer";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const app = express();

// Nginx est l'unique proxy devant Express.
app.set("trust proxy", 1);

const PASSWORD_SALT_ROUNDS = 12;

const JWT_SECRET = String(
  process.env.JWT_SECRET || ""
).trim();

const JWT_EXPIRES_IN = String(
  process.env.JWT_EXPIRES_IN || "12h"
).trim();

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error(
    "ERREUR SÉCURITÉ : JWT_SECRET absent ou trop court."
  );

  console.error(
    "Ajoutez JWT_SECRET dans le fichier .env avec au moins 32 caractères."
  );

  process.exit(1);
}

/**
 * Vérifie si la valeur enregistrée est déjà un hash bcrypt.
 */
function isBcryptHash(value) {
  return (
    typeof value === "string" &&
    /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value)
  );
}

/**
 * Génère un hash bcrypt sécurisé.
 */
async function hashUserPassword(password) {
  const cleanPassword = String(password || "");

  if (!cleanPassword) {
    throw new Error("Mot de passe vide.");
  }

  return bcrypt.hash(
    cleanPassword,
    PASSWORD_SALT_ROUNDS
  );
}

/**
 * Vérifie un mot de passe.
 *
 * Supporte temporairement :
 * - les nouveaux mots de passe bcrypt ;
 * - les anciens mots de passe enregistrés en clair.
 */
async function verifyUserPassword(
  enteredPassword,
  storedPassword
) {
  const entered = String(enteredPassword || "");
  const stored = String(storedPassword || "");

  if (!entered || !stored) {
    return false;
  }

  if (isBcryptHash(stored)) {
    return bcrypt.compare(entered, stored);
  }

  return entered === stored;
}

/**
 * Supprime les données sensibles avant d'envoyer un utilisateur au frontend.
 */
function sanitizeUser(user) {
  if (!user || typeof user !== "object") {
    return user;
  }

  const {
    password,
    passwordHash,
    resetPasswordTokenHash,
    resetPasswordExpiresAt,
    resetPasswordRequestedAt,
    ...safeUser
  } = user;

  return safeUser;
}

/**
 * Crée un token d'accès signé pour un utilisateur.
 */
function createAccessToken(user, deviceId) {
  return jwt.sign(
    {
      sub: String(user.id),
      role: String(user.role || "student"),
      deviceId: String(deviceId || ""),
      tokenVersion: Number(user.tokenVersion || 0)
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
      issuer: "pcr-learning",
      audience: "pcr-platform"
    }
  );
}

/**
 * Récupère le Bearer Token depuis Authorization.
 */
function getBearerToken(req) {
  const authorization = String(
    req.headers.authorization || ""
  ).trim();

  if (!authorization.startsWith("Bearer ")) {
    return "";
  }

  return authorization.slice(7).trim();
}

/**
 * Vérifie le token et authentifie l'utilisateur.
 */
function requireAuth(req, res, next) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({
        error: "Authentification requise."
      });
    }

    const payload = jwt.verify(
      token,
      JWT_SECRET,
      {
        issuer: "pcr-learning",
        audience: "pcr-platform"
      }
    );

    const users = readUsers();

    const user = users.find(
      item =>
        String(item.id) ===
        String(payload.sub)
    );

    if (!user) {
      return res.status(401).json({
        error: "Session invalide."
      });
    }

    if (user.status !== "approved") {
      return res.status(403).json({
        error:
          user.status === "suspended"
            ? "Votre compte est suspendu."
            : "Votre compte n'est pas encore activé."
      });
    }

    const currentTokenVersion =
      Number(user.tokenVersion || 0);

    if (
      Number(payload.tokenVersion || 0) !==
      currentTokenVersion
    ) {
      return res.status(401).json({
        error:
          "Votre session a été révoquée. Veuillez vous reconnecter."
      });
    }

    if (
      user.activeDeviceId &&
      String(user.activeDeviceId) !==
        String(payload.deviceId || "")
    ) {
      return res.status(401).json({
        error:
          "Cette session n'est plus active sur cet appareil."
      });
    }

    req.auth = {
      userId: user.id,
      role: user.role || "student",
      deviceId: payload.deviceId || "",
      user
    };

    next();

  } catch (error) {
    if (error?.name === "TokenExpiredError") {
      return res.status(401).json({
        error:
          "Votre session a expiré. Veuillez vous reconnecter."
      });
    }

    return res.status(401).json({
      error: "Session invalide."
    });
  }
}

/**
 * Autorise uniquement les administrateurs.
 */
function requireAdmin(req, res, next) {
  if (
    String(req.auth?.role || "").toLowerCase() !==
    "admin"
  ) {
    return res.status(403).json({
      error: "Accès administrateur requis."
    });
  }

  next();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const requiredDirectories = [
  path.join(__dirname, "public", "data"),
  path.join(__dirname, "public", "uploads"),
  path.join(__dirname, "public", "uploads", "community"),
  path.join(__dirname, "public", "uploads", "profiles")
];

requiredDirectories.forEach(directory => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, {
      recursive: true
    });
  }
});

app.disable("x-powered-by");

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin"
    },

    contentSecurityPolicy: false
  })
);

const allowedOrigins = String(
  process.env.ALLOWED_ORIGINS ||
  "http://localhost:3000,http://127.0.0.1:3000,https://pcrdz.com,https://www.pcrdz.com"
)
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      /*
        Les requêtes sans Origin :
        curl, application mobile, serveur interne.
      */
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error("Origine non autorisée par CORS.")
      );
    },

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS"
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization"
    ]
  })
);

app.use(
  express.json({
    limit: "100kb",
    strict: true
  })
);

app.use(
  express.urlencoded({
    extended: false,
    limit: "100kb"
  })
);
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "PCR Platform",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString()
  });
});
app.use(express.static(path.join(__dirname, "public")));

const communityDataPath = path.join(process.cwd(), "public/data/community-posts.json");
const notificationsDataPath = path.join(process.cwd(), "public/data/community-notifications.json");
const communityReportsDataPath = path.join(process.cwd(), "public/data/community-reports.json");
const communityBlocksDataPath = path.join(process.cwd(), "public/data/community-blocks.json");

const communityStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/community");
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname.replace(/\s+/g, "-");
    cb(null, uniqueName);
  }
});

const uploadCommunity = multer({
  storage: communityStorage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error("Format d’image non autorisé.")
      );
    }

    cb(null, true);
  }
});

const profileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/profiles");
  },

  filename: function (req, file, cb) {
    const extension = path.extname(file.originalname).toLowerCase();

    const safeExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".webp"
    ];

    const finalExtension = safeExtensions.includes(extension)
      ? extension
      : ".jpg";

    cb(
      null,
      `profile-${Date.now()}${finalExtension}`
    );
  }
});

const uploadProfile = multer({
  storage: profileStorage,

  limits: {
    fileSize: 5 * 1024 * 1024
  },

  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error("Format de photo non autorisé.")
      );
    }

    cb(null, true);
  }
});

function readCommunityPosts() {
  try {
    if (!fs.existsSync(communityDataPath)) {
      fs.writeFileSync(communityDataPath, "[]", "utf-8");
      return [];
    }

    const content = fs
      .readFileSync(communityDataPath, "utf-8")
      .trim();

    if (!content) {
      return [];
    }

    const posts = JSON.parse(content);

    return Array.isArray(posts) ? posts : [];
  } catch (error) {
    console.error(
      "Erreur lecture community-posts.json:",
      error
    );

    return [];
  }
}

function saveCommunityPosts(posts) {
  const temporaryPath = `${communityDataPath}.tmp`;

  fs.writeFileSync(
    temporaryPath,
    JSON.stringify(posts, null, 2),
    "utf-8"
  );

  fs.renameSync(
    temporaryPath,
    communityDataPath
  );
}

function getRequestUser(userId) {
  const users = readUsers();

  return users.find(
    user => String(user.id) === String(userId)
  );
}


function readJsonArrayFile(filePath, label) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, "[]", "utf-8");
      return [];
    }

    const content = fs.readFileSync(filePath, "utf-8").trim();
    if (!content) return [];

    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(`Erreur lecture ${label}:`, error);
    return [];
  }
}

function saveJsonArrayFile(filePath, data) {
  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(
    temporaryPath,
    JSON.stringify(data, null, 2),
    "utf-8"
  );
  fs.renameSync(temporaryPath, filePath);
}

function readCommunityReports() {
  return readJsonArrayFile(
    communityReportsDataPath,
    "community-reports.json"
  );
}

function saveCommunityReports(reports) {
  saveJsonArrayFile(communityReportsDataPath, reports);
}

function readCommunityBlocks() {
  return readJsonArrayFile(
    communityBlocksDataPath,
    "community-blocks.json"
  );
}

function saveCommunityBlocks(blocks) {
  saveJsonArrayFile(communityBlocksDataPath, blocks);
}

function isAdminUser(user) {
  return String(user?.role || "").toLowerCase() === "admin";
}

function isApprovedCommunityUser(user) {
  if (!user) return false;
  if (isAdminUser(user)) return true;

  return String(user.status || "").toLowerCase() === "approved";
}

function hasAcceptedCommunityRules(user) {
  return Boolean(user?.communityRulesAcceptedAt) || isAdminUser(user);
}

function isBlockedBetween(firstUserId, secondUserId) {
  if (
    firstUserId === undefined ||
    firstUserId === null ||
    secondUserId === undefined ||
    secondUserId === null
  ) {
    return false;
  }

  const first = String(firstUserId);
  const second = String(secondUserId);

  return readCommunityBlocks().some(block => {
    const blocker = String(block.blockerId);
    const blocked = String(block.blockedUserId);

    return (
      (blocker === first && blocked === second) ||
      (blocker === second && blocked === first)
    );
  });
}

function getCommunityTarget({ posts, targetType, postId, commentId, targetUserId }) {
  const post = posts.find(
    item => String(item.id) === String(postId)
  );

  if (targetType === "post") {
    if (!post) return null;

    return {
      post,
      comment: null,
      targetUserId: resolvePostAuthorId(post),
      snapshot: {
        text: String(post.text || "").slice(0, 1000),
        imageUrl: post.imageUrl || "",
        authorName: post.authorName || "Utilisateur PCR"
      }
    };
  }

  if (targetType === "comment") {
    if (!post) return null;

    const comment = (post.comments || []).find(
      item => String(item.id) === String(commentId)
    );

    if (!comment) return null;

    return {
      post,
      comment,
      targetUserId: comment.authorId,
      snapshot: {
        text: String(comment.text || "").slice(0, 1000),
        imageUrl: "",
        authorName: comment.authorName || "Utilisateur PCR"
      }
    };
  }

  if (targetType === "user") {
    const targetUser = getRequestUser(targetUserId);
    if (!targetUser) return null;

    return {
      post: null,
      comment: null,
      targetUserId: targetUser.id,
      snapshot: {
        text: "Profil utilisateur signalé",
        imageUrl: targetUser.photoUrl || "",
        authorName: targetUser.name || "Utilisateur PCR"
      }
    };
  }

  return null;
}

function deleteReportedContent(report, posts) {
  if (report.targetType === "post") {
    const postIndex = posts.findIndex(
      item => String(item.id) === String(report.postId)
    );

    if (postIndex === -1) return false;

    deleteCommunityImage(posts[postIndex].imageUrl);
    posts.splice(postIndex, 1);
    return true;
  }

  if (report.targetType === "comment") {
    const post = posts.find(
      item => String(item.id) === String(report.postId)
    );

    if (!post) return false;

    const before = (post.comments || []).length;
    post.comments = (post.comments || []).filter(
      item => String(item.id) !== String(report.commentId)
    );

    return post.comments.length !== before;
  }

  return false;
}

function canManageContent(requestUser, authorId) {
  if (!requestUser) return false;

  const role = String(requestUser.role || "").toLowerCase();

  if (role === "admin") {
    return true;
  }

  return String(requestUser.id) === String(authorId);
}

function deleteCommunityImage(imageUrl) {
  if (!imageUrl) return;

  if (!imageUrl.startsWith("/uploads/community/")) {
    return;
  }

  const relativePath = imageUrl.replace(/^\/+/, "");

  const absolutePath = path.join(
    process.cwd(),
    "public",
    relativePath.replace(/^public\//, "")
  );

  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
}


function readNotifications() {
  try {
    if (!fs.existsSync(notificationsDataPath)) {
      fs.writeFileSync(
        notificationsDataPath,
        "[]",
        "utf-8"
      );

      return [];
    }

    const content = fs
      .readFileSync(notificationsDataPath, "utf-8")
      .trim();

    if (!content) {
      return [];
    }

    const notifications = JSON.parse(content);

    return Array.isArray(notifications)
      ? notifications
      : [];

  } catch (error) {
    console.error(
      "Erreur lecture notifications:",
      error
    );

    return [];
  }
}

function saveNotifications(notifications) {
  const temporaryPath =
    `${notificationsDataPath}.tmp`;

  fs.writeFileSync(
    temporaryPath,
    JSON.stringify(notifications, null, 2),
    "utf-8"
  );

  fs.renameSync(
    temporaryPath,
    notificationsDataPath
  );
}
function createNotification({
  recipientId,
  actorId,
  actorName,
  type,
  text,
  postId
}) {
  if (recipientId === undefined || recipientId === null || recipientId === "") {
    console.log("Notification ignorée : recipientId absent", {
      type,
      postId,
      actorId
    });
    return;
  }

  if (String(recipientId) === String(actorId)) {
    return;
  }

  const notifications = readNotifications();

  notifications.unshift({
    id: Date.now(),
    recipientId: String(recipientId),
    actorId: String(actorId),
    actorName: actorName || "Utilisateur PCR",
    type,
    text,
    postId,
    read: false,
    createdAt: new Date().toISOString()
  });

  saveNotifications(notifications);
}

app.delete(
  "/api/community/posts/:postId",
  requireAuth,
  (req, res) => {
  const posts = readCommunityPosts();

  const postIndex = posts.findIndex(
    post => String(post.id) === String(req.params.postId)
  );

  if (postIndex === -1) {
    return res.status(404).json({
      error: "Publication introuvable."
    });
  }

  const post = posts[postIndex];

  const requestUser = req.auth.user;

  if (!requestUser) {
    return res.status(401).json({
      error: "Utilisateur non authentifié."
    });
  }

  if (!canManageContent(requestUser, post.authorId)) {
    return res.status(403).json({
      error: "Vous ne pouvez pas supprimer cette publication."
    });
  }

  deleteCommunityImage(post.imageUrl);

  posts.splice(postIndex, 1);

  saveCommunityPosts(posts);

  res.json({
    ok: true,
    message: "Publication supprimée."
  });
});

function resolvePostAuthorId(post) {
  if (post.authorId !== undefined && post.authorId !== null && post.authorId !== "") {
    return post.authorId;
  }

  const users = readUsers();

  const matchedUser = users.find(user =>
    String(user.name || "").trim().toLowerCase() ===
    String(post.authorName || "").trim().toLowerCase()
  );

  return matchedUser ? matchedUser.id : null;
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/community/posts", (req, res) => {
  const posts = readCommunityPosts();
  const users = readUsers();
  const viewerId = req.query.userId;

  function getPublicUser(authorId, authorName) {
    let user = null;

    if (
      authorId !== undefined &&
      authorId !== null &&
      authorId !== ""
    ) {
      user = users.find(
        item => String(item.id) === String(authorId)
      );
    }

    if (!user && authorName) {
      user = users.find(
        item =>
          String(item.name || "").trim().toLowerCase() ===
          String(authorName || "").trim().toLowerCase()
      );
    }

    if (!user) {
      return {
        id: authorId || null,
        name: authorName || "Étudiant PCR",
        role: "student",
        photoUrl: "",
        bio: "",
        university: "",
        promotion: ""
      };
    }

    return {
      id: user.id,
      name: user.name || "Étudiant PCR",
      role: user.role || "student",
      photoUrl: user.photoUrl || "",
      bio: user.bio || "",
      university: user.university || "",
      promotion: user.promotion || ""
    };
  }

  const visiblePosts = viewerId
    ? posts.filter(post => {
        const authorId = resolvePostAuthorId(post);
        return !isBlockedBetween(viewerId, authorId);
      })
    : posts;

  const enrichedPosts = visiblePosts.map(post => {
    const author = getPublicUser(
      post.authorId,
      post.authorName
    );

    const visibleComments = (post.comments || []).filter(
      comment =>
        !viewerId ||
        !isBlockedBetween(viewerId, comment.authorId)
    );

    const enrichedComments = visibleComments.map(comment => {
      const commentAuthor = getPublicUser(
        comment.authorId,
        comment.authorName
      );

      return {
        ...comment,
        authorId: comment.authorId || commentAuthor.id,
        authorName: commentAuthor.name,
        authorRole: commentAuthor.role,
        authorPhotoUrl: commentAuthor.photoUrl,
        authorUniversity: commentAuthor.university,
        authorPromotion: commentAuthor.promotion
      };
    });

    const replyTo =
      post.replyTo &&
      viewerId &&
      isBlockedBetween(viewerId, post.replyTo.authorId)
        ? null
        : post.replyTo;

    return {
      ...post,
      authorId: post.authorId || author.id,
      authorName: author.name,
      authorRole: author.role,
      authorPhotoUrl: author.photoUrl,
      authorBio: author.bio,
      authorUniversity: author.university,
      authorPromotion: author.promotion,
      replyTo,
      comments: enrichedComments
    };
  });

  res.json(enrichedPosts);
});

app.post(
  "/api/community/posts",
  requireAuth,
  uploadCommunity.single("image"),
  (req, res) => {
  const posts = readCommunityPosts();
const requestUser = req.auth.user;

  if (!requestUser || !isApprovedCommunityUser(requestUser)) {
    if (req.file) {
      deleteCommunityImage(`/uploads/community/${req.file.filename}`);
    }

    return res.status(401).json({
      error: "Compte utilisateur non autorisé."
    });
  }

  if (!hasAcceptedCommunityRules(requestUser)) {
    if (req.file) {
      deleteCommunityImage(`/uploads/community/${req.file.filename}`);
    }

    return res.status(403).json({
      error: "Vous devez accepter les règles de la communauté."
    });
  }

  if (
    req.body.replyToAuthorId &&
    isBlockedBetween(requestUser.id, req.body.replyToAuthorId)
  ) {
    if (req.file) {
      deleteCommunityImage(`/uploads/community/${req.file.filename}`);
    }

    return res.status(403).json({
      error: "Interaction impossible avec cet utilisateur."
    });
  }

  const newPost = {
  id: Date.now(),

  authorId: requestUser.id,

  authorName: requestUser.name || "Étudiant PCR",

  authorRole: requestUser.role || "student",

  text: String(req.body.text || "").trim().slice(0, 5000),

  imageUrl: req.file
    ? `/uploads/community/${req.file.filename}`
    : "",

  likes: 0,

  likedBy: [],

  comments: [],

  replyTo: req.body.replyToId
  ? {
      id: req.body.replyToId,
      text: req.body.replyToText || "",
      imageUrl: req.body.replyToImage || "",
      authorId: req.body.replyToAuthorId || null
    }
  : null,

  createdAt: new Date().toISOString()
};

  posts.unshift(newPost);
saveCommunityPosts(posts);

if (newPost.replyTo) {
  let recipientId = newPost.replyTo.authorId;

  // دعم المنشورات القديمة التي لا تحتوي على authorId
  if (!recipientId) {
    const originalPost = posts.find(
      post => String(post.id) === String(newPost.replyTo.id)
    );

    if (originalPost) {
      recipientId = resolvePostAuthorId(originalPost);
    }
  }

  createNotification({
    recipientId,
    actorId: newPost.authorId,
    actorName: newPost.authorName,
    type: "reply",
    text: `${newPost.authorName} a répondu à votre publication.`,
    postId: newPost.id
  });
}

res.json(newPost);
});

app.post(
  "/api/community/posts/:id/like",
  requireAuth,
  (req, res) => {
  const posts = readCommunityPosts();

  const post = posts.find(
    item => String(item.id) === String(req.params.id)
  );

  if (!post) {
    return res.status(404).json({
      error: "Publication introuvable"
    });
  }

  const requestUser = req.auth.user;

const userId = requestUser.id;

const userName =
  requestUser.name || "Utilisateur PCR";

  if (!requestUser || !isApprovedCommunityUser(requestUser)) {
    return res.status(401).json({
      error: "Utilisateur non autorisé"
    });
  }

  if (!hasAcceptedCommunityRules(requestUser)) {
    return res.status(403).json({
      error: "Règles de la communauté non acceptées."
    });
  }

  const postAuthorId = resolvePostAuthorId(post);
  if (isBlockedBetween(userId, postAuthorId)) {
    return res.status(403).json({
      error: "Interaction impossible avec cet utilisateur."
    });
  }

  if (!Array.isArray(post.likedBy)) {
    post.likedBy = [];
  }

  const alreadyLiked = post.likedBy.some(
    id => String(id) === String(userId)
  );

  if (alreadyLiked) {
    post.likedBy = post.likedBy.filter(
      id => String(id) !== String(userId)
    );
  } else {
    post.likedBy.push(userId);

    const recipientId = resolvePostAuthorId(post);

    if (!post.authorId && recipientId) {
      post.authorId = recipientId;
    }

    createNotification({
      recipientId,
      actorId: userId,
      actorName: userName,
      type: "like",
      text: `${userName} a aimé votre publication.`,
      postId: post.id
    });
  }

  post.likes = post.likedBy.length;

  saveCommunityPosts(posts);

  res.json(post);
});

app.post(
  "/api/community/posts/:id/comments",
  requireAuth,
  (req, res) => {
  const posts = readCommunityPosts();

  const post = posts.find(
    item => String(item.id) === String(req.params.id)
  );

  if (!post) {
    return res.status(404).json({
      error: "Publication introuvable"
    });
  }

  const text = req.body.text;

const requestUser = req.auth.user;

const authorId = requestUser.id;
const authorName = requestUser.name;
const authorRole = requestUser.role;

  if (!text || !text.trim()) {
    return res.status(400).json({
      error: "Commentaire vide"
    });
  }

  

  if (!requestUser || !isApprovedCommunityUser(requestUser)) {
    return res.status(401).json({
      error: "Utilisateur non autorisé"
    });
  }

  if (!hasAcceptedCommunityRules(requestUser)) {
    return res.status(403).json({
      error: "Règles de la communauté non acceptées."
    });
  }

  const postAuthorId = resolvePostAuthorId(post);
  if (isBlockedBetween(authorId, postAuthorId)) {
    return res.status(403).json({
      error: "Interaction impossible avec cet utilisateur."
    });
  }

  if (!Array.isArray(post.comments)) {
    post.comments = [];
  }

  const newComment = {
    id: Date.now(),
    authorId,
    authorName: requestUser.name || "Étudiant PCR",
    authorRole: requestUser.role || "student",
    text: text.trim().slice(0, 2000),
    likes: 0,
    likedBy: [],
    createdAt: new Date().toISOString()
  };

  post.comments.push(newComment);

  const recipientId = resolvePostAuthorId(post);

  if (!post.authorId && recipientId) {
    post.authorId = recipientId;
  }

  createNotification({
    recipientId,
    actorId: authorId,
    actorName: newComment.authorName,
    type: "comment",
    text: `${newComment.authorName} a commenté votre publication.`,
    postId: post.id
  });

  saveCommunityPosts(posts);

  res.json(post);
});

app.delete(
  "/api/community/posts/:postId/comments/:commentId",
  requireAuth,
  (req, res) => {
    const posts = readCommunityPosts();

    const post = posts.find(
      item =>
        String(item.id) ===
        String(req.params.postId)
    );

    if (!post) {
      return res.status(404).json({
        error: "Publication introuvable."
      });
    }

    const commentIndex =
      (post.comments || []).findIndex(
        item =>
          String(item.id) ===
          String(req.params.commentId)
      );

    if (commentIndex === -1) {
      return res.status(404).json({
        error: "Commentaire introuvable."
      });
    }

    const comment = post.comments[commentIndex];
    const requestUser = req.auth.user;

    if (
      !canManageContent(
        requestUser,
        comment.authorId
      )
    ) {
      return res.status(403).json({
        error:
          "Vous ne pouvez pas supprimer ce commentaire."
      });
    }

    post.comments.splice(commentIndex, 1);

    saveCommunityPosts(posts);

    return res.json({
      ok: true,
      message: "Commentaire supprimé."
    });
  }
);

app.post(
  "/api/community/posts/:postId/comments/:commentId/like",
  requireAuth,
  (req, res) => {
  const posts = readCommunityPosts();

  const post = posts.find(
    item => String(item.id) === String(req.params.postId)
  );

  if (!post) {
    return res.status(404).json({
      error: "Publication introuvable"
    });
  }

  const comment = (post.comments || []).find(
    item => String(item.id) === String(req.params.commentId)
  );

  if (!comment) {
    return res.status(404).json({
      error: "Commentaire introuvable"
    });
  }

  const requestUser = req.auth.user;
  if (!requestUser || !isApprovedCommunityUser(requestUser)) {
    return res.status(401).json({
      error: "Utilisateur non autorisé"
    });
  }

  if (!hasAcceptedCommunityRules(requestUser)) {
    return res.status(403).json({
      error: "Règles de la communauté non acceptées."
    });
  }

  if (isBlockedBetween(requestUser.id, comment.authorId)) {
    return res.status(403).json({
      error: "Interaction impossible avec cet utilisateur."
    });
  }

  if (!Array.isArray(comment.likedBy)) {
    comment.likedBy = [];
  }

  const alreadyLiked = comment.likedBy.some(
    id => String(id) === String(requestUser.id)
  );

  if (alreadyLiked) {
    comment.likedBy = comment.likedBy.filter(
      id => String(id) !== String(requestUser.id)
    );
  } else {
    comment.likedBy.push(requestUser.id);
  }

  comment.likes = comment.likedBy.length;
  saveCommunityPosts(posts);

  res.json(comment);
});

app.get("/api/community/notifications", (req, res) => {
  const userId = req.query.userId;

  if (!userId) {
    return res.status(400).json({
      error: "userId manquant"
    });
  }

  const notifications = readNotifications();

  const userNotifications = notifications.filter(
    notification =>
      String(notification.recipientId) === String(userId)
  );

  res.json(userNotifications);
});

app.post("/api/community/notifications/read", (req, res) => {
  const notifications = readNotifications();
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      error: "userId manquant"
    });
  }

  notifications.forEach(notification => {
    if (
      String(notification.recipientId) === String(userId)
    ) {
      notification.read = true;
    }
  });

  saveNotifications(notifications);

  res.json({ ok: true });
});




app.get("/api/community/moderation/status", (req, res) => {
  const user = getRequestUser(req.query.userId);

  if (!user) {
    return res.status(401).json({
      error: "Utilisateur non authentifié."
    });
  }

  const blocks = readCommunityBlocks().filter(
    block => String(block.blockerId) === String(user.id)
  );

  const users = readUsers();
  const blockedUsers = blocks.map(block => {
    const blockedUser = users.find(
      item => String(item.id) === String(block.blockedUserId)
    );

    return {
      id: block.blockedUserId,
      name: blockedUser?.name || "Utilisateur PCR",
      photoUrl: blockedUser?.photoUrl || "",
      blockedAt: block.createdAt
    };
  });

  res.json({
    rulesAccepted: hasAcceptedCommunityRules(user),
    rulesAcceptedAt: user.communityRulesAcceptedAt || null,
    blockedUsers
  });
});

app.post("/api/community/rules/accept", (req, res) => {
  const users = readUsers();
  const user = users.find(
    item => String(item.id) === String(req.body.userId)
  );

  if (!user || !isApprovedCommunityUser(user)) {
    return res.status(401).json({
      error: "Utilisateur non autorisé."
    });
  }

  user.communityRulesAcceptedAt =
    user.communityRulesAcceptedAt || new Date().toISOString();

  saveUsers(users);

  res.json({
    ok: true,
    user: sanitizeUser(user)
  });
});

app.post("/api/community/blocks", (req, res) => {
  const blocker = getRequestUser(req.body.userId);
  const blocked = getRequestUser(req.body.blockedUserId);

  if (!blocker || !blocked) {
    return res.status(404).json({
      error: "Utilisateur introuvable."
    });
  }

  if (String(blocker.id) === String(blocked.id)) {
    return res.status(400).json({
      error: "Vous ne pouvez pas vous bloquer vous-même."
    });
  }

  if (isAdminUser(blocked)) {
    return res.status(400).json({
      error: "Le compte administrateur ne peut pas être bloqué."
    });
  }

  const blocks = readCommunityBlocks();
  const exists = blocks.some(
    block =>
      String(block.blockerId) === String(blocker.id) &&
      String(block.blockedUserId) === String(blocked.id)
  );

  if (!exists) {
    blocks.unshift({
      id: crypto.randomUUID(),
      blockerId: blocker.id,
      blockedUserId: blocked.id,
      createdAt: new Date().toISOString()
    });

    saveCommunityBlocks(blocks);
  }

  res.json({
    ok: true,
    message: "Utilisateur bloqué."
  });
});

app.delete(
  "/api/community/blocks/:blockedUserId",
  requireAuth,
  (req, res) => {
  const blocker = req.auth.user;

  if (!blocker) {
    return res.status(401).json({
      error: "Utilisateur non authentifié."
    });
  }

  const blocks = readCommunityBlocks();
  const filtered = blocks.filter(
    block =>
      !(
        String(block.blockerId) === String(blocker.id) &&
        String(block.blockedUserId) === String(req.params.blockedUserId)
      )
  );

  saveCommunityBlocks(filtered);

  res.json({
    ok: true,
    message: "Utilisateur débloqué."
  });
});

app.post("/api/community/reports", (req, res) => {
  const reporter = getRequestUser(req.body.reporterId);

  if (!reporter || !isApprovedCommunityUser(reporter)) {
    return res.status(401).json({
      error: "Utilisateur non autorisé."
    });
  }

  if (!hasAcceptedCommunityRules(reporter)) {
    return res.status(403).json({
      error: "Règles de la communauté non acceptées."
    });
  }

  const allowedTypes = ["post", "comment", "user"];
  const allowedReasons = [
    "inappropriate",
    "harassment",
    "spam",
    "misinformation",
    "other"
  ];

  const targetType = String(req.body.targetType || "");
  const reason = String(req.body.reason || "");

  if (!allowedTypes.includes(targetType)) {
    return res.status(400).json({
      error: "Type de signalement invalide."
    });
  }

  if (!allowedReasons.includes(reason)) {
    return res.status(400).json({
      error: "Motif de signalement invalide."
    });
  }

  const posts = readCommunityPosts();
  const target = getCommunityTarget({
    posts,
    targetType,
    postId: req.body.postId,
    commentId: req.body.commentId,
    targetUserId: req.body.targetUserId
  });

  if (!target) {
    return res.status(404).json({
      error: "Contenu ou utilisateur introuvable."
    });
  }

  if (String(target.targetUserId) === String(reporter.id)) {
    return res.status(400).json({
      error: "Vous ne pouvez pas signaler votre propre contenu."
    });
  }

  const reports = readCommunityReports();
  const duplicate = reports.some(report =>
    String(report.reporterId) === String(reporter.id) &&
    String(report.targetType) === targetType &&
    String(report.postId || "") === String(req.body.postId || "") &&
    String(report.commentId || "") === String(req.body.commentId || "") &&
    ["open", "reviewing"].includes(report.status)
  );

  if (duplicate) {
    return res.status(409).json({
      error: "Vous avez déjà signalé ce contenu."
    });
  }

  const newReport = {
    id: crypto.randomUUID(),
    reporterId: reporter.id,
    reporterName: reporter.name || "Utilisateur PCR",
    targetType,
    postId: req.body.postId || null,
    commentId: req.body.commentId || null,
    targetUserId: target.targetUserId,
    reason,
    details: String(req.body.details || "").trim().slice(0, 1000),
    snapshot: target.snapshot,
    status: "open",
    createdAt: new Date().toISOString(),
    handledAt: null,
    handledBy: null,
    adminNote: "",
    action: "none"
  };

  reports.unshift(newReport);
  saveCommunityReports(reports);

  res.status(201).json({
    ok: true,
    report: newReport,
    message: "Signalement envoyé à la modération."
  });
});

app.get("/api/admin/community/reports", (req, res) => {
  const admin = getRequestUser(req.query.adminId);

  if (!isAdminUser(admin)) {
    return res.status(403).json({
      error: "Accès administrateur requis."
    });
  }

  const status = String(req.query.status || "all");
  const reports = readCommunityReports();

  const filtered = status === "all"
    ? reports
    : reports.filter(report => report.status === status);

  res.json(filtered);
});

app.patch("/api/admin/community/reports/:reportId", (req, res) => {
  const admin = getRequestUser(req.body.adminId);

  if (!isAdminUser(admin)) {
    return res.status(403).json({
      error: "Accès administrateur requis."
    });
  }

  const reports = readCommunityReports();
  const report = reports.find(
    item => String(item.id) === String(req.params.reportId)
  );

  if (!report) {
    return res.status(404).json({
      error: "Signalement introuvable."
    });
  }

  const allowedStatuses = [
    "open",
    "reviewing",
    "resolved",
    "dismissed"
  ];

  const allowedActions = [
    "none",
    "delete_content",
    "suspend_user"
  ];

  const status = String(req.body.status || report.status);
  const action = String(req.body.action || "none");

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      error: "Statut invalide."
    });
  }

  if (!allowedActions.includes(action)) {
    return res.status(400).json({
      error: "Action invalide."
    });
  }

  if (action === "delete_content") {
    const posts = readCommunityPosts();
    const deleted = deleteReportedContent(report, posts);

    if (deleted) {
      saveCommunityPosts(posts);
    }
  }

  if (action === "suspend_user") {
    const users = readUsers();
    const targetUser = users.find(
      item => String(item.id) === String(report.targetUserId)
    );

    if (targetUser && !isAdminUser(targetUser)) {
      targetUser.status = "suspended";
      targetUser.activeDeviceId = null;
      targetUser.suspendedAt = new Date().toISOString();
      targetUser.suspendedReason =
        "Suspension après signalement communautaire";
      saveUsers(users);
    }
  }

  report.status = status;
  report.action = action;
  report.adminNote = String(req.body.adminNote || "").trim().slice(0, 1000);
  report.handledBy = admin.id;
  report.handledAt = new Date().toISOString();

  saveCommunityReports(reports);

  res.json({
    ok: true,
    report
  });
});

const usersDataPath = path.join(process.cwd(), "data/users.json");

function readUsers() {
  try {
    if (!fs.existsSync(usersDataPath)) {
      fs.writeFileSync(usersDataPath, "[]", "utf-8");
      return [];
    }

    const content = fs.readFileSync(usersDataPath, "utf-8").trim();

    if (!content) {
      return [];
    }

    const users = JSON.parse(content);

    return Array.isArray(users) ? users : [];
  } catch (error) {
    console.error("Erreur lecture users.json:", error);
    return [];
  }
}

function saveUsers(users) {
  const temporaryPath = `${usersDataPath}.tmp`;

  fs.writeFileSync(
    temporaryPath,
    JSON.stringify(users, null, 2),
    "utf-8"
  );

  fs.renameSync(temporaryPath, usersDataPath);
}


/* =========================================================
   PCR FREE TRIAL 48H START
========================================================= */

const FREE_TRIAL_DURATION_MS =
  48 * 60 * 60 * 1000;

const FREE_TRIAL_MODULES = Object.freeze([
  {
    category: "biologie",
    module: "genetique",
    label: "Génétique"
  },
  {
    category: "chirurgie",
    module: "cci",
    label: "CCI"
  },
  {
    category: "medicale",
    module: "medecine-travail",
    label: "Médecine du travail"
  }
]);

function isAdminAccount(user) {
  return (
    String(user?.role || "")
      .trim()
      .toLowerCase() === "admin"
  );
}

function hasPaidPlatformAccess(user) {
  if (!user || isAdminAccount(user)) {
    return isAdminAccount(user);
  }

  const approved =
    String(user.status || "").toLowerCase() ===
    "approved";

  const paid =
    String(user.paymentStatus || "").toLowerCase() ===
    "paid";

  if (!approved || !paid) {
    return false;
  }

  if (String(user.plan || "").toLowerCase() === "gold") {
    return true;
  }

  if (
    String(user.plan || "").toLowerCase() ===
    "platinum"
  ) {
    const endTime =
      new Date(
        user.subscriptionEndDate || ""
      ).getTime();

    return (
      Number.isFinite(endTime) &&
      endTime > Date.now()
    );
  }

  return true;
}

function startFreeTrialIfNeeded(user) {
  if (
    !user ||
    isAdminAccount(user) ||
    hasPaidPlatformAccess(user)
  ) {
    return false;
  }

  if (
    String(user.status || "").toLowerCase() !==
      "approved" ||
    String(user.paymentStatus || "").toLowerCase() !==
      "trial" ||
    user.trialStartDate ||
    user.trialEndDate
  ) {
    return false;
  }

  const now = new Date();
  const endDate = new Date(
    now.getTime() + FREE_TRIAL_DURATION_MS
  );

  user.trialStartDate = now.toISOString();
  user.trialEndDate = endDate.toISOString();
  user.trialStatus = "active";
  user.trialExpiredAt = null;

  return true;
}

function getFreeTrialAccessState(user) {
  if (isAdminAccount(user)) {
    return {
      accessMode: "admin",
      hasFullAccess: true,
      trialActive: false,
      trialExpired: false,
      trialStatus: "unlimited",
      trialStartDate: null,
      trialEndDate: null,
      trialRemainingMs: null
    };
  }

  if (hasPaidPlatformAccess(user)) {
    return {
      accessMode: "paid",
      hasFullAccess: true,
      trialActive: false,
      trialExpired: false,
      trialStatus: "converted",
      trialStartDate:
        user?.trialStartDate || null,
      trialEndDate:
        user?.trialEndDate || null,
      trialRemainingMs: null
    };
  }

  const startTime = new Date(
    user?.trialStartDate || ""
  ).getTime();

  const endTime = new Date(
    user?.trialEndDate || ""
  ).getTime();

  if (
    !Number.isFinite(startTime) ||
    !Number.isFinite(endTime)
  ) {
    return {
      accessMode: "trial_pending",
      hasFullAccess: false,
      trialActive: false,
      trialExpired: false,
      trialStatus:
        user?.trialStatus || "pending",
      trialStartDate:
        user?.trialStartDate || null,
      trialEndDate:
        user?.trialEndDate || null,
      trialRemainingMs: null
    };
  }

  const remaining =
    Math.max(0, endTime - Date.now());

  if (remaining > 0) {
    return {
      accessMode: "trial_active",
      hasFullAccess: false,
      trialActive: true,
      trialExpired: false,
      trialStatus: "active",
      trialStartDate: user.trialStartDate,
      trialEndDate: user.trialEndDate,
      trialRemainingMs: remaining
    };
  }

  return {
    accessMode: "trial_expired",
    hasFullAccess: false,
    trialActive: false,
    trialExpired: true,
    trialStatus: "expired",
    trialStartDate: user.trialStartDate,
    trialEndDate: user.trialEndDate,
    trialRemainingMs: 0
  };
}

function syncFreeTrialStatus(user) {
  const state =
    getFreeTrialAccessState(user);

  if (
    !isAdminAccount(user) &&
    !hasPaidPlatformAccess(user)
  ) {
    user.trialStatus = state.trialStatus;

    if (
      state.trialExpired &&
      !user.trialExpiredAt
    ) {
      user.trialExpiredAt =
        new Date().toISOString();
    }
  }

  if (
    hasPaidPlatformAccess(user) &&
    user.trialStatus !== "converted"
  ) {
    user.trialStatus = "converted";
    user.trialConvertedAt =
      user.trialConvertedAt ||
      new Date().toISOString();
  }

  return state;
}

const trialAccessMiddleware =
  typeof requireAuth === "function"
    ? requireAuth
    : (req, res, next) => {
        const users = readUsers();

        const userId =
          req.body?.userId ||
          req.query?.userId;

        const deviceId = String(
          req.body?.deviceId ||
          req.query?.deviceId ||
          ""
        ).trim();

        const user = users.find(
          item =>
            String(item.id) ===
            String(userId)
        );

        if (!user) {
          return res.status(401).json({
            error: "Session invalide."
          });
        }

        if (
          user.activeDeviceId &&
          String(user.activeDeviceId) !==
            deviceId
        ) {
          return res.status(401).json({
            error:
              "Cette session n’est plus active sur cet appareil."
          });
        }

        req.auth = {
          userId: user.id,
          role: user.role || "student",
          deviceId,
          user
        };

        next();
      };

app.post(
  "/api/trial/access",
  trialAccessMiddleware,
  (req, res) => {
    const users = readUsers();

    const user = users.find(
      item =>
        String(item.id) ===
        String(req.auth.userId)
    );

    if (!user) {
      return res.status(404).json({
        error: "Utilisateur introuvable."
      });
    }

    const before = JSON.stringify({
      trialStatus: user.trialStatus,
      trialExpiredAt: user.trialExpiredAt,
      trialConvertedAt:
        user.trialConvertedAt
    });

    const access =
      syncFreeTrialStatus(user);

    const after = JSON.stringify({
      trialStatus: user.trialStatus,
      trialExpiredAt: user.trialExpiredAt,
      trialConvertedAt:
        user.trialConvertedAt
    });

    if (before !== after) {
      saveUsers(users);
    }

    return res.json({
      ok: true,
      ...access,
      allowedTrialModules:
        FREE_TRIAL_MODULES
    });
  }
);

/* =========================================================
   PCR FREE TRIAL 48H END
========================================================= */

/* =========================================================
   PASSWORD RESET
========================================================= */

const PASSWORD_RESET_DURATION_MS =
  15 * 60 * 1000;

const forgotPasswordAttempts = new Map();

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function createPasswordResetToken() {
  return crypto
    .randomBytes(32)
    .toString("hex");
}

function hashPasswordResetToken(token) {
  return crypto
    .createHash("sha256")
    .update(String(token))
    .digest("hex");
}

function getPasswordResetBaseUrl() {
  return String(
    process.env.APP_BASE_URL ||
    "https://pcrdz.com"
  ).replace(/\/+$/, "");
}

function cleanExpiredPasswordResetData(users) {
  const now = Date.now();
  let changed = false;

  users.forEach(user => {
    if (
      user.resetPasswordExpiresAt &&
      new Date(
        user.resetPasswordExpiresAt
      ).getTime() <= now
    ) {
      delete user.resetPasswordTokenHash;
      delete user.resetPasswordExpiresAt;
      delete user.resetPasswordRequestedAt;

      changed = true;
    }
  });

  if (changed) {
    saveUsers(users);
  }

  return users;
}

function checkForgotPasswordRateLimit(req, email) {
  const forwarded =
    req.headers["x-forwarded-for"];

  const ip = String(
    forwarded ||
    req.socket.remoteAddress ||
    "unknown"
  )
    .split(",")[0]
    .trim();

  const key = `${ip}:${email}`;
  const now = Date.now();

  const existing =
    forgotPasswordAttempts.get(key);

  if (
    existing &&
    now - existing < 60 * 1000
  ) {
    return false;
  }

  forgotPasswordAttempts.set(key, now);

  return true;
}

async function sendPasswordResetEmail({
  recipientEmail,
  recipientName,
  resetUrl
}) {
  const apiKey = String(
    process.env.BREVO_API_KEY || ""
  ).trim();

  const senderEmail = String(
    process.env.BREVO_SENDER_EMAIL || ""
  ).trim();

  const senderName = String(
    process.env.BREVO_SENDER_NAME ||
    "PCR Learning"
  ).trim();

  if (!apiKey) {
    throw new Error(
      "BREVO_API_KEY manquant."
    );
  }

  if (!senderEmail) {
    throw new Error(
      "BREVO_SENDER_EMAIL manquant."
    );
  }

  const response = await fetch(
    "https://api.brevo.com/v3/smtp/email",
    {
      method: "POST",

      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": apiKey
      },

      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail
        },

        to: [
          {
            email: recipientEmail,
            name:
              recipientName ||
              "Étudiant PCR"
          }
        ],

        subject:
          "Réinitialisation de votre mot de passe PCR",

        htmlContent: `
          <!DOCTYPE html>
          <html lang="fr">
          <head>
            <meta charset="UTF-8">
          </head>

          <body
            style="
              margin:0;
              padding:0;
              background:#050611;
              font-family:Arial,sans-serif;
              color:#ffffff;
            "
          >
            <div
              style="
                max-width:620px;
                margin:0 auto;
                padding:32px 18px;
              "
            >
              <div
                style="
                  background:#111321;
                  border:1px solid #33364d;
                  border-radius:20px;
                  padding:32px;
                "
              >
                <h1
                  style="
                    margin:0 0 12px;
                    color:#ffe600;
                    font-size:28px;
                  "
                >
                  PCR Learning
                </h1>

                <h2
                  style="
                    margin:0 0 20px;
                    font-size:22px;
                  "
                >
                  Réinitialisation du mot de passe
                </h2>

                <p
                  style="
                    color:#d8d9e2;
                    line-height:1.7;
                  "
                >
                  Bonjour ${escapeHtml(
                    recipientName ||
                    "Étudiant PCR"
                  )},
                </p>

                <p
                  style="
                    color:#d8d9e2;
                    line-height:1.7;
                  "
                >
                  Une demande de réinitialisation
                  du mot de passe a été effectuée
                  pour votre compte PCR Learning.
                </p>

                <div
                  style="
                    text-align:center;
                    margin:30px 0;
                  "
                >
                  <a
                    href="${resetUrl}"
                    style="
                      display:inline-block;
                      padding:15px 25px;
                      border-radius:999px;
                      background:
                        linear-gradient(
                          135deg,
                          #7c19ff,
                          #e24c9e
                        );
                      color:#ffffff;
                      font-weight:700;
                      text-decoration:none;
                    "
                  >
                    Modifier mon mot de passe
                  </a>
                </div>

                <p
                  style="
                    color:#b9bbc8;
                    line-height:1.7;
                  "
                >
                  Ce lien est valable pendant
                  15 minutes et ne peut être
                  utilisé qu'une seule fois.
                </p>

                <p
                  style="
                    color:#b9bbc8;
                    line-height:1.7;
                  "
                >
                  Si vous n'avez pas demandé
                  cette modification, ignorez
                  simplement cet e-mail.
                </p>

                <hr
                  style="
                    border:0;
                    border-top:1px solid #303347;
                    margin:28px 0;
                  "
                >

                <p
                  style="
                    margin:0;
                    color:#85889a;
                    font-size:13px;
                  "
                >
                  PCR Learning — Plateforme
                  Clinique Résidanat
                </p>
              </div>
            </div>
          </body>
          </html>
        `,

        textContent:
          `Bonjour ${recipientName || "Étudiant PCR"},\n\n` +
          `Utilisez ce lien pour modifier votre mot de passe :\n` +
          `${resetUrl}\n\n` +
          `Ce lien est valable pendant 15 minutes.\n\n` +
          `PCR Learning`
      })
    }
  );

  const responseText =
    await response.text();

  let responseData = {};

  if (responseText) {
    try {
      responseData =
        JSON.parse(responseText);
    } catch {
      responseData = {
        raw: responseText
      };
    }
  }

  if (!response.ok) {
    console.error(
      "Erreur Brevo:",
      response.status,
      responseData
    );

    throw new Error(
      responseData.message ||
      "Impossible d'envoyer l'e-mail."
    );
  }

  return responseData;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function checkExpiredPlatinumSubscriptions() {
  const users = readUsers();
  const now = Date.now();
  let changed = false;

  users.forEach(user => {
    if (isAdminAccount(user)) {
      return;
    }

    if (
      user.plan !== "platinum" ||
      !user.subscriptionEndDate
    ) {
      return;
    }

    const endTime =
      new Date(user.subscriptionEndDate).getTime();

    if (
      Number.isFinite(endTime) &&
      endTime <= now &&
      user.status === "approved"
    ) {
      user.status = "suspended";
      user.paymentStatus = "expired";

      // نرجع حساب الشهر الحالي للصفر
      user.totalPaid = 0;
      user.currentPeriodPaid = 0;
      user.remainingAmount = 12000;

      user.expiredAt =
        new Date().toISOString();

      changed = true;
    }
  });

  if (changed) {
    saveUsers(users);
  }
}

const subscriptionNotificationsPath = path.join(
  process.cwd(),
  "public/data/subscription-notifications.json"
);

function readSubscriptionNotifications() {
  try {
    if (!fs.existsSync(subscriptionNotificationsPath)) {
      fs.writeFileSync(
        subscriptionNotificationsPath,
        JSON.stringify([], null, 2)
      );
    }

    return JSON.parse(
      fs.readFileSync(subscriptionNotificationsPath, "utf8")
    );
  } catch (error) {
    console.error(
      "Erreur lecture notifications abonnements:",
      error
    );

    return [];
  }
}

function saveSubscriptionNotifications(notifications) {
  fs.writeFileSync(
    subscriptionNotificationsPath,
    JSON.stringify(notifications, null, 2)
  );
}

function createSubscriptionNotification({
  type,
  user,
  message
}) {
  const notifications =
    readSubscriptionNotifications();

  const duplicate = notifications.find(notification =>
    notification.type === type &&
    String(notification.userId) === String(user.id) &&
    notification.read !== true
  );

  if (duplicate) {
    return;
  }

  notifications.unshift({
    id: Date.now(),
    type,
    userId: user.id,
    userName: user.name || "Utilisateur",
    userEmail: user.email || "",
    plan: user.plan || "",
    message,
    read: false,
    createdAt: new Date().toISOString()
  });

  saveSubscriptionNotifications(notifications);
}

function addOneMonth(dateValue = new Date()) {
  const date = new Date(dateValue);

  const originalDay = date.getDate();

  date.setDate(1);
  date.setMonth(date.getMonth() + 1);

  const lastDayOfNewMonth = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0
  ).getDate();

  date.setDate(
    Math.min(originalDay, lastDayOfNewMonth)
  );

  return date;
}

function getSubscriptionDaysRemaining(user) {
  if (
    user.plan !== "platinum" ||
    !user.subscriptionEndDate
  ) {
    return null;
  }

  const now = new Date();
  const endDate = new Date(user.subscriptionEndDate);

  const difference =
    endDate.getTime() - now.getTime();

  return Math.ceil(
    difference / (1000 * 60 * 60 * 24)
  );
}

function refreshExpiredSubscriptions() {
  const users = readUsers();

  let changed = false;

  users.forEach(user => {
    if (isAdminAccount(user)) {
      return;
    }

    if (
      user.plan !== "platinum" ||
      !user.subscriptionEndDate
    ) {
      return;
    }

    const endDate =
      new Date(user.subscriptionEndDate);

    if (Number.isNaN(endDate.getTime())) {
      return;
    }

    const now = new Date();

    if (endDate <= now) {
      if (
        user.paymentStatus !== "expired" ||
        user.status !== "suspended"
      ) {
        user.paymentStatus = "expired";
        user.status = "suspended";
        user.currentPeriodPaid = 0;
        user.expiredAt = now.toISOString();

        createSubscriptionNotification({
          type: "subscription_expired",
          user,
          message:
            `Abonnement Platinum expiré pour ${user.name || user.email}.`
        });

        changed = true;
      }

      return;
    }

    const daysRemaining =
      getSubscriptionDaysRemaining(user);

    if (
      daysRemaining !== null &&
      daysRemaining <= 7 &&
      daysRemaining > 0
    ) {
      createSubscriptionNotification({
        type: `subscription_expiring_${daysRemaining}`,
        user,
        message:
          `L’abonnement de ${user.name || user.email} expire dans ${daysRemaining} jour(s).`
      });
    }
  });

  if (changed) {
    saveUsers(users);
  }

  return users;
}

function getUserCommunityStats(userId) {
  const posts = readCommunityPosts();

  // منشورات هذا المستخدم
  const userPosts = posts.filter(
    post => String(post.authorId) === String(userId)
  );

  // جميع التعليقات الموجودة على منشوراته
  const commentsReceived = userPosts.reduce(
    (total, post) =>
      total + (post.comments || []).length,
    0
  );

  // جميع الإعجابات التي استلمتها منشوراته
  const postLikesReceived = userPosts.reduce(
    (total, post) =>
      total + Number(post.likes || 0),
    0
  );

  return {
    publications: userPosts.length,
    comments: commentsReceived,
    likesReceived: postLikesReceived
  };
}

app.post("/api/auth/register", async (req, res) => {
  const users = readUsers();

  const {
    name,
    email,
    password,
    phone,
    university,
    promotion,
    plan
  } = req.body;

  const cleanName = String(name || "").trim();

  const cleanEmail = String(email || "")
    .trim()
    .toLowerCase();

  const cleanPassword = String(password || "")
    .trim();

  const allowedPlans = [
    "platinum",
    "gold"
  ];

  const cleanPhone = String(
  phone || ""
).trim();

const cleanUniversity = String(
  university || ""
).trim();

const cleanPromotion = String(
  promotion || ""
).trim();

if (
  !cleanName ||
  !cleanEmail ||
  !cleanPassword ||
  !cleanPhone ||
  !cleanUniversity ||
  !cleanPromotion
) {
  return res.status(400).json({
    error:
      "Tous les champs sont obligatoires."
  });
}

  if (!allowedPlans.includes(plan)) {
    return res.status(400).json({
      error: "Abonnement invalide."
    });
  }

  const exists = users.find(
    user =>
      String(user.email || "")
        .trim()
        .toLowerCase() === cleanEmail
  );

  if (exists) {
    return res.status(400).json({
      error: "Cet email existe déjà."
    });
  }

  const isGold = plan === "gold";

  const hashedPassword =
  await hashUserPassword(cleanPassword);

  const newUser = {
    id: crypto.randomUUID(),

    name: cleanName,
    email: cleanEmail,
    password: hashedPassword,

    phone: cleanPhone,
university: cleanUniversity,
promotion: cleanPromotion,

    role: "student",

    // الحساب يدخل مباشرة في essai gratuit
    status: "approved",

    plan,

    planLabel: isGold
      ? "Pack Gold"
      : "Pack Platinum",

    paymentStatus: "trial",

    paymentType: isGold
      ? "one_time"
      : "monthly",

    subscriptionPrice: isGold
      ? 140000
      : 12000,

    subscriptionCurrency: "DZD",

    subscriptionStartDate: null,
    subscriptionEndDate: null,
    lastPaymentDate: null,
    totalPaid: 0,
lifetimePaid: 0,
currentPeriodPaid: 0,

remainingAmount: isGold
  ? 140000
  : 12000,

payments: [],
expiredAt: null,

    trialStatus: "pending",
    trialStartDate: null,
    trialEndDate: null,
    trialExpiredAt: null,
    trialConvertedAt: null,

    photoUrl: "",
    bio: "",

    createdAt: new Date().toISOString()
  };

  users.push(newUser);

  saveUsers(users);

  createSubscriptionNotification({
  type: "new_registration",
  user: newUser,
  message:
    `Nouvel essai gratuit 48 h : ${newUser.name} — ${newUser.planLabel}.`
});

  res.json({
    ok: true,

    message:
      "Compte créé. Votre essai gratuit de 48 heures commencera lors de votre première connexion.",

    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      plan: newUser.plan,
      planLabel: newUser.planLabel,
      paymentStatus:
        newUser.paymentStatus,
      status: newUser.status,
      trialStatus: newUser.trialStatus,
      trialStartDate: newUser.trialStartDate,
      trialEndDate: newUser.trialEndDate
    }
  });
});

app.post(
  "/api/auth/forgot-password",
  async (req, res) => {
    const genericResponse = {
      ok: true,

      message:
        "Si un compte correspond à cette adresse, un lien de réinitialisation vous sera envoyé."
    };

    try {
      const email =
        normalizeEmail(req.body.email);

      if (!email) {
        return res.status(400).json({
          error:
            "Veuillez saisir votre adresse e-mail."
        });
      }

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email
        )
      ) {
        return res.status(400).json({
          error:
            "Adresse e-mail invalide."
        });
      }

      if (
        !checkForgotPasswordRateLimit(
          req,
          email
        )
      ) {
        return res.status(429).json({
          error:
            "Veuillez attendre une minute avant de réessayer."
        });
      }

      let users =
        cleanExpiredPasswordResetData(
          readUsers()
        );

      const user = users.find(
        item =>
          normalizeEmail(item.email) ===
          email
      );

      /*
        نرجع نفس الرسالة حتى لو الحساب غير موجود،
        لمنع معرفة الحسابات المسجلة.
      */
      if (!user) {
        return res.json(
          genericResponse
        );
      }

      const rawToken =
        createPasswordResetToken();

      user.resetPasswordTokenHash =
        hashPasswordResetToken(
          rawToken
        );

      user.resetPasswordExpiresAt =
        new Date(
          Date.now() +
          PASSWORD_RESET_DURATION_MS
        ).toISOString();

      user.resetPasswordRequestedAt =
        new Date().toISOString();

      saveUsers(users);

      const resetUrl =
        `${getPasswordResetBaseUrl()}` +
        `/pages/auth/reset-password.html` +
        `?token=${encodeURIComponent(
          rawToken
        )}`;

      try {
        await sendPasswordResetEmail({
          recipientEmail: user.email,
          recipientName: user.name,
          resetUrl
        });
      } catch (emailError) {
        delete user.resetPasswordTokenHash;
        delete user.resetPasswordExpiresAt;
        delete user.resetPasswordRequestedAt;

        saveUsers(users);

        throw emailError;
      }

      return res.json(
        genericResponse
      );

    } catch (error) {
      console.error(
        "Erreur forgot-password:",
        error
      );

      return res.status(500).json({
        error:
          "Impossible d'envoyer l'e-mail pour le moment."
      });
    }
  }
);

app.get(
  "/api/auth/reset-password/validate",
  (req, res) => {
    try {
      const token = String(
        req.query.token || ""
      ).trim();

      if (!token) {
        return res.status(400).json({
          valid: false,
          error:
            "Lien de réinitialisation invalide."
        });
      }

      const tokenHash =
        hashPasswordResetToken(token);

      const users =
        cleanExpiredPasswordResetData(
          readUsers()
        );

      const user = users.find(
        item =>
          item.resetPasswordTokenHash ===
          tokenHash
      );

      if (!user) {
        return res.status(400).json({
          valid: false,
          error:
            "Ce lien est invalide ou a expiré."
        });
      }

      const expiresAt =
        new Date(
          user.resetPasswordExpiresAt
        ).getTime();

      if (
        !Number.isFinite(expiresAt) ||
        expiresAt <= Date.now()
      ) {
        return res.status(400).json({
          valid: false,
          error:
            "Ce lien a expiré."
        });
      }

      return res.json({
        valid: true
      });

    } catch (error) {
      console.error(
        "Erreur validation token:",
        error
      );

      return res.status(500).json({
        valid: false,
        error:
          "Impossible de vérifier ce lien."
      });
    }
  }
);

app.post(
  "/api/auth/reset-password",
  async (req, res) => {
    try {
      const token = String(
        req.body.token || ""
      ).trim();

      const password = String(
        req.body.password || ""
      );

      const confirmPassword = String(
        req.body.confirmPassword || ""
      );

      if (!token) {
        return res.status(400).json({
          error:
            "Lien de réinitialisation invalide."
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          error:
            "Le mot de passe doit contenir au moins 8 caractères."
        });
      }

      if (
        !/[A-Za-z]/.test(password) ||
        !/[0-9]/.test(password)
      ) {
        return res.status(400).json({
          error:
            "Le mot de passe doit contenir au moins une lettre et un chiffre."
        });
      }

      if (
        password !== confirmPassword
      ) {
        return res.status(400).json({
          error:
            "Les mots de passe ne correspondent pas."
        });
      }

      const tokenHash =
        hashPasswordResetToken(token);

      const users =
        cleanExpiredPasswordResetData(
          readUsers()
        );

      const user = users.find(
        item =>
          item.resetPasswordTokenHash ===
          tokenHash
      );

      if (!user) {
        return res.status(400).json({
          error:
            "Ce lien est invalide ou a expiré."
        });
      }

      const expiresAt =
        new Date(
          user.resetPasswordExpiresAt
        ).getTime();

      if (
        !Number.isFinite(expiresAt) ||
        expiresAt <= Date.now()
      ) {
        delete user.resetPasswordTokenHash;
        delete user.resetPasswordExpiresAt;
        delete user.resetPasswordRequestedAt;

        saveUsers(users);

        return res.status(400).json({
          error:
            "Ce lien a expiré. Effectuez une nouvelle demande."
        });
      }

      user.password =
  await hashUserPassword(password);

      /*
        غلق الجلسة القديمة بعد تغيير كلمة المرور.
      */
      user.activeDeviceId = "";
      user.lastLogoutAt =
        new Date().toISOString();

      user.passwordUpdatedAt =
        new Date().toISOString();

      delete user.resetPasswordTokenHash;
      delete user.resetPasswordExpiresAt;
      delete user.resetPasswordRequestedAt;

      saveUsers(users);

      return res.json({
        ok: true,

        message:
          "Votre mot de passe a été modifié. Vous pouvez maintenant vous connecter."
      });

    } catch (error) {
      console.error(
        "Erreur reset-password:",
        error
      );

      return res.status(500).json({
        error:
          "Impossible de modifier le mot de passe."
      });
    }
  }
);

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,

  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,

  message: {
    error:
      "Trop de tentatives de connexion. Réessayez dans 15 minutes."
  }
});

app.post(
  "/api/auth/login",
  loginRateLimiter,
  async (req, res) => {
    try {
      refreshExpiredSubscriptions();

      const users = readUsers();

      const email = normalizeEmail(
        req.body.email
      );

      const password = String(
        req.body.password || ""
      );

      const deviceId = String(
        req.body.deviceId || ""
      ).trim();

      if (!email || !password) {
        return res.status(400).json({
          error:
            "Veuillez saisir votre e-mail et votre mot de passe."
        });
      }

      const user = users.find(
        item =>
          normalizeEmail(item.email) ===
          email
      );

      if (!user) {
        return res.status(401).json({
          error:
            "Email ou mot de passe incorrect."
        });
      }

      const passwordIsValid =
        await verifyUserPassword(
          password,
          user.password
        );

      if (!passwordIsValid) {
        return res.status(401).json({
          error:
            "Email ou mot de passe incorrect."
        });
      }

      /*
        Migration automatique des anciens comptes.

        Si le mot de passe est encore enregistré
        en clair, il est remplacé par un hash bcrypt
        dès la première connexion réussie.
      */
      if (!isBcryptHash(user.password)) {
        user.password =
          await hashUserPassword(password);

        user.passwordMigratedAt =
          new Date().toISOString();
      }

      const accountIsAdmin =
        isAdminAccount(user);

      startFreeTrialIfNeeded(user);

      const trialAccess =
        syncFreeTrialStatus(user);

      if (
        !accountIsAdmin &&
        user.plan === "platinum" &&
        user.paymentStatus === "expired"
      ) {
        saveUsers(users);

        return res.status(403).json({
          error:
            "Votre abonnement Platinum est expiré. Renouvelez votre paiement de 12 000 DA. Support : 0771 73 92 06."
        });
      }

      if (
        !accountIsAdmin &&
        user.status !== "approved"
      ) {
        saveUsers(users);

        return res.status(403).json({
          error:
            user.status === "suspended"
              ? "Votre compte est suspendu."
              : "Compte en attente de validation."
        });
      }

      if (
        user.activeDeviceId &&
        user.activeDeviceId !== deviceId
      ) {
        saveUsers(users);

        return res.status(403).json({
          code: "DEVICE_IN_USE",

          error:
            "Ce compte est déjà connecté sur un autre appareil."
        });
      }

      /*
  Le deviceId est obligatoire pour la gestion
  d'une seule session active.
*/
if (!deviceId || deviceId.length < 10) {
  return res.status(400).json({
    error:
      "Identifiant de l'appareil invalide."
  });
}

user.activeDeviceId = deviceId;

user.tokenVersion =
  Number(user.tokenVersion || 0);

user.lastLoginAt =
  new Date().toISOString();

saveUsers(users);

const accessToken =
  createAccessToken(user, deviceId);

return res.json({
  ok: true,

  accessToken,

  tokenType: "Bearer",

  expiresIn: JWT_EXPIRES_IN,

  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    plan: user.plan,
    paymentStatus:
      user.paymentStatus,

    subscriptionEndDate:
      user.subscriptionEndDate ||
      null,

    trialStatus:
      trialAccess.trialStatus,

    trialStartDate:
      trialAccess.trialStartDate,

    trialEndDate:
      trialAccess.trialEndDate,

    trialRemainingMs:
      trialAccess.trialRemainingMs,

    accessMode:
      trialAccess.accessMode,

    hasFullAccess:
      trialAccess.hasFullAccess,

    allowedTrialModules:
      FREE_TRIAL_MODULES,

    deviceId
  }
});
        

    } catch (error) {
      console.error(
        "Erreur login:",
        error
      );

      return res.status(500).json({
        error:
          "Impossible de vous connecter pour le moment."
      });
    }
  }
);




/* =========================================================
   PCR — CHANGEMENT SÉCURISÉ D’APPAREIL
========================================================= */

const pcrSwitchDeviceGuards =
  typeof loginRateLimiter === "function"
    ? [loginRateLimiter]
    : [];

app.post(
  "/api/auth/switch-device",
  ...pcrSwitchDeviceGuards,
  async (req, res) => {
    try {
      refreshExpiredSubscriptions();

      const users = readUsers();

      const email = normalizeEmail(
        req.body.email
      );

      const password = String(
        req.body.password || ""
      );

      const deviceId = String(
        req.body.deviceId || ""
      ).trim();

      if (!email || !password || !deviceId) {
        return res.status(400).json({
          error:
            "Informations de connexion incomplètes."
        });
      }

      if (deviceId.length < 10) {
        return res.status(400).json({
          error:
            "Identifiant de l’appareil invalide."
        });
      }

      const user = users.find(
        item =>
          normalizeEmail(item.email) === email
      );

      if (!user) {
        return res.status(401).json({
          error:
            "Email ou mot de passe incorrect."
        });
      }

      const passwordIsValid =
        await verifyUserPassword(
          password,
          user.password
        );

      if (!passwordIsValid) {
        return res.status(401).json({
          error:
            "Email ou mot de passe incorrect."
        });
      }

      const accountIsAdmin =
        isAdminAccount(user);

      if (
        !accountIsAdmin &&
        user.plan === "platinum" &&
        user.paymentStatus === "expired"
      ) {
        return res.status(403).json({
          error:
            "Votre abonnement Platinum est expiré. Renouvelez votre paiement."
        });
      }

      if (
        !accountIsAdmin &&
        user.status !== "approved"
      ) {
        return res.status(403).json({
          error:
            user.status === "suspended"
              ? "Votre compte est suspendu."
              : "Votre compte n’est pas autorisé."
        });
      }

      startFreeTrialIfNeeded(user);

      const trialAccess =
        syncFreeTrialStatus(user);

      user.tokenVersion =
        Number(user.tokenVersion || 0) + 1;

      user.activeDeviceId = deviceId;
      user.lastDeviceSwitchAt =
        new Date().toISOString();
      user.lastLoginAt =
        new Date().toISOString();

      saveUsers(users);

      const accessToken =
        createAccessToken(user, deviceId);

      return res.json({
        ok: true,
        switched: true,
        accessToken,
        tokenType: "Bearer",
        expiresIn:
          typeof JWT_EXPIRES_IN !== "undefined"
            ? JWT_EXPIRES_IN
            : null,
        message:
          "L’ancien appareil a été déconnecté.",

        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          plan: user.plan,
          paymentStatus: user.paymentStatus,
          subscriptionEndDate:
            user.subscriptionEndDate || null,
          trialStatus: trialAccess.trialStatus,
          trialStartDate: trialAccess.trialStartDate,
          trialEndDate: trialAccess.trialEndDate,
          trialRemainingMs: trialAccess.trialRemainingMs,
          accessMode: trialAccess.accessMode,
          hasFullAccess: trialAccess.hasFullAccess,
          allowedTrialModules: FREE_TRIAL_MODULES,
          deviceId
        }
      });

    } catch (error) {
      console.error(
        "Erreur changement appareil:",
        error
      );

      return res.status(500).json({
        error:
          "Impossible de changer d’appareil pour le moment."
      });
    }
  }
);


/* =========================================================
   PCR — LOGOUT DE L’APPAREIL ACTIF
   Fonctionne même si le JWT vient d’expirer.
========================================================= */

app.post(
  "/api/auth/logout-device",
  (req, res) => {
    try {
      const users = readUsers();
      const userId = req.body?.userId;
      const deviceId = String(
        req.body?.deviceId || ""
      ).trim();

      if (!userId || !deviceId) {
        return res.status(400).json({
          error:
            "Informations de session manquantes."
        });
      }

      const user = users.find(
        item =>
          String(item.id) === String(userId)
      );

      if (!user) {
        return res.status(404).json({
          error: "Utilisateur introuvable."
        });
      }

      if (
        user.activeDeviceId &&
        String(user.activeDeviceId) !== deviceId
      ) {
        return res.status(403).json({
          error:
            "Cette session n’est pas active sur cet appareil."
        });
      }

      user.activeDeviceId = "";
      user.tokenVersion =
        Number(user.tokenVersion || 0) + 1;
      user.lastLogoutAt =
        new Date().toISOString();

      saveUsers(users);

      return res.json({
        ok: true,
        message: "Déconnexion réussie."
      });

    } catch (error) {
      console.error(
        "Erreur logout-device:",
        error
      );

      return res.status(500).json({
        error:
          "Impossible de terminer la déconnexion."
      });
    }
  }
);


app.post(
  "/api/auth/logout",
  requireAuth,
  (req, res) => {
    const users = readUsers();

    const user = users.find(
      item =>
        String(item.id) ===
        String(req.auth.userId)
    );

    if (!user) {
      return res.status(404).json({
        error: "Utilisateur introuvable."
      });
    }

    /*
      Invalide tous les anciens tokens.
    */
    user.tokenVersion =
      Number(user.tokenVersion || 0) + 1;

    user.activeDeviceId = "";

    user.lastLogoutAt =
      new Date().toISOString();

    saveUsers(users);

    return res.json({
      ok: true,
      message: "Déconnexion réussie."
    });
  }
);

app.get(
  "/api/profile/:userId",
  requireAuth,
  (req, res) => {
    const users = readUsers();

    const user = users.find(
      item =>
        String(item.id) === String(req.params.userId)
    );

    if (!user) {
      return res.status(404).json({
        error: "Utilisateur introuvable."
      });
    }

    const stats = getUserCommunityStats(user.id);

    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      photoUrl: user.photoUrl || "",
      bio: user.bio || "",
      university: user.university || "",
      promotion: user.promotion || "",
      stats
    });
  }
);

app.put(
  "/api/profile/:userId",
  requireAuth,
  uploadProfile.single("photo"),
  (req, res) => {
    if (
      String(req.auth.userId) !==
      String(req.params.userId)
    ) {
      return res.status(403).json({
        error: "Vous ne pouvez modifier que votre profil."
      });
    }
    const users = readUsers();

    const user = users.find(
      item =>
        String(item.id) === String(req.params.userId)
    );

    if (!user) {
      return res.status(404).json({
        error: "Utilisateur introuvable."
      });
    }

    const {
      name,
      bio,
      university,
      promotion
    } = req.body;

    if (name !== undefined) {
      const cleanName = String(name).trim();

      if (!cleanName) {
        return res.status(400).json({
          error: "Le nom est obligatoire."
        });
      }

      user.name = cleanName;
    }

    if (bio !== undefined) {
      user.bio = String(bio)
        .trim()
        .slice(0, 500);
    }

    if (university !== undefined) {
      user.university = String(university)
        .trim()
        .slice(0, 150);
    }

    if (promotion !== undefined) {
      user.promotion = String(promotion)
        .trim()
        .slice(0, 150);
    }

    if (req.file) {
      if (
        user.photoUrl &&
        user.photoUrl.startsWith("/uploads/profiles/")
      ) {
        const oldPhotoPath = path.join(
          process.cwd(),
          "public",
          user.photoUrl.replace(/^\/+/, "")
        );

        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }

      user.photoUrl =
        `/uploads/profiles/${req.file.filename}`;
    }

    user.profileUpdatedAt =
      new Date().toISOString();

    saveUsers(users);

    const stats = getUserCommunityStats(user.id);

    res.json({
      ok: true,

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,

        photoUrl: user.photoUrl || "",
        bio: user.bio || "",
        university: user.university || "",
        promotion: user.promotion || "",

        stats
      }
    });
  }
);

app.delete(
  "/api/profile/:userId/photo",
  requireAuth,
  (req, res) => {
    if (
      String(req.auth.userId) !==
      String(req.params.userId)
    ) {
      return res.status(403).json({
        error: "Vous ne pouvez modifier que votre profil."
      });
    }
    const users = readUsers();

    const user = users.find(
      item =>
        String(item.id) === String(req.params.userId)
    );

    if (!user) {
      return res.status(404).json({
        error: "Utilisateur introuvable."
      });
    }

    if (
      user.photoUrl &&
      user.photoUrl.startsWith("/uploads/profiles/")
    ) {
      const photoPath = path.join(
        process.cwd(),
        "public",
        user.photoUrl.replace(/^\/+/, "")
      );

      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }

    user.photoUrl = "";

    saveUsers(users);

    res.json({
      ok: true,
      message: "Photo supprimée."
    });
  }
);

app.post(
  "/api/profile/:userId/change-password",
  async (req, res) => {
    try {
      const users = readUsers();

      const user = users.find(
        item =>
          String(item.id) ===
          String(req.params.userId)
      );

      if (!user) {
        return res.status(404).json({
          error:
            "Utilisateur introuvable."
        });
      }

      const currentPassword = String(
        req.body.currentPassword || ""
      );

      const newPassword = String(
        req.body.newPassword || ""
      );

      const confirmPassword = String(
        req.body.confirmPassword || ""
      );

      if (
        !currentPassword ||
        !newPassword ||
        !confirmPassword
      ) {
        return res.status(400).json({
          error:
            "Tous les champs sont obligatoires."
        });
      }

      const currentPasswordIsValid =
        await verifyUserPassword(
          currentPassword,
          user.password
        );

      if (!currentPasswordIsValid) {
        return res.status(401).json({
          error:
            "Le mot de passe actuel est incorrect."
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          error:
            "Le nouveau mot de passe doit contenir au moins 8 caractères."
        });
      }

      if (
        !/[A-Za-z]/.test(newPassword) ||
        !/[0-9]/.test(newPassword)
      ) {
        return res.status(400).json({
          error:
            "Le nouveau mot de passe doit contenir au moins une lettre et un chiffre."
        });
      }

      if (
        newPassword !== confirmPassword
      ) {
        return res.status(400).json({
          error:
            "Les nouveaux mots de passe ne correspondent pas."
        });
      }

      const samePassword =
        await verifyUserPassword(
          newPassword,
          user.password
        );

      if (samePassword) {
        return res.status(400).json({
          error:
            "Le nouveau mot de passe doit être différent de l'ancien."
        });
      }

      user.password =
        await hashUserPassword(newPassword);

      user.activeDeviceId = "";

      user.passwordUpdatedAt =
        new Date().toISOString();

      user.lastLogoutAt =
        new Date().toISOString();

      delete user.resetPasswordTokenHash;
      delete user.resetPasswordExpiresAt;
      delete user.resetPasswordRequestedAt;

      saveUsers(users);

      return res.json({
        ok: true,

        message:
          "Mot de passe modifié avec succès. Veuillez vous reconnecter."
      });

    } catch (error) {
      console.error(
        "Erreur changement mot de passe:",
        error
      );

      return res.status(500).json({
        error:
          "Impossible de modifier le mot de passe."
      });
    }
  }
);

app.get(
  "/api/admin/subscription-notifications",
  (req, res) => {
    refreshExpiredSubscriptions();

    const notifications =
      readSubscriptionNotifications();

    res.json(notifications);
  }
);

app.post(
  "/api/admin/subscription-notifications/read",
  (req, res) => {
    const notifications =
      readSubscriptionNotifications();

    notifications.forEach(notification => {
      notification.read = true;
    });

    saveSubscriptionNotifications(
      notifications
    );

    res.json({
      ok: true
    });
  }
);

app.post(
  "/api/admin/subscription-notifications/:id/read",
  (req, res) => {
    const notifications =
      readSubscriptionNotifications();

    const notification =
      notifications.find(
        item =>
          String(item.id) ===
          String(req.params.id)
      );

    if (!notification) {
      return res.status(404).json({
        error: "Notification introuvable."
      });
    }

    notification.read = true;
    notification.readAt =
      new Date().toISOString();

    saveSubscriptionNotifications(
      notifications
    );

    res.json({
      ok: true
    });
  }
);

app.get("/api/admin/users", (req, res) => {
  const users = readUsers();

  res.json(
    users.map(sanitizeUser)
  );
});

app.post("/api/admin/users/:id/approve", (req, res) => {
  const users = readUsers();
  const user = users.find(u => u.id == req.params.id);

  if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

  user.status = "approved";
  saveUsers(users);

  res.json({ ok: true, user });
});

app.post(
  "/api/admin/users/:id/confirm-payment",
  (req, res) => {
    checkExpiredPlatinumSubscriptions();

    const users = readUsers();

    const user = users.find(
      item =>
        String(item.id) ===
        String(req.params.id)
    );

    if (!user) {
      return res.status(404).json({
        error: "Utilisateur introuvable."
      });
    }

    const paidAmount =
      Number(req.body.paidAmount);

    if (
      !Number.isFinite(paidAmount) ||
      paidAmount <= 0
    ) {
      return res.status(400).json({
        error: "Montant payé invalide."
      });
    }

    const requiredAmount =
      user.plan === "gold"
        ? 140000
        : user.plan === "platinum"
          ? 12000
          : 0;

    if (!requiredAmount) {
      return res.status(400).json({
        error:
          "Aucun pack valide pour cet utilisateur."
      });
    }

    const isExpiredPlatinum =
  user.plan === "platinum" &&
  (
    user.paymentStatus === "expired" ||
    user.status === "suspended"
  );

const previousPaid =
  isExpiredPlatinum
    ? 0
    : Number(user.totalPaid || 0);

    const remainingBeforePayment =
      Math.max(
        requiredAmount - previousPaid,
        0
      );

    if (paidAmount > remainingBeforePayment) {
      return res.status(400).json({
        error:
          `Le montant dépasse le reste à payer : ${remainingBeforePayment.toLocaleString("fr-FR")} DA.`
      });
    }

    if (isExpiredPlatinum) {
  user.totalPaid = 0;
  user.currentPeriodPaid = 0;
  user.remainingAmount = 12000;
}

    const now = new Date();

    user.totalPaid =
      previousPaid + paidAmount;

    user.remainingAmount =
      Math.max(
        requiredAmount - user.totalPaid,
        0
      );

    user.lastPaymentAmount =
      paidAmount;

    user.lastPaymentDate =
      now.toISOString();

    if (!Array.isArray(user.payments)) {
      user.payments = [];
    }

    user.payments.push({
      id: Date.now(),
      amount: paidAmount,
      currency: "DZD",
      paidAt: now.toISOString()
    });

    // الدفع مازال ناقص
    if (user.remainingAmount > 0) {
      user.paymentStatus = "partial";
      user.status = "pending";

      saveUsers(users);

      createSubscriptionNotification({
  type: "partial_payment",
  user,
  message:
    `${user.name} a payé ${paidAmount.toLocaleString("fr-FR")} DA. ` +
    `Reste : ${user.remainingAmount.toLocaleString("fr-FR")} DA.`
});

      return res.json({
        ok: true,
        message:
          "Paiement partiel enregistré.",
        user
      });
    }

    // الدفع كامل
    user.paymentStatus = "paid";
    user.status = "approved";
    user.expiredAt = null;

    user.trialStatus = "converted";
    user.trialConvertedAt =
      now.toISOString();

    if (user.plan === "platinum") {
      const endDate = new Date(
        now.getTime() +
        30 * 24 * 60 * 60 * 1000
      );

      user.subscriptionStartDate =
        now.toISOString();

      user.subscriptionEndDate =
        endDate.toISOString();

      user.currentPeriodPaid = 12000;
    }

    if (user.plan === "gold") {
      user.subscriptionStartDate =
        user.subscriptionStartDate ||
        now.toISOString();

      user.subscriptionEndDate = null;
    }

    saveUsers(users);

    createSubscriptionNotification({
  type:
    isExpiredPlatinum
      ? "subscription_renewed"
      : "payment_completed",

  user,

  message:
    user.plan === "platinum"
      ? (
          isExpiredPlatinum
            ? `${user.name} a renouvelé son Pack Platinum jusqu’au ${
                new Date(
                  user.subscriptionEndDate
                ).toLocaleDateString("fr-FR")
              }.`
            : `Paiement Platinum confirmé pour ${user.name}. Compte actif jusqu’au ${
                new Date(
                  user.subscriptionEndDate
                ).toLocaleDateString("fr-FR")
              }.`
        )
      : `Paiement Gold complet confirmé pour ${user.name}.`
});

    res.json({
      ok: true,

      message:
        user.plan === "platinum"
          ? "Paiement confirmé. Compte activé pendant 30 jours."
          : "Paiement complet. Compte activé définitivement.",

      user
    });
  }
);

app.post("/api/admin/users/:id/refuse", (req, res) => {
  const users = readUsers();
  const user = users.find(u => u.id == req.params.id);

  if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

  user.status = "refused";
  saveUsers(users);

  res.json({ ok: true, user });
});

app.post("/api/admin/users/:id/suspend", (req, res) => {
  const users = readUsers();
  const user = users.find(u => u.id == req.params.id);

  if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

  user.status = "suspended";
  saveUsers(users);

  res.json({ ok: true, user });
});

app.delete("/api/admin/users/:id", (req, res) => {
  let users = readUsers();

  const exists = users.find(u => u.id == req.params.id);
  if (!exists) return res.status(404).json({ error: "Utilisateur introuvable" });

  users = users.filter(u => u.id != req.params.id);
  saveUsers(users);

  res.json({ ok: true });
});

app.post(
  "/api/admin/users/:id/reset-password",
  async (req, res) => {
    try {
      const users = readUsers();

      const user = users.find(
        item =>
          String(item.id) ===
          String(req.params.id)
      );

      if (!user) {
        return res.status(404).json({
          error:
            "Utilisateur introuvable."
        });
      }

      const password = String(
        req.body.password || ""
      );

      if (password.length < 8) {
        return res.status(400).json({
          error:
            "Le mot de passe doit contenir au moins 8 caractères."
        });
      }

      if (
        !/[A-Za-z]/.test(password) ||
        !/[0-9]/.test(password)
      ) {
        return res.status(400).json({
          error:
            "Le mot de passe doit contenir au moins une lettre et un chiffre."
        });
      }

      user.password =
        await hashUserPassword(password);

      user.activeDeviceId = "";

      user.passwordUpdatedAt =
        new Date().toISOString();

      user.passwordUpdatedBy =
        "admin";

      saveUsers(users);

      return res.json({
        ok: true,

        message:
          "Mot de passe modifié avec succès.",

        user: sanitizeUser(user)
      });

    } catch (error) {
      console.error(
        "Erreur admin reset-password:",
        error
      );

      return res.status(500).json({
        error:
          "Impossible de modifier le mot de passe."
      });
    }
  }
);

app.get("/api/admin/users/:id/details", (req, res) => {
  const users = readUsers();

  const user = users.find(
    item =>
      String(item.id) === String(req.params.id)
  );

  if (!user) {
    return res.status(404).json({
      error: "Utilisateur introuvable"
    });
  }

  const stats = getUserCommunityStats(user.id);

  res.json({
  user: sanitizeUser(user),

    stats: {
      posts: stats.publications,
      comments: stats.comments,
      likesReceived: stats.likesReceived,

      lastLoginAt: user.lastLoginAt || "",

      activeDevice: user.activeDeviceId
        ? "Connecté"
        : "Non connecté"
    }
  });
});

const courseUploadStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === "video") {
      cb(null, "public/uploads/cours/videos");
    } else if (file.fieldname === "pdf") {
      cb(null, "public/uploads/cours/pdfs");
    } else {
      cb(null, "public/uploads/cours");
    }
  },
  filename: function (req, file, cb) {
    const safeName = file.originalname.replace(/\s+/g, "-");
    cb(null, Date.now() + "-" + safeName);
  }
});

const uploadCourse = multer({ storage: courseUploadStorage });

const coursesDataPath = path.join(process.cwd(), "public/data/cours.json");

function readCourses() {
  if (!fs.existsSync(coursesDataPath)) return [];
  return JSON.parse(fs.readFileSync(coursesDataPath, "utf-8"));
}

function saveCourses(courses) {
  fs.writeFileSync(coursesDataPath, JSON.stringify(courses, null, 2));
}

app.get("/api/admin/courses", (req, res) => {
  res.json(readCourses());
});

app.post(
  "/api/admin/courses",
  uploadCourse.fields([
    { name: "video", maxCount: 1 },
    { name: "pdf", maxCount: 1 }
  ]),
  (req, res) => {
    const courses = readCourses();

    const newCourse = {
      id: Date.now(),
      title: req.body.title || "",
      category: req.body.category || "",
      module: req.body.module || "",
      
      videoUrl: req.files?.video
        ? `/uploads/cours/videos/${req.files.video[0].filename}`
        : "",
      pdfUrl: req.files?.pdf
        ? `/uploads/cours/pdfs/${req.files.pdf[0].filename}`
        : "",
      createdAt: new Date().toISOString()
    };

    courses.push(newCourse);
    saveCourses(courses);

    res.json({ ok: true, course: newCourse });
  }
);

app.delete("/api/admin/courses/:id", (req, res) => {
  let courses = readCourses();

  const exists = courses.find(c => c.id == req.params.id);
  if (!exists) return res.status(404).json({ error: "Cours introuvable" });

  courses = courses.filter(c => c.id != req.params.id);
  saveCourses(courses);

  res.json({ ok: true });
});

app.put(
  "/api/admin/courses/:id",
  uploadCourse.fields([
    { name: "video", maxCount: 1 },
    { name: "pdf", maxCount: 1 }
  ]),
  (req, res) => {
    const courses = readCourses();
    const course = courses.find(c => c.id == req.params.id);

    if (!course) return res.status(404).json({ error: "Cours introuvable" });

    course.title = req.body.title || course.title;
    course.category = req.body.category || course.category;
    course.module = req.body.module || course.module;
    

    if (req.files?.video) {
      course.videoUrl = `/uploads/cours/videos/${req.files.video[0].filename}`;
    }

    if (req.files?.pdf) {
      course.pdfUrl = `/uploads/cours/pdfs/${req.files.pdf[0].filename}`;
    }

    course.updatedAt = new Date().toISOString();

    saveCourses(courses);

    res.json({ ok: true, course });
  }
);

app.post("/api/auth/check-session", (req, res) => {
  const users = readUsers();
  const { userId, deviceId } = req.body;

  const user = users.find(
    item =>
      String(item.id) ===
      String(userId)
  );

  if (!user) {
    return res.status(401).json({
      valid: false,
      error: "Compte introuvable."
    });
  }

  const accountIsAdmin =
    isAdminAccount(user);

  if (
    !accountIsAdmin &&
    user.status !== "approved"
  ) {
    return res.status(403).json({
      valid: false,
      error:
        user.status === "suspended"
          ? "Votre compte est suspendu."
          : "Votre compte n’est pas autorisé."
    });
  }

  if (
    user.activeDeviceId &&
    String(user.activeDeviceId) !==
      String(deviceId || "")
  ) {
    return res.status(403).json({
      valid: false,
      error:
        "Votre session est active sur un autre appareil."
    });
  }

  const before = JSON.stringify({
    trialStatus: user.trialStatus,
    trialExpiredAt: user.trialExpiredAt,
    trialConvertedAt:
      user.trialConvertedAt
  });

  const trialAccess =
    syncFreeTrialStatus(user);

  const after = JSON.stringify({
    trialStatus: user.trialStatus,
    trialExpiredAt: user.trialExpiredAt,
    trialConvertedAt:
      user.trialConvertedAt
  });

  if (before !== after) {
    saveUsers(users);
  }

  return res.json({
    valid: true,

    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      plan: user.plan,
      paymentStatus:
        user.paymentStatus,

      subscriptionEndDate:
        user.subscriptionEndDate ||
        null,

      trialStatus:
        trialAccess.trialStatus,

      trialStartDate:
        trialAccess.trialStartDate,

      trialEndDate:
        trialAccess.trialEndDate,

      trialRemainingMs:
        trialAccess.trialRemainingMs,

      accessMode:
        trialAccess.accessMode,

      hasFullAccess:
        trialAccess.hasFullAccess,

      allowedTrialModules:
        FREE_TRIAL_MODULES,

      deviceId:
        user.activeDeviceId ||
        deviceId ||
        ""
    }
  });
});

const PORT = Number(process.env.PORT) || 3000;

app.use((error, req, res, next) => {
  console.error("SERVER REQUEST ERROR:", error);

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "Le fichier envoyé est trop volumineux."
      });
    }

    return res.status(400).json({
      error: `Erreur upload: ${error.message}`
    });
  }

  if (
    error.message === "Format de photo non autorisé."
  ) {
    return res.status(400).json({
      error: error.message
    });
  }

  res.status(500).json({
    error: "Erreur interne du serveur."
  });
});

refreshExpiredSubscriptions();

setInterval(() => {
  try {
    refreshExpiredSubscriptions();
  } catch (error) {
    console.error(
      "Erreur vérification abonnements:",
      error
    );
  }
}, 60 * 60 * 1000);


/* =========================================================
   PCR — DEMANDE DE SUPPRESSION DE COMPTE
========================================================= */

const accountDeletionFs = fs;
const accountDeletionPath = path;

const accountDeletionDirectory =
  accountDeletionPath.join(
    __dirname,
    "private-data"
  );

const accountDeletionRequestsFile =
  accountDeletionPath.join(
    accountDeletionDirectory,
    "account-deletion-requests.json"
  );

function ensureAccountDeletionStorage() {
  if (
    !accountDeletionFs.existsSync(
      accountDeletionDirectory
    )
  ) {
    accountDeletionFs.mkdirSync(
      accountDeletionDirectory,
      { recursive: true }
    );
  }

  if (
    !accountDeletionFs.existsSync(
      accountDeletionRequestsFile
    )
  ) {
    accountDeletionFs.writeFileSync(
      accountDeletionRequestsFile,
      "[]\n",
      "utf8"
    );
  }
}

function readAccountDeletionRequests() {
  ensureAccountDeletionStorage();

  try {
    const raw =
      accountDeletionFs.readFileSync(
        accountDeletionRequestsFile,
        "utf8"
      );

    const data = JSON.parse(raw || "[]");

    return Array.isArray(data)
      ? data
      : [];

  } catch (error) {
    console.error(
      "Erreur lecture demandes suppression :",
      error
    );

    return [];
  }
}

function saveAccountDeletionRequests(requests) {
  ensureAccountDeletionStorage();

  accountDeletionFs.writeFileSync(
    accountDeletionRequestsFile,
    JSON.stringify(requests, null, 2) + "\n",
    "utf8"
  );
}

app.post(
  "/api/account-deletion/request",
  express.json(),
  (req, res) => {
    try {
      const email = String(
        req.body?.email || ""
      )
        .trim()
        .toLowerCase();

      const userId = String(
        req.body?.userId || ""
      ).trim();

      const reason = String(
        req.body?.reason || ""
      )
        .trim()
        .slice(0, 1000);

      const source = String(
        req.body?.source || "web"
      )
        .trim()
        .slice(0, 30);

      const emailIsValid =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      if (!emailIsValid) {
        return res.status(400).json({
          success: false,
          error:
            "Veuillez saisir une adresse e-mail valide."
        });
      }

      const requests =
        readAccountDeletionRequests();

      const existingRequest =
        requests.find((request) => {
          return (
            String(request.email || "")
              .toLowerCase() === email &&
            String(request.status || "")
              .toLowerCase() === "pending"
          );
        });

      if (existingRequest) {
        return res.status(200).json({
          success: true,
          message:
            "Une demande de suppression est déjà en cours pour ce compte."
        });
      }

      const request = {
        id:
          "delete-" +
          Date.now() +
          "-" +
          Math.random()
            .toString(36)
            .slice(2, 9),

        userId,
        email,
        reason,
        source,

        status: "pending",

        createdAt:
          new Date().toISOString(),

        processedAt: null,
        processedBy: null
      };

      requests.push(request);

      saveAccountDeletionRequests(requests);

      return res.status(201).json({
        success: true,
        message:
          "Votre demande de suppression a été enregistrée."
      });

    } catch (error) {
      console.error(
        "Erreur demande suppression compte :",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          "Une erreur est survenue lors de l’enregistrement de la demande."
      });
    }
  }
);



/* =========================================================
   PCR — TÉLÉCHARGEMENT SUPPORT DANS CAPACITOR
========================================================= */
app.get("/api/native-support-download", (req, res) => {
  try {
    const requestedFile = String(req.query?.file || "").trim();
    if (!requestedFile) {
      return res.status(400).json({ success: false, error: "Le fichier demandé est manquant." });
    }

    const parsedUrl = new URL(requestedFile, "https://pcrdz.com");
    const decodedPath = decodeURIComponent(parsedUrl.pathname);
    if (!decodedPath.startsWith("/pdfs/")) {
      return res.status(403).json({ success: false, error: "Ce fichier n'est pas autorisé." });
    }

    const allowed = new Set([".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx"]);
    const extension = path.extname(decodedPath).toLowerCase();
    if (!allowed.has(extension)) {
      return res.status(403).json({ success: false, error: "Type de fichier non autorisé." });
    }

    const pdfRoot = path.resolve(__dirname, "public", "pdfs");
    const absolutePath = path.resolve(__dirname, "public", "." + decodedPath);
    if (absolutePath !== pdfRoot && !absolutePath.startsWith(pdfRoot + path.sep)) {
      return res.status(403).json({ success: false, error: "Chemin de fichier non autorisé." });
    }

    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      return res.status(404).json({ success: false, error: "Support introuvable." });
    }

    return res.download(absolutePath, path.basename(absolutePath));
  } catch (error) {
    console.error("Erreur téléchargement support natif :", error);
    return res.status(500).json({ success: false, error: "Impossible de télécharger le support." });
  }
});

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`SERVER OK: http://localhost:${PORT}`);
});

server.on("error", error => {
  if (error.code === "EADDRINUSE") {
    console.error(`SERVER ERROR: le port ${PORT} est déjà utilisé.`);
  } else {
    console.error("SERVER ERROR:", error);
  }

  process.exit(1);
});

function shutdown(signal) {
  console.log(`\n${signal} reçu. Arrêt du serveur...`);

  server.close(error => {
    if (error) {
      console.error("Erreur pendant l’arrêt:", error);
      process.exit(1);
    }

    console.log("Serveur arrêté proprement.");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("Arrêt forcé après délai dépassé.");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

server.on("error", (err) => {
  console.error("SERVER ERROR:", err);
});

process.stdin.resume();