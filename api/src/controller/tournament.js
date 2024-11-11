const router = require("express").Router();
const tournamentService = require("../service/tournament");
const ApiResponse = require("../model/ApiResponse");
const { auth } = require("../middleware/auth");
const { ifSudo, ifOrganizer, ifManager } = require("../others/util");
const CustomError = require("../model/CustomError");

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

router.get("/getAllTournaments", auth, (req, res, next) => {
  const organizerId = ifSudo(req.currentUser.role)
    ? req.query.organizerId || "all" // if no param passed, get all tournaments
    : ifOrganizer(req.currentUser.role)
      ? req.currentUser.id
      : null;

  tournamentService
    .getTournamentsByOrganizerId({ organizerId })
    .then((results) => res.status(200).json(new ApiResponse(null, results)))
    .catch((err) => next(err));
});

router.get("/getTournamentsByOrganizerId", auth, (req, res, next) => {
  const organizerId = ifSudo(req.currentUser.role)
    ? req.query.organizerId
    : ifOrganizer(req.currentUser.role)
      ? req.currentUser.id
      : null;

  tournamentService
    .getTournamentsByOrganizerId({ organizerId })
    .then((results) => res.status(200).json(new ApiResponse(null, results)))
    .catch((err) => next(err));
});
//for team managers
router.get("/getJoinRequests", auth, (req, res, next) => {
  const teamId = ifSudo(req.currentUser.role)
    ? req.query.teamId
    : ifManager(req.currentUser.role)
      ? req.currentUser.teamId
      : null;

  tournamentService
    .getJoinRequests({ teamId })
    .then((results) => res.status(200).json(new ApiResponse(null, results)))
    .catch((err) => next(err));
});

router.get("/saveTeamRequest", auth, (req, res, next) => {
  const teamId = ifSudo(req.currentUser.role)
    ? req.query.teamId
    : ifManager(req.currentUser.role)
      ? req.currentUser.teamId
      : null;

  tournamentService
    .saveTeamRequest({ teamId, tournamentId: req.query.tournamentId })
    .then((results) =>
      res.status(200).json(new ApiResponse("Request sent!", results)),
    )
    .catch((err) => next(err));
});

router.get("/removeTeamRequest", auth, (req, res, next) => {
  const teamId = ifSudo(req.currentUser.role)
    ? req.query.teamId
    : ifManager(req.currentUser.role)
      ? req.currentUser.teamId
      : null;

  tournamentService
    .removeTeamRequest({
      teamId,
      requestId: req.query.requestId,
      tournamentId: req.query.tournamentId,
    })
    .then((results) =>
      res.status(200).json(new ApiResponse("Request cancelled!", results)),
    )
    .catch((err) => next(err));
});

router.get("/getTournamentWEmailOptionalById", (req, res, next) => {
  tournamentService
    .getTournamentWEmailOptionalById({ tournamentId: req.query.tournamentId })
    .then((results) => res.status(200).json(new ApiResponse(null, results)))
    .catch((err) => next(err));
});

router.get("/getParticipantsWTournament", (req, res, next) => {
  tournamentService
    .getParticipantsWTournament({
      tournamentId: req.query.tournamentId,
    })
    .then((results) => res.status(200).json(new ApiResponse(null, results)))
    .catch((err) => next(err));
});

router.get("/addParticipant", (req, res, next) => {
  tournamentService
    .addParticipant({
      teamId: req.query.teamId,
      tournamentId: req.query.tournamentId,
      tournamentName: req.query.tournamentName,
      managerEmail: req.query.managerEmail,
    })
    .then((results) =>
      res.status(200).json(new ApiResponse("Participant added!", results)),
    )
    .catch((err) => {
      if (err instanceof CustomError)
        res.status(err.statusCode).json(new ApiResponse(err.message, null));
      else next(err);
    });
});

router.get("/removeParticipant", (req, res, next) => {
  tournamentService
    .removeParticipant({
      id: req.query.id,
      teamId: req.query.teamId,
      tournamentId: req.query.tournamentId,
    })
    .then((results) =>
      res.status(200).json(new ApiResponse("Participant removed!", results[0])),
    )
    .catch((err) => {
      if (err instanceof CustomError)
        res.status(err.statusCode).json(new ApiResponse(err.message, null));
      else next(err);
    });
});

router.get("/getTournament", (req, res, next) => {
  tournamentService
    .getTournament({ tournamentId: req.query.tournamentId })
    .then((results) => res.status(200).json(new ApiResponse(null, results)))
    .catch((err) => next(err));
});

router.get("/searchTournament", (req, res, next) => {
  tournamentService
    .searchTournament({ searchKeyword: req.query.searchKeyword })
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
      res.status(200).json(new ApiResponse("Tournament deleted!", results)),
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
      res.status(200).json(new ApiResponse("Member deleted!", results)),
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
