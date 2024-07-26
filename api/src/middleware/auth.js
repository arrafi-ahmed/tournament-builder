const jwt = require("jsonwebtoken");
// const { getEventByEventIdnClubId } = require("../service/team");

const auth = (req, res, next) => {
  const token = req.header("authorization");
  if (!token) return res.status(401).json({ message: "Access denied" });
  try {
    const { currentUser } = jwt.verify(token, process.env.TOKEN_SECRET);
    req.currentUser = currentUser;
    next();
  } catch (error) {
    return res.status(400).json({ message: "Invalid token" });
  }
};

const isSudo = (req, res, next) => {
  const currentUser = req.currentUser;
  if (!currentUser) res.status(400).json({ message: "Invalid request" });
  try {
    if (currentUser.role.toLowerCase() === "sudo") next();
  } catch (error) {
    return res.status(400).json({ message: "Invalid request" });
  }
};

const isOrganizer = (req, res, next) => {
  const currentUser = req.currentUser;
  if (!currentUser) res.status(400).json({ message: "Invalid request" });
  try {
    if (currentUser.role.toLowerCase() === "organizer") next();
  } catch (error) {
    return res.status(400).json({ message: "Invalid request" });
  }
};

const isManager = (req, res, next) => {
  const currentUser = req.currentUser;
  if (!currentUser) res.status(400).json({ message: "Invalid request" });
  try {
    if (currentUser.role.toLowerCase() === "team_manager") next();
  } catch (error) {
    return res.status(400).json({ message: "Invalid request" });
  }
};

// const isAdminEventAuthor = async (req, res, next) => {
//   const currentUser = req.currentUser;
//   if (!currentUser) res.status(400).json({ message: "Invalid request" });
//   if (currentUser.role === "sudo") return true;
//
//   const eventId =
//       req.query?.eventId || req.body?.eventId || req.body?.payload?.eventId;
//
//   const clubId = currentUser.clubId;
//   try {
//     const [event] = await getEventByEventIdnClubId({ eventId, clubId });
//     if (!event || !event.id)
//       return res.status(401).json({ message: "Access denied" });
//
//     next();
//   } catch (error) {
//     return res.status(400).json({ message: "Invalid request" });
//   }
// };
//
// const isAdminClubAuthor = async (req, res, next) => {
//   const currentUser = req.currentUser;
//   if (!currentUser) res.status(400).json({ message: "Invalid request" });
//   if (currentUser.role === "sudo") return true;
//
//   const inputClubId =
//       req.query?.clubId || req.body?.clubId || req.body?.payload?.clubId;
//
//   const clubId = currentUser.clubId;
//   try {
//     if (inputClubId != clubId)
//       return res.status(401).json({ message: "Access denied" });
//
//     next();
//   } catch (error) {
//     return res.status(400).json({ message: "Invalid request" });
//   }
// };

module.exports = {
  auth,
  isSudo,
  isOrganizer,
  isManager,
  // isAdminEventAuthor,
  // isAdminClubAuthor,
};
