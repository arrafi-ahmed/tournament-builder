const router = require("express").Router();
const teamService = require("../service/team");
const ApiResponse = require("../model/ApiResponse");
const { auth, isAdmin, isAdminEventAuthor } = require("../middleware/auth");
const { uploadTeamLogo } = require("../middleware/upload");
const compressImages = require("../middleware/compress");
const { ifSudo } = require("../others/util");

router.post("/save", uploadTeamLogo, compressImages, (req, res, next) => {
  teamService
    .save({
      payload: req.body,
      files: req.files,
    })
    .then((result) => {
      res.status(200).json(new ApiResponse("Team saved!", result));
    })
    .catch((err) => next(err));
});

router.post("/saveMember", (req, res, next) => {
  teamService
    .saveMember({
      payload: req.body,
    })
    .then((result) => {
      res.status(200).json(new ApiResponse("Member saved!", result));
    })
    .catch((err) => next(err));
});

router.get("/getAllTeams", (req, res, next) => {
  teamService
    .getAllTeams({ organizerId: req.query.organizerId })
    .then((results) => res.status(200).json(new ApiResponse(null, results)))
    .catch((err) => next(err));
});

router.get("/getAllTeamsWEmail", (req, res, next) => {
  teamService
    .getAllTeamsWEmail()
    .then((results) => res.status(200).json(new ApiResponse(null, results)))
    .catch((err) => next(err));
});

router.get("/getTeamWEmailOptionalById", (req, res, next) => {
  teamService
    .getTeamWEmailOptionalById({ teamId: req.query.teamId })
    .then((results) => res.status(200).json(new ApiResponse(null, results)))
    .catch((err) => next(err));
});

router.get("/getTeamWSquad", (req, res, next) => {
  teamService
    .getTeamWSquad({ teamId: req.query.teamId })
    .then((results) => res.status(200).json(new ApiResponse(null, results)))
    .catch((err) => next(err));
});

router.get("/removeTeam", auth, (req, res, next) => {
  // const isRoleSudo = ifSudo(req.currentUser.role);
  teamService
    .removeTeam({
      teamId: req.query.teamId,
    })
    .then((results) =>
      res.status(200).json(new ApiResponse("Team deleted!", results))
    )
    .catch((err) => next(err));
});

router.get("/removeMember", auth, (req, res, next) => {
  // const isRoleSudo = ifSudo(req.currentUser.role);
  teamService
    .removeMember({
      id: req.query.id,
      teamId: req.query.teamId,
    })
    .then((results) =>
      res.status(200).json(new ApiResponse("Member deleted!", results))
    )
    .catch((err) => next(err));
});
//
// router.get("/getEventByEventIdnClubId", auth, (req, res, next) => {
//   const isRoleSudo = ifSudo(req.currentUser.role);
//   eventService
//     .getEventByEventIdnClubId({
//       clubId: isRoleSudo ? req.query.clubId : req.currentUser.clubId,
//       eventId: req.query.eventId,
//     })
//     .then((results) => res.status(200).json(new ApiResponse(null, results[0])))
//     .catch((err) => next(err));
// });
//

//
// router.get("/getAllActiveEvents", (req, res, next) => {
//   eventService
//     .getAllActiveEvents({
//       clubId: req.query.clubId,
//       currentDate: req.query.currentDate,
//     })
//     .then((results) => res.status(200).json(new ApiResponse(null, results)))
//     .catch((err) => next(err));
// });

module.exports = router;
