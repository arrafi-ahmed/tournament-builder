const router = require("express").Router();
const tournamentStandingService = require("../service/tournament-standing");
const { auth } = require("../middleware/auth");
const ApiResponse = require("../model/ApiResponse");
const { ifSudo, ifOrganizer } = require("../others/util");

router.get("/getTournamentStanding", (req, res, next) => {
  tournamentStandingService
    .getTournamentStanding({
      tournamentId: req.query.tournamentId,
    })
    .then((results) => {
      res.status(200).json(new ApiResponse(null, results));
    })
    .catch((err) => next(err));
});

module.exports = router;
