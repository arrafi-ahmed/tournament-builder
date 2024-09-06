const router = require("express").Router();
const tournamentFormatService = require("../service/tournament-format");
const { auth } = require("../middleware/auth");
const ApiResponse = require("../model/ApiResponse");
const { ifSudo, ifOrganizer } = require("../others/util");

router.get("/getTournamentFormat", auth, (req, res, next) => {
  const organizerId = ifSudo(req.currentUser.role)
    ? req.query.organizerId
    : ifOrganizer(req.currentUser.role)
    ? req.currentUser.id
    : null;

  tournamentFormatService
    .getTournamentFormat({
      tournamentId: req.query.tournamentId,
      organizerId,
    })
    .then((results) => {
      res.status(200).json(new ApiResponse(null, results));
    })
    .catch((err) => next(err));
});

router.post("/addPhase", auth, (req, res, next) => {
  const organizerId = ifSudo(req.currentUser.role)
    ? req.query.organizerId
    : ifOrganizer(req.currentUser.role)
    ? req.currentUser.id
    : null;

  tournamentFormatService
    .addPhase({
      payload: req.body,
      organizerId,
    })
    .then((results) => {
      res.status(200).json(new ApiResponse(null, results));
    })
    .catch((err) => next(err));
});

module.exports = router;
