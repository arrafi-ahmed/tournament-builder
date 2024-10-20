const router = require("express").Router();
const teamService = require("../service/team");
const ApiResponse = require("../model/ApiResponse");
const { auth, isAdmin, isAdminEventAuthor } = require("../middleware/auth");
const { uploadTeamLogo } = require("../middleware/upload");
const compressImages = require("../middleware/compress");
const { ifSudo, ifManager, ifOrganizer } = require("../others/util");
const tournamentSettingsService = require("../service/tournament-settings");
const tournamentScheduleService = require("../service/tournament-schedule");
const CustomError = require("../model/CustomError");

router.post("/saveField", auth, (req, res, next) => {
  tournamentScheduleService
    .saveField({
      payload: req.body,
    })
    .then((result) => {
      res.status(200).json(new ApiResponse("Field saved!", result));
    })
    .catch((err) => next(err));
});

router.post("/deleteField", auth, (req, res, next) => {
  tournamentScheduleService
    .deleteField({
      payload: req.body,
    })
    .then((result) => {
      res.status(200).json(new ApiResponse("Field deleted!", result));
    })
    .catch((err) => next(err));
});

router.get("/getMatchDays", (req, res, next) => {
  tournamentSettingsService
    .getMatchDays({ tournamentId: req.query.tournamentId })
    .then((results) => res.status(200).json(new ApiResponse(null, results)))
    .catch((err) => next(err));
});

router.get("/getSchedule", (req, res, next) => {
  tournamentScheduleService
    .getSchedule({ tournamentId: req.query.tournamentId })
    .then((results) => res.status(200).json(new ApiResponse(null, results)))
    .catch((err) => next(err));
});

router.post("/deleteMatch", (req, res, next) => {
  tournamentScheduleService
    .deleteMatch({ payload: req.body })
    .then((results) => res.status(200).json(new ApiResponse(null, results)))
    .catch((err) => next(err));
});

module.exports = router;
