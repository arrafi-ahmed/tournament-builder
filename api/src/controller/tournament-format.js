const router = require("express").Router();
const tournamentFormatService = require("../service/tournament-format");
const { auth } = require("../middleware/auth");
const ApiResponse = require("../model/ApiResponse");

router.get("/getTournamentFormat", auth, (req, res, next) => {
  tournamentFormatService
    .getTournamentFormat({
      tournamentId: req.query.tournamentId,
    })
    .then((results) => {
      res.status(200).json(new ApiResponse(null, results));
    })
    .catch((err) => next(err));
});

module.exports = router;