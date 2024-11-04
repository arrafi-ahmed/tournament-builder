const { sql } = require("../db");
const CustomError = require("../model/CustomError");
const stripe = require("stripe")(process.env.STRIPE_SECRET);

exports.getSubscription = async ({ userId, tournamentId }) => {
  const [subscription] = await sql`
        select *
        from subscription
        where user_id = ${userId}
          and tournament_id = ${tournamentId}`;
  return subscription;
};

exports.getStripeSubscription = async ({ subscriptionId }) => {
  return stripe.subscriptions.retrieve(subscriptionId);
};

exports.fetchPremiumSubscriptionData = async ({ userId, tournamentId }) => {
  const subscription = await exports.getSubscription({ userId, tournamentId });
  // check if no subscription, return null
  if (!subscription) {
    return null;
  }
  // check if basic subscription
  if (subscription && subscription.stripeSubscriptionId === "0") {
    return { subscription };
  }
  const stripeSubscription = await exports.getStripeSubscription({
    subscriptionId: subscription.stripeSubscriptionId,
  });
  return { subscription, stripeSubscription };
};

exports.getSubscriptionPlans = async () => {
  return sql`
        select *
        from subscription_plan
        order by id`;
};

// canceled by user
exports.cancelSubscription = async ({
  subscription: { subscriptionId, stripeSubscriptionId, instantCancel },
}) => {
  console.log(44, subscriptionId, stripeSubscriptionId);
  let canceledSubscription;
  let canceledStripeSubscription;

  if (instantCancel) {
    // Execute both cancellation requests concurrently
    [canceledSubscription] = await sql`
            delete
            from subscription
            where id = ${subscriptionId} RETURNING *`;

    // if premium
    if (stripeSubscriptionId !== "0") {
      canceledStripeSubscription =
        stripe.subscriptions.cancel(stripeSubscriptionId);
    }
  } else {
    // Schedule cancellation at the end of the current period
    canceledStripeSubscription = await stripe.subscriptions.update(
      stripeSubscriptionId,
      {
        cancel_at_period_end: true,
        metadata: {
          instantCancel: false,
        },
      },
    );
  }

  console.log(45, canceledSubscription, canceledStripeSubscription);
  return {
    ...canceledSubscription,
    stripeSubscriptionId:
      canceledStripeSubscription?.id || stripeSubscriptionId,
  };
};

// deleted by admin
exports.deleteSubscription = async ({ userId }) => {
  const subscription = await exports.getSubscription({ userId });
  // if basic plan cancelled, delete the subscription entry from db
  if (subscription.stripeSubscriptionId === "0") {
    const [deletedSubscription] = `
            delete
            from subscription
            where stripe_subscription_id = ${subscription.stripeSubscriptionId}`;
    return deletedSubscription ? "basic_deleted" : null;
  }
  const deletedStripeSubscription = await stripe.subscriptions.cancel(
    subscription.stripeSubscriptionId,
  );
  return deletedStripeSubscription ? "premium_deleted" : null;
};

exports.getPriceId = async ({ planTitle }) => {
  const prices =
    planTitle === "premium"
      ? await stripe.prices.list({
          lookup_keys: ["premium"],
        })
      : null;
  return prices && prices.data && prices.data[0] && prices.data[0].id;
};

exports.saveSubscription = async ({ newSubscription }) => {
  if (!newSubscription.id) delete newSubscription.id;

  const [savedSubscription] = await sql`
        insert into subscription ${sql(newSubscription)} on conflict (id)
        do
        update set ${sql(newSubscription)}
            returning *`;
  return savedSubscription;
};

exports.saveSubscriptionUnique = async ({
  subscription: { planId, planTitle, tournamentId },
  userId,
}) => {
  const existingSubscription = await exports.getSubscription({
    userId,
    tournamentId,
  });
  console.log(22, existingSubscription);
  if (existingSubscription && existingSubscription.pendingCancel === false)
    throw new CustomError("Already have a subscription!", 409);

  const baseReturnUrl = `${process.env.VUE_BASE_URL}/tournament/${tournamentId}/pricing?subscription_success=1`;
  planTitle = planTitle.toLowerCase();
  if (planTitle === "basic") {
    const newSubscription = {
      planId,
      stripeSubscriptionId: 0,
      subscriptionAmount: 0,
      activationDate: new Date(),
      expireDate: new Date(
        new Date().setFullYear(new Date().getFullYear() + 10),
      ),
      active: true,
      pendingCancel: false,
      updatedAt: new Date(),
      userId,
      tournamentId,
    };
    const insertedSubscription = await exports.saveSubscription({
      newSubscription,
    });
    return {
      insertedSubscription,
      url: baseReturnUrl, // to show notif in vue
    };
  }
  let priceId = await exports.getPriceId({
    planTitle: planTitle.toLowerCase(),
  });

  const session = await stripe.checkout.sessions.create({
    billing_address_collection: "auto",
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    // mode: "payment",
    success_url: `${baseReturnUrl}&session_id={CHECKOUT_SESSION_ID}`,
    metadata: {
      planId,
      planTitle,
      userId,
      tournamentId,
    },
  });

  return session;
};

