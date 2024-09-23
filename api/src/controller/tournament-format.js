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

router.post("/savePhase", auth, (req, res, next) => {
  tournamentFormatService
    .savePhase({
      payload: req.body,
    })
    .then((results) => {
      res.status(200).json(new ApiResponse(null, results));
    })
    .catch((err) => next(err));
});

router.post("/saveGroup", auth, (req, res, next) => {
  tournamentFormatService
    .saveGroup({
      payload: req.body,
    })
    .then((results) => {
      res.status(200).json(new ApiResponse(null, results));
    })
    .catch((err) => next(err));
});

router.post("/saveMatch", auth, (req, res, next) => {
  tournamentFormatService
    .saveMatch({
      payload: req.body,
    })
    .then((results) => {
      res.status(200).json(new ApiResponse(null, results));
    })
    .catch((err) => next(err));
});

router.post("/saveBracket", auth, (req, res, next) => {
  tournamentFormatService
    .saveBracket({
      payload: req.body,
    })
    .then((results) => {
      res.status(200).json(new ApiResponse(null, results));
    })
    .catch((err) => next(err));
});

router.get("/removePhase", auth, (req, res, next) => {
  const organizerId = ifSudo(req.currentUser.role)
    ? req.query.organizerId
    : ifOrganizer(req.currentUser.role)
      ? req.currentUser.id
      : null;

  tournamentFormatService
    .removePhase({
      phaseId: req.query.phaseId,
      tournamentId: req.query.tournamentId,
      isPhaseEmpty: req.query.isPhaseEmpty,
      organizerId,
    })
    .then((results) => {
      res.status(200).json(new ApiResponse(null, results));
    })
    .catch((err) => next(err));
});

router.get("/removeGroup", auth, (req, res, next) => {
  const organizerId = ifSudo(req.currentUser.role)
    ? req.query.organizerId
    : ifOrganizer(req.currentUser.role)
      ? req.currentUser.id
      : null;

  tournamentFormatService
    .removeGroup({
      groupId: req.query.groupId,
      tournamentId: req.query.tournamentId,
      isPhaseItemsEmpty: req.query.isPhaseItemsEmpty,
      organizerId,
    })
    .then((results) => {
      res.status(200).json(new ApiResponse(null, results));
    })
    .catch((err) => next(err));
});

router.get("/removeBracket", auth, (req, res, next) => {
  const organizerId = ifSudo(req.currentUser.role)
    ? req.query.organizerId
    : ifOrganizer(req.currentUser.role)
      ? req.currentUser.id
      : null;

  tournamentFormatService
    .removeBracket({
      bracketId: req.query.bracketId,
      tournamentId: req.query.tournamentId,
      isPhaseItemsEmpty: req.query.isPhaseItemsEmpty,
      organizerId,
    })
    .then((results) => {
      res.status(200).json(new ApiResponse(null, results));
    })
    .catch((err) => next(err));
});

router.get("/removeMatch", auth, (req, res, next) => {
  const organizerId = ifSudo(req.currentUser.role)
    ? req.query.organizerId
    : ifOrganizer(req.currentUser.role)
      ? req.currentUser.id
      : null;

  tournamentFormatService
    .removeMatch({
      matchId: req.query.matchId,
      tournamentId: req.query.tournamentId,
      isPhaseItemsEmpty: req.query.isPhaseItemsEmpty,
      organizerId,
    })
    .then((results) => {
      res.status(200).json(new ApiResponse(null, results));
    })
    .catch((err) => next(err));
});

router.post("/createGroupPhase", auth, (req, res, next) => {
  const organizerId = ifSudo(req.currentUser.role)
    ? req.query.organizerId
    : ifOrganizer(req.currentUser.role)
      ? req.currentUser.id
      : null;

  tournamentFormatService
    .createGroupPhase({
      payload: req.body,
      organizerId,
    })
    .then((results) => {
      res.status(200).json(new ApiResponse(null, results));
    })
    .catch((err) => next(err));
});

router.post("/createGroupKnockoutPhase", auth, (req, res, next) => {
  const organizerId = ifSudo(req.currentUser.role)
    ? req.query.organizerId
    : ifOrganizer(req.currentUser.role)
      ? req.currentUser.id
      : null;

  tournamentFormatService
    .createGroupKnockoutPhase({
      payload: req.body,
      organizerId,
    })
    .then((results) => {
      res.status(200).json(new ApiResponse(null, results));
    })
    .catch((err) => next(err));
});

router.post("/createKnockoutPhase", auth, (req, res, next) => {
  const organizerId = ifSudo(req.currentUser.role)
    ? req.query.organizerId
    : ifOrganizer(req.currentUser.role)
      ? req.currentUser.id
      : null;

  tournamentFormatService
    .createKnockoutPhase({
      payload: req.body,
      organizerId,
    })
    .then((results) => {
      res.status(200).json(new ApiResponse(null, results));
    })
    .catch((err) => next(err));
});

router.post("/saveGroupTeam", auth, (req, res, next) => {
    const organizerId = ifSudo(req.currentUser.role)
        ? req.query.organizerId
        : ifOrganizer(req.currentUser.role)
            ? req.currentUser.id
            : null;

    tournamentFormatService
        .saveGroupTeam({
            payload: req.body,
            organizerId,
        })
        .then((results) => {
            res.status(200).json(new ApiResponse(null, results));
        })
        .catch((err) => next(err));
});

module.exports = router;
