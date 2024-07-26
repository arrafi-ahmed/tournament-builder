const router = require("express").Router();
const tournamentService = require("../service/tournament");
const ApiResponse = require("../model/ApiResponse");
const { auth, isAdmin, isAdminEventAuthor } = require("../middleware/auth");
const { uploadTournamentLogo } = require("../middleware/upload");
const compressImages = require("../middleware/compress");
const { ifSudo, ifOrganizer } = require("../others/util");

router.post("/save", auth, (req, res, next) => {
  tournamentService
    .save({
      payload: req.body,
      currentUser: req.currentUser,
    })
    .then((result) => {
      res.status(200).json(new ApiResponse("Tournament saved!", result));
    })
    .catch((err) => next(err));
});

router.post("/saveMember", (req, res, next) => {
  tournamentService
    .saveMember({
      payload: req.body,
    })
    .then((result) => {
      res.status(200).json(new ApiResponse("Member saved!", result));
    })
    .catch((err) => next(err));
});

router.get("/getAllTournaments", auth, (req, res, next) => {
    const organizerId = ifSudo(req.currentUser.role)
    ? req.query.organizerId
    : ifOrganizer(req.currentUser.role)
    ? req.currentUser.id
    : null;

  tournamentService
    .getAllTournaments({ organizerId })
    .then((results) => res.status(200).json(new ApiResponse(null, results)))
    .catch((err) => next(err));
});

router.get("/getAllTournamentsByOrganizerId", auth, (req, res, next) => {
  const organizerId = ifSudo(req.currentUser.role)
    ? req.query.organizerId
    : ifOrganizer(req.currentUser.role)
    ? req.currentUser.id
    : null;
  tournamentService
    .getAllTournamentsByOrganizerId({ organizerId })
    .then((results) => res.status(200).json(new ApiResponse(null, results)))
    .catch((err) => next(err));
});

router.get("/getTournamentWEmailOptionalById", (req, res, next) => {
  tournamentService
    .getTournamentWEmailOptionalById({ tournamentId: req.query.tournamentId })
    .then((results) => res.status(200).json(new ApiResponse(null, results)))
    .catch((err) => next(err));
});

router.get("/getTournament", (req, res, next) => {
  tournamentService
    .getTournament({ tournamentId: req.query.tournamentId })
    .then((results) => res.status(200).json(new ApiResponse(null, results)))
    .catch((err) => next(err));
});

router.get("/removeTournament", auth, (req, res, next) => {
  // const isRoleSudo = ifSudo(req.currentUser.role);
  tournamentService
    .removeTournament({
      tournamentId: req.query.tournamentId,
    })
    .then((results) =>
      res.status(200).json(new ApiResponse("Tournament deleted!", results))
    )
    .catch((err) => next(err));
});

router.get("/removeMember", auth, (req, res, next) => {
  // const isRoleSudo = ifSudo(req.currentUser.role);
  tournamentService
    .removeMember({
      id: req.query.id,
      tournamentId: req.query.tournamentId,
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