exports.getStripeSubscriptionExpiryDate = async ({ subscriptionId }) => {
  const stripeSubscription = await exports.getStripeSubscription({
    subscriptionId,
  });
  return new Date(stripeSubscription.current_period_end * 1000);
};

exports.stripeWebhookResponse = async (req) => {
  let data;
  let eventType;
  // Check if webhook signing is configured.
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (webhookSecret) {
    // Retrieve the event by verifying the signature using the raw body and secret.
    let event;
    let signature = req.headers["stripe-signature"];

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        webhookSecret,
      );
    } catch (err) {
      throw new CustomError(err.message, 400, err);
    }
    // Extract the object from the event.
    data = event.data;
    eventType = event.type;
  } else {
    // Webhook signing is recommended, but if the secret is not configured in `config.js`,
    // retrieve the event data directly from the request body.
    data = req.body.data;
    eventType = req.body.type;
  }

  let responseMsg = "";
  switch (eventType) {
    // subscription created successfully
    case "checkout.session.completed":
      const checkoutSessionCompleted = data.object;

      // get subscription expire date
      const expireDate = await exports.getStripeSubscriptionExpiryDate({
        subscriptionId: checkoutSessionCompleted.subscription,
      });
      const newSubscription = {
        userId: checkoutSessionCompleted.metadata.userId,
        planId: checkoutSessionCompleted.metadata.planId,
        stripeSubscriptionId: checkoutSessionCompleted.subscription,
        subscriptionAmount: checkoutSessionCompleted.amount_total / 100,
        activationDate: new Date(checkoutSessionCompleted.created * 1000),
        expireDate,
        active: true,
        pendingCancel: false,
        updatedAt: new Date(),
        tournamentId: checkoutSessionCompleted.metadata.tournamentId,
      };

      await exports.saveSubscription({ newSubscription });

      responseMsg = "Subscription activated!";
      break;

    // fired immediately when customer cancel subscription
    case "customer.subscription.updated":
      const customerSubscriptionUpdated = data.object;
      // Then define and call a function to handle the event customer.subscription.deleted
      const instantCancel = customerSubscriptionUpdated.metadata.instantCancel;
      if (instantCancel === "false") {
        await sql`
                    update subscription
                    set pending_cancel = true
                    where stripe_subscription_id = ${customerSubscriptionUpdated.id}`;
      }
      responseMsg = !instantCancel
        ? "Subscription will expire on end of billing period!"
        : "Subscription expired!";
      break;

    // fired at end of period when subscription expired
    case "customer.subscription.deleted":
      const customerSubscriptionDeleted = data.object;
      // Then define and call a function to handle the event customer.subscription.deleted
      await sql`
                delete
                from subscription
                where stripe_subscription_id = ${customerSubscriptionDeleted.id}`;

      responseMsg = "Subscription deleted!";
      break;

    // subscription auto renewal succeeded
    case "invoice.paid":
      const invoicePaid = data.object;
      // Then define and call a function to handle the event invoice.paid
      if (invoicePaid.object === "invoice" && invoicePaid.status === "paid") {
        const subscriptionAmount = invoicePaid.amount_paid / 100;
        const activationDate = new Date(invoicePaid.created);
        const expireDate = await exports.getStripeSubscriptionExpiryDate({
          subscriptionId: invoicePaid.subscription,
        });

        await sql`
                    UPDATE subscription
                    SET subscription_amount = ${subscriptionAmount},
                        activation_date     = ${activationDate},
                        expire_date         = ${expireDate},
                        active              = true,
                        pending_cancel      = false
                    WHERE stripe_subscription_id = ${invoicePaid.subscription}
                      AND tournament_id = ${invoicePaid.metadata.tournamentId}
                `;
        responseMsg = "Subscription paid!";
      }
      break;

    // subscription auto renewal failed
    case "invoice.payment_failed":
      const invoicePaymentFailed = data.object;
      // Then define and call a function to handle the event invoice.payment_failed
      await sql`
                UPDATE subscription
                SET active = false
                WHERE stripe_subscription_id = ${invoicePaymentFailed.subscription}
                  AND tournament_id = ${invoicePaymentFailed.metadata.tournamentId}
            `;
      responseMsg = "Subscription payment failed!";
      break;

    // ... handle other event types
    default:
      console.error(`Unhandled event type ${eventType}`);
  }

  return responseMsg;
};
