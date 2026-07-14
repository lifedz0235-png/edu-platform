import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import multer from "multer";
import { fileURLToPath } from "url";

const app = express();

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

app.use(cors());
app.use(express.json());
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

const communityStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/community");
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname.replace(/\s+/g, "-");
    cb(null, uniqueName);
  }
});

const uploadCommunity = multer({ storage: communityStorage });

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

app.delete("/api/community/posts/:postId", (req, res) => {
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

  const requestUser = getRequestUser(req.body.userId);

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

    // دعم المنشورات القديمة التي لا تحتوي authorId
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

  const enrichedPosts = posts.map(post => {
    const author = getPublicUser(
      post.authorId,
      post.authorName
    );

    const enrichedComments = (post.comments || []).map(
      comment => {
        const commentAuthor = getPublicUser(
          comment.authorId,
          comment.authorName
        );

        return {
          ...comment,

          authorId:
            comment.authorId ||
            commentAuthor.id,

          authorName:
            commentAuthor.name,

          authorRole:
            commentAuthor.role,

          authorPhotoUrl:
            commentAuthor.photoUrl,

          authorUniversity:
            commentAuthor.university,

          authorPromotion:
            commentAuthor.promotion
        };
      }
    );

    return {
      ...post,

      authorId:
        post.authorId ||
        author.id,

      authorName:
        author.name,

      authorRole:
        author.role,

      authorPhotoUrl:
        author.photoUrl,

      authorBio:
        author.bio,

      authorUniversity:
        author.university,

      authorPromotion:
        author.promotion,

      comments: enrichedComments
    };
  });

  res.json(enrichedPosts);
});

