const asyncHandler = require("../utils/asyncHandler");
const { searchAll, suggestions } = require("../services/marketplace");

const search = asyncHandler(async (req, res) => {
  const { items, counts, pagination } = await searchAll(req.query);
  res.status(200).json({ success: true, count: items.length, data: items, counts, pagination });
});

const suggest = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: await suggestions(req.query.q) });
});

module.exports = { search, suggest };
