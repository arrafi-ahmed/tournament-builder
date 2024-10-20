const router = require("express").Router();
const teamService = require("../service/team");
const ApiResponse = require("../model/ApiResponse");
const { auth, isAdmin, isAdminEventAuthor } = require("../middleware/auth");
const { uploadTeamLogo } = require("../middleware/upload");
const compressImages = require("../middleware/compress");
const { ifSudo, ifManager, ifOrganizer } = require("../others/util");
const tournamentSettingsService = require("../service/tournament-settings");
const CustomError = require("../model/CustomError");

router.post("/saveMatchDay", auth, (req, res, next) => {
  tournamentSettingsService
    .saveMatchDay({
      payload: req.body,
    })
    .then((result) => {
      res.status(200).json(new ApiResponse("Match Day saved!", result));
    })
    .catch((err) => next(err));
});

router.get("/getMatchDays", (req, res, next) => {
  tournamentSettingsService
    .getMatchDays({ tournamentId: req.query.tournamentId })
    .then((results) => res.status(200).json(new ApiResponse(null, results)))
    .catch((err) => next(err));
});

router.get("/deleteMatchDay", (req, res, next) => {
  tournamentSettingsService
    .deleteMatchDay({ matchDayId: req.query.matchDayId })
    .then((results) =>
      res.status(200).json(new ApiResponse("Match Day deleted!", results)),
    )
    .catch((err) => next(err));
});

module.exports = router;
