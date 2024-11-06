const router = require("express").Router();
const { raw } = require("express");
const ApiResponse = require("../model/ApiResponse");
const { auth } = require("../middleware/auth");
const subscriptionService = require("../service/subscription");
const CustomError = require("../model/CustomError");

router.get("/payOnce", auth, (req, res, next) => {
  const subscription = req.query && req.query.subscription;
  subscriptionService
    .payOnce({
      subscription,
      userId: req.currentUser.id,
    })
    .then((result) => {
      res.status(200).json(new ApiResponse(null, result));
    })
    .catch((err) => next(err));
});

router.get("/getStripeSubscription", auth, (req, res, next) => {
  const subscriptionId = req.query && req.query.subscriptionId;
  subscriptionService
    .getStripeSubscription({ subscriptionId })
    .then((result) => {
      res.status(200).json(new ApiResponse(null, result));
    })
    .catch((err) => next(err));
});

router.get("/getSubscription", (req, res, next) => {
  const userId = req.query && req.query.userId;
  const tournamentId = req.query && req.query.tournamentId;

  subscriptionService
    .getSubscription({ userId, tournamentId })
    .then((result) => {
      res.status(200).json(new ApiResponse(null, result));
    })
    .catch((err) => next(err));
});

router.get("/fetchPremiumSubscriptionData", auth, (req, res, next) => {
  let userId = (req.query && req.query.userId) || req.currentUser.id;
  const tournamentId = req.query && req.query.tournamentId;

  if (req.currentUser.role !== "admin") {
    //if user role fetching data, verify query->userid == token->userid
    userId = req.currentUser.id;
  }
  subscriptionService
    .fetchPremiumSubscriptionData({ userId, tournamentId })
    .then((result) => {
      res.status(200).json(new ApiResponse(null, result));
    })
    .catch((err) => next(err));
});

router.get("/getSubscriptionPlans", (req, res, next) => {
  subscriptionService
    .getSubscriptionPlans()
    .then((result) => {
      res.status(200).json(new ApiResponse(null, result));
    })
    .catch((err) => next(err));
});

router.get("/saveSubscription", auth, (req, res, next) => {
  const subscription = req.query && req.query.subscription;
  subscriptionService
    .saveSubscriptionUnique({
      subscription,
      userId: req.currentUser.id,
    })
    .then((result) => {
      res.status(200).json(new ApiResponse(null, result));
    })
    .catch((err) => next(err));
});

router.get("/cancelOncePayment", auth, (req, res, next) => {
  const subscription = req.query && req.query.subscription;
  subscriptionService
    .cancelOncePayment({ subscription })
    .then((result) => {
      res.status(200).json(new ApiResponse("Subscription cancelled!", result));
    })
    .catch((err) => next(err));
});

router.get("/cancelSubscription", auth, (req, res, next) => {
  const subscription = req.query && req.query.subscription;
  subscriptionService
    .cancelSubscription({ subscription })
    .then((result) => {
      res.status(200).json(new ApiResponse("Subscription cancelled!", result));
    })
    .catch((err) => next(err));
});

router.get("/deleteSubscription", auth, (req, res, next) => {
  const userId = req.query && req.query.userId;
  subscriptionService
    .deleteSubscription({ userId })
    .then((result) => {
      res.status(200).json(new ApiResponse("Subscription deleted!", result));
    })
    .catch((err) => next(err));
});

router.post("/stripe-response", async (req, res, next) => {
  subscriptionService
    .stripeWebhookResponse(req)
    .then((result) => {
      res.status(200).json(new ApiResponse(result, null));
    })
    .catch((err) => next(err));
});

// router.get("/saveSubscriptionManually", auth, (req, res, next) => {
//   const planId = req.query && req.query.planId;
//   const planTitle = req.query && req.query.planTitle;
//   const userId = req.query && req.query.userId;
//   subscriptionService
//     .saveSubscriptionManually(planId, planTitle, userId)
//     .then((result) => {
//       res.status(200).json(new ApiResponse("Subscription added!", result));
//     })
//    .catch((err) => next(err));
// });

module.exports = router;
