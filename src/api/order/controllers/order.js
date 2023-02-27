("use strict");
const stripe = require("stripe")(process.env.STRIPE_KEY);
/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async create(ctx) {
    const { products } = ctx.request.body;
    console.log("products", products);

    try {
      const lineItems = await Promise.all(
        products.map(async (product) => {
          const item = await strapi
            .service("api::product.product")
            .findOne(product.id);

          // console.log("Item", item);
          return {
            price_data: {
              currency: "usd",
              product_data: {
                name: item.title,
              },
              unit_amount: item.price * 100,
              quantity: product?.quantity,
            },
          };
        })
      );
      console.log("Line items", lineItems);

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        success_url: process.env.CLIENT_URL_DOMAIN + "/success",
        cancel_url: process.env.CLIENT_URL_DOMAIN + "?success=false",
        line_items: lineItems,
        shipping_address_collection: {
          allowed_countries: ["US", "CA"],
        },
        payment_method_types: ["card"],
      });

      // console.log("session", session);

      await strapi.service("api::order.order").create({
        data: {
          products,
          stripeId: session.id,
        },
      });

      return { stripeSession: session };
    } catch (err) {
      //   ctx.response.status = 500;
      return { err };
    }
  },
}));
