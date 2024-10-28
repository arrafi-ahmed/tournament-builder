const router = require("express").Router();
const tournamentStandingService = require("../service/tournament-standing");
const { auth } = require("../middleware/auth");
const ApiResponse = require("../model/ApiResponse");
const { ifSudo, ifOrganizer } = require("../others/util");

router.get("/getTournamentStanding", auth, (req, res, next) => {
  const organizerId = ifSudo(req.currentUser.role)
    ? req.query.organizerId
    : ifOrganizer(req.currentUser.role)
      ? req.currentUser.id
      : null;

  tournamentStandingService
    .getTournamentStanding({
      tournamentId: req.query.tournamentId,
      organizerId,
    })
    .then((results) => {
      res.status(200).json(new ApiResponse(null, results));
    })
    .catch((err) => next(err));
});

module.exports = router;
