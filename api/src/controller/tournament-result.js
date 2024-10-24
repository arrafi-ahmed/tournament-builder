const router = require("express").Router();
const teamService = require("../service/team");
const ApiResponse = require("../model/ApiResponse");
const { auth, isAdmin, isAdminEventAuthor } = require("../middleware/auth");
const { uploadTeamLogo } = require("../middleware/upload");
const compressImages = require("../middleware/compress");
const { ifSudo, ifManager, ifOrganizer } = require("../others/util");
const tournamentSettingsService = require("../service/tournament-settings");
const tournamentResultService = require("../service/tournament-result");
const CustomError = require("../model/CustomError");

router.post("/updateFutureTeamReferenceForSingleMatch", auth, (req, res, next) => {
  tournamentResultService
    .updateFutureTeamReferenceForSingleMatch({
      payload: req.body,
    })
    .then((result) => {
      res.status(200).json(new ApiResponse("Result saved!", result));
    })
    .catch((err) => next(err));
});

router.post("/saveSingleMatchResult", auth, (req, res, next) => {
  tournamentResultService
    .saveSingleMatchResult({
      payload: req.body,
    })
    .then((result) => {
      res.status(200).json(new ApiResponse("Result saved!", result));
    })
    .catch((err) => next(err));
});

router.post("/saveGroupMatchResult", auth, (req, res, next) => {
  tournamentResultService
    .saveGroupMatchResult({
      payload: req.body,
    })
    .then((result) => {
      res.status(200).json(new ApiResponse("Result saved!", result));
    })
    .catch((err) => next(err));
});

router.get("/getResults", (req, res, next) => {
  tournamentResultService
      .getResults({ tournamentId: req.query.tournamentId })
      .then((results) => res.status(200).json(new ApiResponse(null, results)))
      .catch((err) => next(err));
});

router.post("/clearResult", (req, res, next) => {
  tournamentResultService
      .clearResult({ payload: req.body })
      .then((results) => res.status(200).json(new ApiResponse("Result removed!", results)))
      .catch((err) => next(err));
});

module.exports = router;
