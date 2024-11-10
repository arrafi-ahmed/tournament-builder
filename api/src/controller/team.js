const router = require("express").Router();
const teamService = require("../service/team");
const ApiResponse = require("../model/ApiResponse");
const { auth, isAdmin, isAdminEventAuthor } = require("../middleware/auth");
const { uploadTeamLogo } = require("../middleware/upload");
const compressImages = require("../middleware/compress");
const { ifSudo, ifManager, ifOrganizer } = require("../others/util");
const tournamentService = require("../service/tournament");
const CustomError = require("../model/CustomError");

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

router.post("/saveMember", auth, (req, res, next) => {
  if (ifManager(req.currentUser.role)) {
    req.body.teamId = req.currentUser.teamId;
  }

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

router.get("/getMatchesByTeam", auth, (req, res, next) => {
  const teamId = ifManager(req.currentUser.role)
    ? req.currentUser.teamId
    : req.query.teamId;

  teamService
    .getMatchesByTeam({ teamId })
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
//for organizers
router.get("/getTeamRequestsByOrganizerId", auth, (req, res, next) => {
  const organizerId = ifSudo(req.currentUser.role)
    ? req.query.organizerId
    : ifOrganizer(req.currentUser.role)
      ? req.currentUser.id
      : null;

  teamService
    .getTeamRequestsByOrganizerId({ organizerId })
    .then((results) => res.status(200).json(new ApiResponse(null, results)))
    .catch((err) => next(err));
});

router.get("/getTeamRequestsByTournamentId", auth, (req, res, next) => {
  const tournamentId = req.query.tournamentId;
  const organizerId = ifSudo(req.currentUser.role)
    ? req.query.organizerId
    : ifOrganizer(req.currentUser.role)
      ? req.currentUser.id
      : null;

  teamService
    .getTeamRequestsByTournamentId({ tournamentId, organizerId })
    .then((results) => res.status(200).json(new ApiResponse(null, results)))
    .catch((err) => next(err));
});

router.get("/getTeamWSquad", auth, (req, res, next) => {
  const teamId = ifSudo(req.currentUser.role)
    ? req.query.teamId
    : ifManager(req.currentUser.role)
      ? req.currentUser.teamId
      : null;

  teamService
    .getTeamWSquad({ teamId })
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
      res.status(200).json(new ApiResponse("Team deleted!", results)),
    )
    .catch((err) => next(err));
});

router.get("/removeMember", auth, (req, res, next) => {
  const teamId = ifSudo(req.currentUser.role)
    ? req.query.teamId
    : ifManager(req.currentUser.role)
      ? req.currentUser.teamId
      : null;

  teamService
    .removeMember({
      id: req.query.id,
      teamId,
    })
    .then((results) =>
      res.status(200).json(new ApiResponse("Member deleted!", results)),
    )
    .catch((err) => next(err));
});

router.post("/updateTeamRequest", auth, (req, res, next) => {
  let results = null;
  teamService
    .updateTeamRequest({ payload: req.body })
    .then(async (results1) => {
      results = results1;
      if (req.body.requestStatus == 1) {
        const { teamId, tournamentId } = req.body;
        const [{ email }, { name }] = await Promise.all([
          teamService.getTeamWEmailOptionalById({
            teamId,
          }),
          tournamentService.getTournament({
            tournamentId,
          }),
        ]);
        return teamService.saveTeamsTournaments({
          payload: {
            teamId,
            tournamentId,
          },
          tournamentName: name,
          managerEmail: email,
          sendEmail: true,
        });
      } else
        res.status(200).json(new ApiResponse("Request rejected!", results));
    })
    .then((results2) => {
      res.status(200).json(new ApiResponse("Request approved!", results));
    })
    .catch((err) => next(err));
});

router.get("/searchTeam", (req, res, next) => {
  teamService
    .searchTeam({ searchKeyword: req.query.searchKeyword })
    .then((results) => res.status(200).json(new ApiResponse(null, results)))
    .catch((err) => next(err));
});

module.exports = router;