app.post("/api/community/posts", uploadCommunity.single("image"), (req, res) => {
  const posts = readCommunityPosts();

  const newPost = {
  id: Date.now(),

  authorId: Number(req.body.authorId),

  authorName: req.body.authorName || "Étudiant PCR",

  authorRole: req.body.authorRole || "student",

  text: req.body.text || "",

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

app.post("/api/community/posts/:id/like", (req, res) => {
  const posts = readCommunityPosts();

  const post = posts.find(
    item => String(item.id) === String(req.params.id)
  );

  if (!post) {
    return res.status(404).json({
      error: "Publication introuvable"
    });
  }

  const userId = req.body.userId;
  const userName = req.body.userName || "Utilisateur PCR";

  if (!userId) {
    return res.status(400).json({
      error: "Utilisateur manquant"
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

app.post("/api/community/posts/:id/comments", (req, res) => {
  const posts = readCommunityPosts();

  const post = posts.find(
    item => String(item.id) === String(req.params.id)
  );

  if (!post) {
    return res.status(404).json({
      error: "Publication introuvable"
    });
  }

  const {
    text,
    authorId,
    authorName,
    authorRole
  } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({
      error: "Commentaire vide"
    });
  }

  if (!authorId) {
    return res.status(400).json({
      error: "Utilisateur manquant"
    });
  }

  if (!Array.isArray(post.comments)) {
    post.comments = [];
  }

  const newComment = {
    id: Date.now(),
    authorId,
    authorName: authorName || "Étudiant PCR",
    authorRole: authorRole || "student",
    text: text.trim(),
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

  

app.post("/api/community/posts/:postId/comments/:commentId/like", (req, res) => {
  const posts = readCommunityPosts();

  const post = posts.find(p => p.id == req.params.postId);
  if (!post) return res.status(404).json({ error: "Post introuvable" });

  const comment = (post.comments || []).find(c => c.id == req.params.commentId);
  if (!comment) return res.status(404).json({ error: "Commentaire introuvable" });

  comment.likes = (comment.likes || 0) + 1;

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


const usersDataPath = path.join(process.cwd(), "public/data/users.json");

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

function checkExpiredPlatinumSubscriptions() {
  const users = readUsers();
  const now = Date.now();
  let changed = false;

  users.forEach(user => {
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

app.post("/api/auth/register", (req, res) => {
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

  const newUser = {
    id: Date.now(),

    name: cleanName,
    email: cleanEmail,
    password: cleanPassword,

    phone: cleanPhone,
university: cleanUniversity,
promotion: cleanPromotion,

    role: "student",

    // الحساب لا يدخل حتى تأكيد الدفع
    status: "pending",

    plan,

    planLabel: isGold
      ? "Pack Gold"
      : "Pack Platinum",

    paymentStatus: "pending",

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
    `Nouvelle demande : ${newUser.name} — ${newUser.planLabel}.`
});

  res.json({
    ok: true,

    message:
      "Pré-inscription envoyée. Votre compte sera activé après confirmation du paiement.",

    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      plan: newUser.plan,
      planLabel: newUser.planLabel,
      paymentStatus:
        newUser.paymentStatus,
      status: newUser.status
    }
  });
});


app.post("/api/auth/login", (req, res) => {
  refreshExpiredSubscriptions();

  const users = readUsers();

  const { email, password, deviceId } = req.body;

  const user = users.find(
    item =>
      String(item.email || "").toLowerCase() ===
        String(email || "").trim().toLowerCase() &&
      item.password === password
  );

  if (!user) {
    return res.status(401).json({
      error: "Email ou mot de passe incorrect."
    });
  }

  if (
    user.plan === "platinum" &&
    user.paymentStatus === "expired"
  ) {
    return res.status(403).json({
      error:
        "Votre abonnement Platinum est expiré. Renouvelez votre paiement de 12 000 DA. Support : 0771 73 92 06."
    });
  }

  if (user.status !== "approved") {
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
    return res.status(403).json({
      error:
        "Ce compte est déjà connecté sur un autre appareil."
    });
  }

  user.activeDeviceId = deviceId;
  user.lastLoginAt = new Date().toISOString();

  saveUsers(users);

  res.json({
    ok: true,

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
      deviceId
    }
  });
});

app.post("/api/auth/logout", (req, res) => {
  const users = readUsers();

  const userId = req.body.userId;
  const email = String(req.body.email || "")
    .trim()
    .toLowerCase();

  const user = users.find(item => {
    const sameId =
      userId !== undefined &&
      userId !== null &&
      userId !== "" &&
      String(item.id) === String(userId);

    const sameEmail =
      email &&
      String(item.email || "")
        .trim()
        .toLowerCase() === email;

    return sameId || sameEmail;
  });

  if (!user) {
    return res.status(404).json({
      error: "Utilisateur introuvable."
    });
  }

  user.activeDeviceId = "";
  user.lastLogoutAt = new Date().toISOString();

  saveUsers(users);

  res.json({
    ok: true,
    message: "Déconnexion réussie."
  });
});

  app.get(
  "/api/profile/:userId",
  (req, res) => {
    try {
      const users = readUsers();

      const user = users.find(
        item => String(item.id) === String(req.params.userId)
      );

      if (!user) {
        return res.status(404).json({
          error: "Utilisateur introuvable."
        });
      }

      const stats = getUserCommunityStats(user.id);

      return res.json({
        id: user.id,
        name: user.name || "",
        email: user.email || "",
        role: user.role || "student",
        status: user.status || "",

        photoUrl: user.photoUrl || "",
        bio: user.bio || "",
        university: user.university || "",
        promotion: user.promotion || "",

        stats: {
          publications: Number(stats.publications) || 0,
          comments: Number(stats.comments) || 0,
          likesReceived: Number(stats.likesReceived) || 0
        }
      });

    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error: "Impossible de charger le profil."
      });
    }
  }
);

app.put(
  "/api/profile/:userId",
  uploadProfile.single("photo"),
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
  res.json(users);
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

app.post("/api/admin/users/:id/reset-password", (req, res) => {
  const users = readUsers();
  const user = users.find(u => u.id == req.params.id);

  if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

  const { password } = req.body;

  if (!password || password.length < 4) {
    return res.status(400).json({ error: "Mot de passe trop court." });
  }

  user.password = password;
  saveUsers(users);

  res.json({ ok: true, user });
});

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
    user,

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

  const user = users.find(u => u.id == userId);

  if (!user) {
    return res.status(401).json({
      valid: false,
      error: "Compte introuvable."
    });
  }

  if (user.status !== "approved") {
    return res.status(403).json({
      valid: false,
      error:
        user.status === "suspended"
          ? "Votre compte est suspendu."
          : "Votre compte n’est pas autorisé."
    });
  }

  if (user.activeDeviceId && user.activeDeviceId !== deviceId) {
    return res.status(403).json({
      valid: false,
      error: "Votre session est active sur un autre appareil."
    });
  }

  res.json({
    valid: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
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