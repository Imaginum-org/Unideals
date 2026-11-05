import * as boostService from "../services/boost.service.js";

export const getMyBoostSummary = async (req, res, next) => {
  try {
    const summary = await boostService.getBoostSummary(req.user);

    return res.status(200).json({
      success: true,
      message: "Boost summary fetched successfully",
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

export const boostProduct = async (req, res, next) => {
  try {
    const result = await boostService.createBoost({
      productId: req.params.productId,
      user: req.user,
    });

    return res.status(201).json({
      success: true,
      message: "Product visibility boosted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
